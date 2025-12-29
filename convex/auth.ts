import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth, BetterAuthOptions } from "better-auth";
import authSchema from "./betterAuth/schema";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

type AuthComponent = ReturnType<typeof createClient<DataModel, typeof authSchema>>;

export const authComponent: AuthComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    verbose: true,
    authFunctions: internal.auth,
    local: {
      schema: authSchema,
    },
    triggers: {
      user: {
        onCreate: async (ctx, doc) => {
          console.log("[user.onCreate] User created:", doc._id);
        },
      },
    },
  }
);

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export const createAuthOptions = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return {
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    trustedOrigins: ["*"],
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    },
    plugins: [
      convex({
        authConfig
      }),
    ]
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>, { optionsOnly } = { optionsOnly: false }) => {
  return betterAuth(createAuthOptions(ctx, { optionsOnly }));
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
