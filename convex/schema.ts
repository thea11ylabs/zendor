import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chats: defineTable({
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    userId: v.string(), // Owner of the chat
    parentId: v.optional(v.id("chats")),
    forkMessageIndex: v.optional(v.number()),
    forkCount: v.optional(v.number()),
  })
    .index("by_updated", ["updatedAt"])
    .index("by_user", ["userId", "updatedAt"]),

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
      size: v.optional(v.number()),
      storageId: v.optional(v.id("_storage")),
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

  // Documents with CRDT support
  documents: defineTable({
    title: v.string(),
    userId: v.string(), // Owner
    content: v.string(), // Markdown content
    yDoc: v.optional(v.bytes()), // Yjs document state
    version: v.number(), // Document version for optimistic updates
    isPublic: v.optional(v.boolean()), // Whether document is publicly accessible
    shareToken: v.optional(v.string()), // Unique token for sharing
    sharePermission: v.optional(v.union(v.literal("view"), v.literal("edit"))), // Permission level for shared link
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId", "updatedAt"])
    .index("by_updated", ["updatedAt"])
    .index("by_share_token", ["shareToken"]),

  // Real-time presence for collaborative editing
  presence: defineTable({
    documentId: v.id("documents"),
    userId: v.optional(v.string()), // Optional for anonymous users
    userName: v.string(),
    userColor: v.string(), // Hex color for cursor/selection
    lastSeenAt: v.number(),
  })
    .index("by_document", ["documentId", "lastSeenAt"])
    .index("by_last_seen", ["lastSeenAt"]),
});
