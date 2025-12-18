import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, embed } from "ai";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";


const openai = createOpenAI({
  apiKey: process.env.OPENAI_KEY || process.env.OPENAI_API_KEY,
});

// Get all messages for a chat
export const list = query({
  args: { chatId: v.id("chats"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .paginate(args.paginationOpts);
  },
});

// Add a message to a chat
export const add = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      type: v.string(),
      url: v.string(),
    }))),
    editVersion: v.optional(v.number()),
    skipEmbedding: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
      attachments: args.attachments,
      editVersion: args.editVersion,
    });

    // Update chat's updatedAt
    await ctx.db.patch(args.chatId, {
      updatedAt: Date.now(),
    });

    // Schedule embedding generation in background (skip for streaming messages)
    if (!args.skipEmbedding && args.content.trim().length > 10) {
      await ctx.scheduler.runAfter(0, internal.messages.generateEmbeddingInternal, {
        messageId,
        content: args.content,
      });
    }

    return messageId;
  },
});

// Delete a message
export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
});

// Clear all messages from a chat
export const clearChat = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
  },
});

// Generate title action
export const generateTitle = action({
  args: {
    message: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const { text } = await generateText({
      model: openai("gpt-5-mini"),
      system: "Generate a very short title (3-6 words) for this chat based on the user's message. No quotes, no punctuation at the end.",
      prompt: args.message,
    });
    return text.trim();
  },
});

// Search messages across all chats by keyword
export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      return [];
    }

    const results = await ctx.db
      .query("messages")
      .withSearchIndex("search_content", (q) => q.search("content", args.query))
      .take(args.limit || 20);

    // Get chat info for each message
    const messagesWithChat = await Promise.all(
      results.map(async (message) => {
        const chat = await ctx.db.get(message.chatId);
        return {
          ...message,
          chatTitle: chat?.title || "Untitled",
        };
      })
    );

    return messagesWithChat;
  },
});

// Search messages within a specific chat
export const searchInChat = query({
  args: {
    chatId: v.id("chats"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      return [];
    }

    return await ctx.db
      .query("messages")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("chatId", args.chatId)
      )
      .take(args.limit || 20);
  },
});

// Generate embedding for a message (action)
export const generateEmbedding = action({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: args.content,
    });

    // Store the embedding
    await ctx.runMutation(internal.messages.storeEmbedding, {
      messageId: args.messageId,
      embedding,
    });

    return embedding;
  },
});

// Internal mutation to store embedding
export const storeEmbedding = internalMutation({
  args: {
    messageId: v.id("messages"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      embedding: args.embedding,
    });
  },
});

// Internal action for background embedding generation
export const generateEmbeddingInternal = internalAction({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: args.content,
      });

      await ctx.runMutation(internal.messages.storeEmbedding, {
        messageId: args.messageId,
        embedding,
      });
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      // Don't throw - embedding is optional enhancement
    }
  },
});

// RAG search - semantic search using embeddings
export const ragSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    chatId: v.optional(v.id("chats")),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: string;
    chatId: string;
    role: string;
    content: string;
    createdAt: number;
    chatTitle: string;
    score: number;
  }>> => {
    if (!args.query.trim()) {
      return [];
    }

    // Generate embedding for the search query
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: args.query,
    });

    // Search using vector index
    const chatId = args.chatId;
    const results = await ctx.vectorSearch("messages", "by_embedding", {
      vector: embedding,
      limit: args.limit || 10,
      ...(chatId ? { filter: (q) => q.eq("chatId", chatId) } : {}),
    });

    // Get full message data with chat info
    const messagesWithChat: Array<{
      _id: string;
      chatId: string;
      role: string;
      content: string;
      createdAt: number;
      chatTitle: string;
      score: number;
    } | null> = await Promise.all(
      results.map(async (result) => {
        const message = await ctx.runQuery(internal.messages.getMessageWithChat, {
          messageId: result._id,
        });
        if (!message) return null;
        return {
          _id: message._id,
          chatId: message.chatId,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
          chatTitle: message.chatTitle,
          score: result._score,
        };
      })
    );

    return messagesWithChat.filter((m): m is NonNullable<typeof m> => m !== null);
  },
});

// Internal query to get message with chat info
export const getMessageWithChat = internalQuery({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const chat = await ctx.db.get(message.chatId);
    return {
      ...message,
      chatTitle: chat?.title || "Untitled",
    };
  },
});
