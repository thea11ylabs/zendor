
import { query } from "./_generated/server";
import { v } from "convex/values";
/**
 * Get user by ID from Better Auth component
 */
export const getUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("user")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();
  },
});

/**
 * Get user by email from Better Auth component
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("user")
      .withIndex("email_name", (q) => q.eq("email", email))
      .first();
  },
});

/**
 * Public query to check if user exists by email (for sign-in validation)
 */
export const checkUserExists = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("user")
      .withIndex("email_name", (q) => q.eq("email", email))
      .first();
    return user !== null;
  },
});
