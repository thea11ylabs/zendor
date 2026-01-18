import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { streamChat } from "./chatThread";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes
authComponent.registerRoutes(http, createAuth, {
  cors: true,
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_KEY || process.env.OPENAI_API_KEY,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Title generation
const generateTitle = httpAction(async (_ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { message }: { message: string } = await request.json();
  const result = await streamText({
    model: openai("gpt-5.1"),
    system: "Generate a very short title (3-6 words) for this chat. No quotes or punctuation.",
    prompt: message,
  });

  return new Response(JSON.stringify({ title: (await result.text).trim() }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});

// Persistent text streaming chat endpoint
http.route({ path: "/chat-stream", method: "POST", handler: streamChat });
http.route({ path: "/chat-stream", method: "OPTIONS", handler: streamChat });

// Title endpoint
http.route({ path: "/title", method: "POST", handler: generateTitle });
http.route({ path: "/title", method: "OPTIONS", handler: generateTitle });

export default http;
