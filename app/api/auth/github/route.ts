import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub client ID not configured" }, { status: 500 });
  }

  // Determine the callback URL based on the request
  const requestUrl = new URL(request.url);
  const callbackUrl = `${requestUrl.origin}/api/auth/github/callback`;

  // GitHub OAuth URL with required scopes
  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", clientId);
  githubAuthUrl.searchParams.set("redirect_uri", callbackUrl);
  githubAuthUrl.searchParams.set("scope", "repo user:email");
  githubAuthUrl.searchParams.set("state", redirectTo);

  return NextResponse.redirect(githubAuthUrl.toString());
}
