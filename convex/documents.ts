import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { authComponent } from "./auth";

// Create a new document
export const create = mutation({
  args: {
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
      title: args.title || "Untitled Document",
      userId: user._id,
      content: args.content || "",
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    return documentId;
  },
});

// Get user's documents with pagination
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);

    return documents;
  },
});

// Get a specific document
export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    try {
      const user = await authComponent.getAuthUser(ctx);
      if (!user) return null;

      const document = await ctx.db.get(args.id);
      if (!document) return null;
      if (document.userId !== user._id) return null;

      return document;
    } catch {
      // If authentication fails, return null instead of throwing
      return null;
    }
  },
});

// Update document content
export const update = mutation({
  args: {
    id: v.id("documents"),
    content: v.string(),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");
    if (document.userId !== user._id) throw new Error("Unauthorized");

    // Optimistic concurrency control
    if (document.version !== args.version) {
      throw new Error("Document version mismatch");
    }

    await ctx.db.patch(args.id, {
      content: args.content,
      version: document.version + 1,
      updatedAt: Date.now(),
    });

    return { success: true, version: document.version + 1 };
  },
});

// Update document title
export const updateTitle = mutation({
  args: {
    id: v.id("documents"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");
    if (document.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      title: args.title,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete a document
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");
    if (document.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Sync Yjs document state (for CRDT collaboration)
export const syncYDoc = mutation({
  args: {
    id: v.id("documents"),
    yDoc: v.bytes(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");
    if (document.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      yDoc: args.yDoc,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get Yjs document state
export const getYDoc = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");
    if (document.userId !== user._id) throw new Error("Unauthorized");

    return document.yDoc;
  },
});

// Generate share link
export const generateShareLink = mutation({
  args: {
    id: v.id("documents"),
    permission: v.union(v.literal("view"), v.literal("edit")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");
    if (document.userId !== user._id) throw new Error("Unauthorized");

    // Generate unique token
    const shareToken = crypto.randomUUID();

    await ctx.db.patch(args.id, {
      isPublic: true,
      shareToken,
      sharePermission: args.permission,
    });

    return { shareToken, permission: args.permission };
  },
});

// Update share link permission
export const updateSharePermission = mutation({
  args: {
    id: v.id("documents"),
    permission: v.union(v.literal("view"), v.literal("edit")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");
    if (document.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      sharePermission: args.permission,
    });

    return { success: true };
  },
});

// Revoke share link
export const revokeShareLink = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const document = await ctx.db.get(args.id);
    if (!document) throw new Error("Document not found");
    if (document.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      isPublic: false,
      shareToken: undefined,
      sharePermission: undefined,
    });

    return { success: true };
  },
});

// Get document by share token (public access)
export const getByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!document || !document.isPublic) {
      return null;
    }

    return document;
  },
});

// Update shared document content (for edit permission)
export const updateSharedDocument = mutation({
  args: {
    shareToken: v.string(),
    content: v.string(),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!document || !document.isPublic) {
      throw new Error("Document not found");
    }

    // Check if edit permission is granted
    if (document.sharePermission !== "edit") {
      throw new Error("Edit permission required");
    }

    // Optimistic concurrency control
    if (document.version !== args.version) {
      throw new Error("Document version mismatch");
    }

    await ctx.db.patch(document._id, {
      content: args.content,
      version: document.version + 1,
      updatedAt: Date.now(),
    });

    return { success: true, version: document.version + 1 };
  },
});

// Update shared document title (for edit permission)
export const updateSharedDocumentTitle = mutation({
  args: {
    shareToken: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .first();

    if (!document || !document.isPublic) {
      throw new Error("Document not found");
    }

    // Check if edit permission is granted
    if (document.sharePermission !== "edit") {
      throw new Error("Edit permission required");
    }

    await ctx.db.patch(document._id, {
      title: args.title,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update presence (heartbeat)
export const updatePresence = mutation({
  args: {
    documentId: v.id("documents"),
    userName: v.string(),
    userColor: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing presence
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .filter((q) =>
        args.userId
          ? q.eq(q.field("userId"), args.userId)
          : q.eq(q.field("userName"), args.userName)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeenAt: now,
        userColor: args.userColor,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("presence", {
        documentId: args.documentId,
        userId: args.userId,
        userName: args.userName,
        userColor: args.userColor,
        lastSeenAt: now,
      });
    }
  },
});

// Get active users on a document
export const getPresence = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    const activeUsers = await ctx.db
      .query("presence")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .filter((q) => q.gt(q.field("lastSeenAt"), fiveMinutesAgo))
      .collect();

    return activeUsers;
  },
});

// Clean up stale presence records (run periodically)
export const cleanupPresence = mutation({
  args: {},
  handler: async (ctx) => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    const staleRecords = await ctx.db
      .query("presence")
      .withIndex("by_last_seen", (q) => q.lt("lastSeenAt", thirtyMinutesAgo))
      .collect();

    for (const record of staleRecords) {
      await ctx.db.delete(record._id);
    }

    return { deleted: staleRecords.length };
  },
});
