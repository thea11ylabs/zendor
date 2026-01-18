import { createHash } from "crypto";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";

export const PDF_CHUNK_SIZE = 128 * 1024; // 128KB
const CHUNKS_DIR = join(process.cwd(), "tmp", "pdf-chunks");
const FULL_PDF_FILENAME = "output.pdf";

export interface PDFChunk {
  hash: string;
  start: number;
  end: number;
  size: number;
}

export interface ChunkedPDFData {
  contentId: string;
  size: number;
  ranges: PDFChunk[];
  createdAt: string;
}

/**
 * Chunk a PDF buffer into 128KB segments and generate content hashes
 */
export async function chunkPDF(pdfBuffer: Buffer): Promise<ChunkedPDFData> {
  const size = pdfBuffer.length;
  const ranges: PDFChunk[] = [];

  // Generate unique content ID for this compilation
  const contentId = generateContentId(pdfBuffer);

  // Ensure chunks directory exists
  const contentDir = join(CHUNKS_DIR, contentId);
  await mkdir(contentDir, { recursive: true });

  const fullPdfPath = join(contentDir, FULL_PDF_FILENAME);
  await writeFile(fullPdfPath, pdfBuffer);

  let offset = 0;

  while (offset < size) {
    const end = Math.min(offset + PDF_CHUNK_SIZE, size);
    const chunkData = pdfBuffer.subarray(offset, end);

    // Generate SHA-256 hash for this chunk
    const hash = generateChunkHash(chunkData);

    // Store chunk metadata
    ranges.push({
      hash,
      start: offset,
      end,
      size: end - offset,
    });

    // Write chunk to disk
    const chunkPath = join(contentDir, hash);
    await writeFile(chunkPath, chunkData);

    offset = end;
  }

  return {
    contentId,
    size,
    ranges,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate a unique content ID based on the entire PDF
 */
function generateContentId(pdfBuffer: Buffer): string {
  const hash = createHash("sha256").update(pdfBuffer).digest("hex");
  const timestamp = Date.now();
  return `${hash.slice(0, 12)}-${timestamp}`;
}

/**
 * Generate SHA-256 hash for a chunk
 */
function generateChunkHash(chunkData: Buffer): string {
  return createHash("sha256").update(chunkData).digest("hex");
}

/**
 * Retrieve a specific chunk from disk
 */
export async function getChunk(contentId: string, hash: string): Promise<Buffer | null> {
  try {
    const chunkPath = join(CHUNKS_DIR, contentId, hash);
    return await readFile(chunkPath);
  } catch {
    return null;
  }
}

/**
 * Retrieve the full PDF from disk
 */
export async function getPdfFile(contentId: string): Promise<Buffer | null> {
  try {
    const pdfPath = join(CHUNKS_DIR, contentId, FULL_PDF_FILENAME);
    return await readFile(pdfPath);
  } catch {
    return null;
  }
}
