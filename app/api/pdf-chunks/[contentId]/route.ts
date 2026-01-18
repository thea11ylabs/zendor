import { NextRequest, NextResponse } from "next/server";
import { getPdfFile } from "@/lib/pdf/pdf-chunker";

function parseRangeHeader(rangeHeader: string, size: number) {
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!match) return null;

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return null;
  if (start >= size) return null;

  return { start, end: Math.min(end, size - 1) };
}

/**
 * Serve the full PDF for range requests (used by pdf.js)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    const pdfBuffer = await getPdfFile(contentId);

    if (!pdfBuffer) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const size = pdfBuffer.length;
    const rangeHeader = request.headers.get("range");

    if (!rangeHeader) {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": size.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const range = parseRangeHeader(rangeHeader, size);
    if (!range) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${size}`,
        },
      });
    }

    const { start, end } = range;
    const chunk = pdfBuffer.subarray(start, end + 1);

    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": chunk.length.toString(),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving PDF file:", error);
    return NextResponse.json(
      { error: "Failed to retrieve PDF" },
      { status: 500 }
    );
  }
}
