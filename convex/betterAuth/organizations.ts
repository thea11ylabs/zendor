import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all organizations/teams for a user
 */
export const getUserOrganizations = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Query member table for user's memberships
    const members = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    // Fetch organization details for each membership
    const organizations = await Promise.all(
      members.map(async (member) => {
        // @ts-ignore
        const org = await ctx.db.get(member.organizationId);
        return {
          _id: member.organizationId,
          name: org?._id || "Unknown",
          role: member.role,
          createdAt: member.createdAt,
        };
      })
    );

    return organizations;
  },
});
