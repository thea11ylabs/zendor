import { createAuth } from "../auth";
import type { GenericCtx } from "@convex-dev/better-auth";
import { DataModel } from "../_generated/dataModel";

// Export a static instance for Better Auth schema generation
export const auth = createAuth({} as GenericCtx<DataModel>, { optionsOnly: true });