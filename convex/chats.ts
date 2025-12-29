import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { authComponent } from "./auth";

// Get all chats for the current user ordered by updatedAt
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);

    return chats;
  },
});


export const get = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) return null;

    return chat;
  },
});

// Create a new chat
export const create = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const chatId = await ctx.db.insert("chats", {
      title: args.title || "New chat",
      createdAt: now,
      updatedAt: now,
      userId: user._id,
    });
    return chatId;
  },
});

// Update chat title
export const updateTitle = mutation({
  args: {
    chatId: v.id("chats"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }
    if (chat.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.chatId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

// Delete a chat and its messages
export const remove = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }
    if (chat.userId !== user._id) {
      throw new Error("Not authorized");
    }

    // Delete all messages first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the chat
    await ctx.db.delete(args.chatId);
  },
});

// Fork a chat from a specific message
export const fork = mutation({
  args: {
    chatId: v.id("chats"),
    messageIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const sourceChat = await ctx.db.get(args.chatId);
    if (!sourceChat) throw new Error("Chat not found");

    if (sourceChat.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();

    const now = Date.now();

    // Create new forked chat
    const newChatId = await ctx.db.insert("chats", {
      title: `Fork: ${sourceChat.title}`,
      createdAt: now,
      updatedAt: now,
      userId: user._id,
      parentId: args.chatId,
      forkMessageIndex: args.messageIndex,
    });

    // Copy messages up to the fork point
    const messagesToCopy = messages.slice(0, args.messageIndex + 1);
    for (const msg of messagesToCopy) {
      await ctx.db.insert("messages", {
        chatId: newChatId,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      });
    }

    // Update fork count on source chat
    await ctx.db.patch(args.chatId, {
      forkCount: (sourceChat.forkCount || 0) + 1,
    });

    return newChatId;
  },
});
