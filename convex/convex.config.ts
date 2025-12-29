// convex/convex.config.ts
import { defineApp } from "convex/server";
import streaming from "./streaming/convex.config";
import betterAuth from "./betterAuth/convex.config";

const app = defineApp();
app.use(streaming);
app.use(betterAuth);

export default app;
