// convex/convex.config.ts
import { defineApp } from "convex/server";
import streaming from "./convex/streaming/convex.config";

const app = defineApp();
app.use(streaming);

export default app;
