/**
 * Type definitions for PDF chunking and caching system
 */

export interface PDFChunk {
  hash: string;
  start: number;
  end: number;
  size: number;
  objectId?: Uint8Array;
}

export interface PDFFile {
  contentId: string;
  size: number;
  ranges: PDFChunk[];
  createdAt: Date | string;
  prefetched?: PrefetchedChunk[];
  startXRefTable?: number;
}

export interface PrefetchedChunk {
  hash: string;
  start: number;
  end: number;
  buffer: Uint8Array;
}

export interface PDFRange extends PDFChunk {
  totalUsage?: number;
}

export interface Chunk {
  start: number;
  end: number;
}

export interface PdfCachingMetrics {
  cachedCount: number;
  cachedBytes: number;
  fetchedCount: number;
  fetchedBytes: number;
  requestedCount: number;
  requestedBytes: number;
  latencyFetch?: number;
  latencyRender?: number;
  latencyComputeMax?: number;
  latencyComputeTotal?: number;
  oldUrlHitCount?: number;
  oldUrlMissCount?: number;
  tooManyRequestsCount?: number;
  tooMuchBandwidthCount?: number;
  failedCount?: number;
  failedOnce?: boolean;
}

export interface CompilationResponse {
  contentId: string;
  size: number;
  ranges: PDFChunk[];
  createdAt: string;
  pdfData: string; // base64 encoded
}
