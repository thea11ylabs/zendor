import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chats: defineTable({
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    parentId: v.optional(v.id("chats")),
    forkMessageIndex: v.optional(v.number()),
    forkCount: v.optional(v.number()),
  }).index("by_updated", ["updatedAt"]),

  messages: defineTable({
    chatId: v.id("chats"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
    streamId: v.optional(v.string()), // For persistent text streaming
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      type: v.string(),
      url: v.string(),
    }))),
    editVersion: v.optional(v.number()), // Track edit count (e.g., 3/3 means 3rd edit)
    embedding: v.optional(v.array(v.float64())), // For RAG search
  })
    .index("by_chat", ["chatId", "createdAt"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["chatId"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["chatId"],
    }),

  // Stream metadata for looking up chat context from HTTP actions
  streamMetadata: defineTable({
    streamId: v.string(),
    chatId: v.id("chats"),
    messageId: v.id("messages"),
    model: v.string(),
    reasoningEffort: v.optional(v.union(v.literal("auto"), v.literal("deepthink"))),
    webSearch: v.optional(v.boolean()),
  }).index("by_stream", ["streamId"])
    .index("by_chat_id", ["chatId"]),

  // Comments on message selections (Google Docs style)
  comments: defineTable({
    messageId: v.id("messages"),
    selectionStart: v.number(),
    selectionEnd: v.number(),
    selectedText: v.string(),
    content: v.string(),
    author: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolved: v.boolean(),
  })
    .index("by_message", ["messageId", "createdAt"])
    .index("by_message_unresolved", ["messageId", "resolved"]),

  // Replies to comments (thread)
  commentReplies: defineTable({
    commentId: v.id("comments"),
    content: v.string(),
    author: v.string(),
    createdAt: v.number(),
  }).index("by_comment", ["commentId", "createdAt"]),

  // Canvas documents (code/text editor)
  canvasDocuments: defineTable({
    chatId: v.optional(v.id("chats")),
    title: v.string(),
    content: v.string(),
    language: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_chat", ["chatId", "updatedAt"])
    .index("by_updated", ["updatedAt"]),

  // Canvas comments (inline and general)
  canvasComments: defineTable({
    canvasDocumentId: v.id("canvasDocuments"),
    type: v.union(v.literal("inline"), v.literal("general")),
    selectionStart: v.optional(v.number()),
    selectionEnd: v.optional(v.number()),
    selectedText: v.optional(v.string()),
    content: v.string(),
    author: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolved: v.boolean(),
    status: v.optional(v.union(v.literal("pending"), v.literal("reviewing"))),
  })
    .index("by_canvas", ["canvasDocumentId", "createdAt"])
    .index("by_canvas_unresolved", ["canvasDocumentId", "resolved"]),

  // Canvas comment replies
  canvasCommentReplies: defineTable({
    commentId: v.id("canvasComments"),
    content: v.string(),
    author: v.string(),
    isAI: v.boolean(),
    createdAt: v.number(),
  }).index("by_comment", ["commentId", "createdAt"]),
});
