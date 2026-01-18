import { ConvexError, v } from "convex/values";
import { mutation, query, httpAction, internalMutation, internalQuery } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import {
  createStream as createPersistentStream, getStreamBody as getPersistentStreamBody,
  stream as persistentStream, type StreamId
} from "./utils";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_KEY
});
if (!openai) {
  throw new ConvexError("Missing OPENAI_KEY");
}



// Create a new stream and assistant message
export const createStream = mutation({
  args: {
    chatId: v.id("chats"),
    model: v.optional(v.string()),
    reasoningEffort: v.optional(v.union(v.literal("auto"), v.literal("deepthink"))),
    webSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Create stream using the component
    const streamId = await createPersistentStream(ctx);

    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streamId,
    });

    await ctx.db.insert("streamMetadata", {
      streamId,
      chatId: args.chatId,
      messageId,
      model: args.model || "gpt-5.2",
      reasoningEffort: args.reasoningEffort,
      webSearch: args.webSearch,
    });

    await ctx.db.patch(args.chatId, {
      updatedAt: Date.now(),
    });

    return { streamId, messageId };
  },
});

// Internal query to get stream metadata
export const getStreamMetadata = internalQuery({
  args: { streamId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("streamMetadata")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .first();
  },
});

// Internal query to get messages for a chat
export const getChatMessages = internalQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

// Get stream body for a single stream (uses component)
export const getStreamBody = query({
  args: { streamId: v.string() },
  handler: async (ctx, args) => {
    return await getPersistentStreamBody(ctx, args.streamId as StreamId);
  },
});

// Internal mutation to update message content from stream
export const updateMessageContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { content: args.content });
  },
});

// Internal mutation to delete stream metadata after completion
export const deleteStreamMetadata = internalMutation({
  args: { streamId: v.string() },
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query("streamMetadata")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .first();
    if (metadata) {
      await ctx.db.delete(metadata._id);
    }
  },
});

// Cancel/stop an active stream
export const cancelStream = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    // Find active stream metadata for this chat
    const metadata = await ctx.db
      .query("streamMetadata")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .first();

    if (!metadata) {
      return { cancelled: false, reason: "No active stream" };
    }

    // Get current stream content from component
    const streamBody = await getPersistentStreamBody(ctx, metadata.streamId as StreamId);
    const currentText = streamBody.text || "";

    // Mark stream as error (component handles the status update)
    await ctx.runMutation(components.streaming.lib.setStreamStatus, {
      streamId: metadata.streamId,
      status: "error",
    });

    // Update message with current content (even if partial)
    await ctx.db.patch(metadata.messageId, {
      content: currentText + "\n\n*[Generation stopped]*",
    });

    // Delete stream metadata
    await ctx.db.delete(metadata._id);

    return { cancelled: true, streamId: metadata.streamId };
  },
});

// HTTP action for streaming chat responses
export const streamChat = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const body = await request.json();
    const streamId: string = body.streamId;

    if (!streamId) {
      return new Response(
        JSON.stringify({ error: "Missing streamId" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const metadata = await ctx.runQuery(internal.chatThread.getStreamMetadata, { streamId });

    if (!metadata) {
      return new Response(
        JSON.stringify({ error: "Stream metadata not found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const dbMessages = await ctx.runQuery(internal.chatThread.getChatMessages, { chatId: metadata.chatId });

    const messages: UIMessage[] = dbMessages
      .filter(m => m._id !== metadata.messageId)
      .map(m => ({
        id: m._id,
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.content }],
      }));

    const model = metadata.model;
    // Only set reasoningEffort for "deepthink" - "auto" means don't set it
    const isDeepthink = metadata.reasoningEffort === "deepthink";
    const reasoningEffort = isDeepthink ? "high" : undefined;
    const useWebSearch = metadata.webSearch === true;

    const generateAIResponse = async (
      _ctx: typeof ctx,
      _request: typeof request,
      _streamId: string,
      chunkAppender: (text: string) => Promise<void>
    ) => {
      let fullTextWithReasoning = "";
      let wasCancelled = false;

      try {
        const result = streamText({
          model: openai(model),
          system:
            `You are a helpful AI assistant. Be concise and helpful.
             Current model id: ${model}.
             Use markdown formatting when appropriate.${useWebSearch ?
              " You have access to a web search tool - use it to find current, up-to-date information when the user asks about recent events, news, or anything that may have changed since your knowledge cutoff." : ""}`,
          messages: convertToModelMessages(messages),
          ...(useWebSearch && {
            tools: {
              web_search: openai.tools.webSearch({}),
            },
            maxSteps: 3,
          }),
          providerOptions: {
            openai: {
              ...(reasoningEffort && { reasoningEffort }),
              ...(isDeepthink && { reasoningSummary: "detailed" }),
            },
          },
        });

        let reasoningStartTime = 0;
        let thinkingSessionCount = 0;
        let totalThinkingTime = 0;
        const thinkingSessions: { id: number; duration: number; content: string }[] = [];
        let currentSessionContent = "";

        for await (const part of result.fullStream) {
          // Check if stream was cancelled (metadata deleted)
          const stillActive = await ctx.runQuery(internal.chatThread.getStreamMetadata, { streamId: _streamId });
          if (!stillActive) {
            console.log("[streamChat] Stream cancelled, stopping generation");
            wasCancelled = true;
            break;
          }

          if (part.type === "reasoning-start") {
            // Start new thinking session
            reasoningStartTime = Date.now();
            thinkingSessionCount++;
            currentSessionContent = "";
            // Output marker for thinking session start
            const marker = `<!--THINKING_START:${thinkingSessionCount}:${reasoningStartTime}-->`;
            fullTextWithReasoning += marker;
            await chunkAppender(marker);
          } else if (part.type === "reasoning-delta") {
            // Stream reasoning tokens
            const delta = (part as { delta?: string; text?: string }).delta ?? (part as { delta?: string; text?: string }).text ?? "";
            currentSessionContent += delta;
            fullTextWithReasoning += delta;
            await chunkAppender(delta);
          } else if (part.type === "reasoning-end") {
            // End thinking session with duration
            const duration = Math.round((Date.now() - reasoningStartTime) / 1000);
            totalThinkingTime += duration;
            thinkingSessions.push({
              id: thinkingSessionCount,
              duration,
              content: currentSessionContent,
            });
            // Output marker for thinking session end
            const marker = `<!--THINKING_END:${thinkingSessionCount}:${duration}:${totalThinkingTime}-->`;
            fullTextWithReasoning += marker;
            await chunkAppender(marker);
          } else if (part.type === "text-delta") {
            fullTextWithReasoning += part.text;
            await chunkAppender(part.text);
          }
        }
      } catch (error) {
        console.error("[streamChat] AI generation failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorText = `[Error: ${errorMessage}]`;
        fullTextWithReasoning = fullTextWithReasoning || errorText;
        await chunkAppender(errorText);
      }

      // Only update message if not cancelled (cancel already saved the partial content)
      if (!wasCancelled) {
        await ctx.runMutation(internal.chatThread.updateMessageContent, {
          messageId: metadata.messageId,
          content: fullTextWithReasoning,
        });

        // Generate embedding for assistant message in background
        if (fullTextWithReasoning.trim().length > 10) {
          await ctx.scheduler.runAfter(0, internal.messages.generateEmbeddingInternal, {
            messageId: metadata.messageId,
            content: fullTextWithReasoning,
          });
        }

        await ctx.runMutation(internal.chatThread.deleteStreamMetadata, {
          streamId: _streamId,
        });
      }
    };

    // Use persistentTextStreaming.stream() which handles timeout and database persistence
    const response = await persistentStream(
      ctx,
      request,
      streamId as StreamId,
      generateAIResponse
    );

    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Vary", "Origin");

    return response;
  } catch (error) {
    console.error("[streamChat] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to stream chat response" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
