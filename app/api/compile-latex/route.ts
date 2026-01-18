import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { chunkPDF } from "@/lib/pdf/pdf-chunker";

const execAsync = promisify(exec);

// Local tmp directory in the repo
const LOCAL_TMP_DIR = join(process.cwd(), "tmp");

/**
 * Server-side LaTeX to PDF compilation endpoint
 * Uses system pdflatex command if available
 * Uses local tmp directory instead of system tmp
 *
 * Note: Requires LaTeX (pdflatex) to be installed on server
 * macOS: brew install basictex
 * Linux: apt-get install texlive-latex-base texlive-latex-extra
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let tempDir: string | null = null;

  try {
    const { content } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "LaTeX content is required" },
        { status: 400 }
      );
    }

    // Ensure local tmp directory exists
    await mkdir(LOCAL_TMP_DIR, { recursive: true });

    // Create temporary directory for compilation
    tempDir = join(LOCAL_TMP_DIR, `latex-${Date.now()}`);
    const texFile = join(tempDir, "main.tex");
    const pdfFile = join(tempDir, "main.pdf");

    // Create temp directory
    await execAsync(`mkdir -p "${tempDir}"`);

    // Write LaTeX content to file
    await writeFile(texFile, content, "utf-8");

    // Run pdflatex (suppress output, non-interactive)
    await execAsync(
      `cd "${tempDir}" && pdflatex -interaction=nonstopmode -halt-on-error main.tex`,
      { timeout: 30000 } // 30 second timeout
    );

    // Read the generated PDF
    const pdfBuffer = await readFile(pdfFile);

    // Chunk the PDF for incremental loading (stores chunks to tmp/pdf-chunks)
    const { contentId, size, ranges, createdAt } = await chunkPDF(pdfBuffer);

    const compilationTime = Date.now() - startTime;

    console.log(`✓ LaTeX compiled successfully in ${compilationTime}ms (${ranges.length} chunks)`);

    // Clean up temp files
    await cleanupTempDir(tempDir);

    // Check if client supports chunked response (via Accept header)
    const acceptHeader = request.headers.get("Accept") || "";
    const supportsChunking = acceptHeader.includes("application/json");

    if (supportsChunking) {
      // Return JSON with chunk metadata
      return NextResponse.json({
        contentId,
        size,
        ranges: ranges.map(({ hash, start, end, size }) => ({
          hash,
          start,
          end,
          size,
        })),
        createdAt,
        pdfData: pdfBuffer.toString("base64"),
      }, {
        status: 200,
        headers: {
          "X-Compilation-Time": compilationTime.toString(),
        },
      });
    } else {
      // Fallback: return PDF directly (backward compatibility)
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": pdfBuffer.length.toString(),
          "X-Compilation-Time": compilationTime.toString(),
        },
      });
    }
  } catch (error: unknown) {
    const compilationTime = Date.now() - startTime;

    // Clean up temp files on error
    if (tempDir) {
      try {
        await cleanupTempDir(tempDir);
      } catch { }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error && typeof error === "object" && "code" in error ? error.code : undefined;

    console.error(`✗ LaTeX compilation failed after ${compilationTime}ms:`, errorMessage);

    // Check if pdflatex is not installed
    if (errorMessage.includes("pdflatex: command not found") || errorCode === "ENOENT") {
      return NextResponse.json(
        {
          error: "pdflatex not installed. Install with: brew install basictex (macOS) or apt-get install texlive-latex-base (Linux)",
          compilationTime,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: `LaTeX compilation failed: ${errorMessage}`,
        compilationTime,
      },
      { status: 400 }
    );
  }
}

/**
 * Clean up temporary directory
 */
async function cleanupTempDir(tempDir: string) {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error("Failed to cleanup temp directory:", error);
  }
}
