import { mutation } from "./_generated/server";

/**
 * Clear ALL app tables
 * For component tables (persistent text streaming), use: npx convex dev --reset
 */
export const clearAllTables = mutation({
  args: {},
  handler: async (ctx) => {
    const appTables = [
      "chats",
      "messages",
      "streamMetadata",
      "comments",
      "commentReplies",
      "documents",
    ] as const;

    const results: Record<string, number> = {};

    // Clear app tables
    for (const table of appTables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      results[table] = docs.length;
    }

    return {
      results,
      total: Object.values(results).reduce((a, b) => a + b, 0),
    };
  },
});
