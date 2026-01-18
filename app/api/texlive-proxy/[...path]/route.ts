import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxy API route to bypass CORS for SwiftLaTeX TexLive resources
 * Forwards requests from /api/texlive-proxy/* to https://texlive2.swiftlatex.com/*
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	const resolvedParams = await params;
	const path = resolvedParams.path.join("/");
	const texliveUrl = `https://texlive2.swiftlatex.com/${path}`;

	try {
		const response = await fetch(texliveUrl, {
			headers: {
				"User-Agent": "Mozilla/5.0",
			},
			// 30 second timeout
			signal: AbortSignal.timeout(30000),
		});

		if (!response.ok) {
			return NextResponse.json(
				{ error: `TexLive resource not found: ${path}` },
				{ status: response.status },
			);
		}

		const contentType =
			response.headers.get("content-type") || "application/octet-stream";
		const fileId = response.headers.get("fileid");
		const pkId = response.headers.get("pkid");

		const buffer = await response.arrayBuffer();

		const headers: Record<string, string> = {
			"Content-Type": contentType,
			"Cache-Control": "public, max-age=31536000, immutable",
		};

		if (fileId) {
			headers.fileid = fileId;
		}

		if (pkId) {
			headers.pkid = pkId;
		}

		return new NextResponse(buffer, {
			status: 200,
			headers,
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`TexLive proxy error for ${path}:`, errorMessage);

		return NextResponse.json(
			{ error: `Failed to fetch TexLive resource: ${errorMessage}` },
			{ status: 502 },
		);
	}
}
