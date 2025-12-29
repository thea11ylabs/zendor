import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth, BetterAuthOptions } from "better-auth";
import authSchema from "./betterAuth/schema";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
type AuthComponent = ReturnType<typeof createClient<DataModel, typeof authSchema>>;

// Type assertion for betterAuth component - generated after `npx convex dev`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const betterAuthComponent = (components as any).betterAuth;

export const authComponent: AuthComponent = createClient<DataModel, typeof authSchema>(
  betterAuthComponent,
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
          // You can add any additional setup here when a user is created
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
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    trustedOrigins: ["*"],
    socialProviders: {
      // Configure GitHub OAuth login
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex({
        authConfig
      }),
    ]
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>, { optionsOnly } = { optionsOnly: false }) => {
  return betterAuth(createAuthOptions(ctx, { optionsOnly }));
};

// Example function for getting the current user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
