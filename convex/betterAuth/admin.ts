
import { mutation } from "./_generated/server";

/**
 * Clear ALL tables including Better Auth
 */

type AuthModel =
  | "user"
  | "session"
  | "account"
  | "verification"
  | "jwks"
  | "passkey"
  | "organization"
  | "member"
  | "invitation"
  | "subscription";

export const clearAuthTables = mutation({
  args: {},
  handler: async (ctx) => {
    const appTables: AuthModel[] = [
      "user",
      "session",
      "account",
      "verification",
      "jwks",
      "passkey",
      "organization",
      "member",
      "invitation",
      "subscription",
    ] as const;

    const results: Record<string, number> = {};

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
