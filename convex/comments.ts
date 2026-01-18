import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all comments for a message
export const listByMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .order("asc")
      .collect();

    // Get replies for each comment
    return Promise.all(
      comments.map(async (comment) => {
        const replies = await ctx.db
          .query("commentReplies")
          .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
          .order("asc")
          .collect();
        return { ...comment, replies };
      })
    );
  },
});

// Get all comments for a chat (across all messages)
export const listByChat = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    const allComments = await Promise.all(
      messages.map(async (message) => {
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        return Promise.all(
          comments.map(async (comment) => {
            const replies = await ctx.db
              .query("commentReplies")
              .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
              .collect();
            return { ...comment, replies, messageRole: message.role };
          })
        );
      })
    );

    return allComments.flat();
  },
});

// Create a new comment on a selection
export const create = mutation({
  args: {
    messageId: v.id("messages"),
    selectionStart: v.number(),
    selectionEnd: v.number(),
    selectedText: v.string(),
    content: v.string(),
    author: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("comments", {
      messageId: args.messageId,
      selectionStart: args.selectionStart,
      selectionEnd: args.selectionEnd,
      selectedText: args.selectedText,
      content: args.content,
      author: args.author,
      createdAt: now,
      updatedAt: now,
      resolved: false,
    });
  },
});

// Add a reply to a comment
export const addReply = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
    author: v.string(),
  },
  handler: async (ctx, args) => {
    // Update parent comment's updatedAt
    await ctx.db.patch(args.commentId, {
      updatedAt: Date.now(),
    });

    return ctx.db.insert("commentReplies", {
      commentId: args.commentId,
      content: args.content,
      author: args.author,
      createdAt: Date.now(),
    });
  },
});

// Resolve/unresolve a comment
export const toggleResolved = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    await ctx.db.patch(args.commentId, {
      resolved: !comment.resolved,
      updatedAt: Date.now(),
    });
  },
});

// Delete a comment and its replies
export const remove = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    // Delete all replies first
    const replies = await ctx.db
      .query("commentReplies")
      .withIndex("by_comment", (q) => q.eq("commentId", args.commentId))
      .collect();

    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    // Delete the comment
    await ctx.db.delete(args.commentId);
  },
});

// Update comment content
export const update = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.commentId, {
      content: args.content,
      updatedAt: Date.now(),
    });
  },
});
