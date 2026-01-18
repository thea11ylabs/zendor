import { NextRequest, NextResponse } from "next/server";
import { getChunk } from "@/lib/pdf/pdf-chunker";

/**
 * Serve individual PDF chunks by contentId and hash
 * Used by the PDF caching transport layer for incremental loading
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string; hash: string }> }
) {
  try {
    const { contentId, hash } = await params;

    // Retrieve chunk from disk
    const chunkData = await getChunk(contentId, hash);

    if (!chunkData) {
      return NextResponse.json(
        { error: "Chunk not found" },
        { status: 404 }
      );
    }

    // Return chunk with appropriate headers
    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(chunkData);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": chunkData.length.toString(),
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "X-Chunk-Hash": hash,
      },
    });
  } catch (error) {
    console.error("Error serving PDF chunk:", error);
    return NextResponse.json(
      { error: "Failed to retrieve chunk" },
      { status: 500 }
    );
  }
}
