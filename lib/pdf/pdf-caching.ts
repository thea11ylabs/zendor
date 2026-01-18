import { PDFFile, PDFRange, Chunk } from "@/types/pdf";

export const PDF_JS_CHUNK_SIZE = 128 * 1024; // 128KB
const INCREMENTAL_CACHE_SIZE = 1000;
const CHUNK_USAGE_THRESHOLD_CACHED = 42;
const CHUNK_USAGE_STALE_DECAY_RATE = 0.7;

/**
 * Fetch a range of bytes from the PDF, using cached chunks when available
 */
export async function fetchRange({
  url,
  start,
  end,
  file,
  usageScore,
  cachedUrls,
  abortSignal,
}: {
  url: string;
  start: number;
  end: number;
  file: PDFFile;
  usageScore: Map<string, number>;
  cachedUrls: Map<string, { url: string; init: RequestInit }>;
  abortSignal: AbortSignal;
}): Promise<ArrayBuffer> {
  const size = end - start;

  // Find chunks that match this range
  // Convert chunks to PDFRange format
  const pdfRanges = file.ranges.map(r => ({
    ...r,
    totalUsage: 0,
  })) as PDFRange[];

  const matchingChunks = getMatchingChunks(pdfRanges, start, end);

  // Skip already prefetched chunks
  const prefetched = (file.prefetched || []).map(p => ({
    ...p,
    size: p.end - p.start,
  })) as PDFRange[];
  const chunks = skipPrefetched(matchingChunks, prefetched, start, end);

  // Calculate usage scores
  for (const chunk of chunks) {
    const newUsage =
      (Math.min(end, chunk.end) - Math.max(start, chunk.start)) / chunk.size;
    const totalUsage = (usageScore.get(chunk.hash) || 0) + newUsage;
    usageScore.delete(chunk.hash);
    usageScore.set(chunk.hash, totalUsage);
    chunk.totalUsage = totalUsage;
  }

  // Get dynamic (non-chunked) portions
  const dynamicChunks = getInterleavingDynamicChunks(chunks, start, end);

  // If no chunks available, fetch the entire range directly
  if (chunks.length === 0 && dynamicChunks.length === 1) {
    return fallbackRequest({ url: file.contentId, start, end, abortSignal });
  }

  // Fetch all required chunks and dynamic portions
  const requests: Array<{
    chunk: PDFRange | Chunk;
    url: string;
  }> = [];

  // Add chunk requests
  for (const chunk of chunks) {
    requests.push({
      chunk,
      url: `${url}/${chunk.hash}`,
    });
  }

  // Add dynamic chunk requests (portions not covered by cached chunks)
  for (const dynamicChunk of dynamicChunks) {
    requests.push({
      chunk: dynamicChunk,
      url: file.contentId, // Use fallback URL for dynamic chunks
    });
  }

  const fetchChunk = async ({
    chunk,
    url: chunkUrl,
  }: {
    chunk: PDFRange | Chunk;
    url: string;
  }) => {
    try {
      const isChunk = "hash" in chunk;
      const init: RequestInit = {
        signal: abortSignal,
        headers: isChunk
          ? {}
          : {
              Range: `bytes=${chunk.start}-${chunk.end - 1}`,
            },
      };

      if (isChunk && chunk.hash) {
        const cached = cachedUrls.get(chunk.hash);
        if (cached && cached.url !== chunkUrl) {
          try {
            const cachedResponse = await fetch(cached.url, {
              ...cached.init,
              signal: abortSignal,
            });
            if (cachedResponse.ok) {
              const cachedData = await cachedResponse.arrayBuffer();
              return { chunk, data: new Uint8Array(cachedData) };
            }
          } catch {
            // Ignore cache fallback errors and refetch from current URL.
          }
          cachedUrls.delete(chunk.hash);
        }
      }

      const response = await fetch(chunkUrl, init);

      if (!response.ok) {
        throw new Error(`Failed to fetch chunk: ${response.statusText}`);
      }

      if (isChunk && chunk.hash) {
        const cacheInit: RequestInit = { ...init };
        delete (cacheInit as { signal?: AbortSignal }).signal;
        cachedUrls.set(chunk.hash, { url: chunkUrl, init: cacheInit });
      }

      const data = await response.arrayBuffer();
      return { chunk, data: new Uint8Array(data) };
    } catch (error) {
      console.error("Error fetching chunk:", error);
      throw error;
    }
  };

  // Fetch all chunks in parallel
  const responses = await Promise.all(requests.map(fetchChunk));

  // Reassemble the PDF data from chunks
  const reassembledBlob = new Uint8Array(size);

  for (const { chunk, data } of responses) {
    const offsetStart = Math.max(start - chunk.start, 0);
    const offsetEnd = Math.max(chunk.end - end, 0);

    let trimmedData = data;
    if (offsetStart > 0 || offsetEnd > 0) {
      const chunkSize = chunk.end - chunk.start;
      trimmedData = data.subarray(offsetStart, chunkSize - offsetEnd);
    }

    const insertPosition = Math.max(chunk.start - start, 0);
    reassembledBlob.set(trimmedData, insertPosition);
  }

  // Trim cache if needed
  trimState({ usageScore, cachedUrls });

  return reassembledBlob.buffer;
}

/**
 * Fallback to fetching the entire range directly
 */
async function fallbackRequest({
  url,
  start,
  end,
  abortSignal,
}: {
  url: string;
  start: number;
  end: number;
  abortSignal: AbortSignal;
}): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    headers: {
      Range: `bytes=${start}-${end - 1}`,
    },
    signal: abortSignal,
  });

  if (!response.ok) {
    throw new Error(`Fallback request failed: ${response.statusText}`);
  }

  return response.arrayBuffer();
}

/**
 * Get chunks that match a given range
 */
function getMatchingChunks<T extends PDFRange>(
  chunks: T[],
  start: number,
  end: number
): T[] {
  const matchingChunks: T[] = [];

  for (const chunk of chunks) {
    if (chunk.end <= start) {
      // No overlap: chunk is before range
      continue;
    }
    if (chunk.start >= end) {
      // No overlap: chunk is after range
      break;
    }
    matchingChunks.push(chunk);
  }

  return matchingChunks;
}

/**
 * Skip chunks that have already been prefetched
 */
function skipPrefetched<T extends PDFRange>(
  chunks: T[],
  prefetched: PDFRange[],
  start: number,
  end: number
): T[] {
  return chunks.filter((chunk) => {
    return !prefetched.find(
      (c) =>
        c.start <= Math.max(chunk.start, start) &&
        c.end >= Math.min(chunk.end, end)
    );
  });
}

/**
 * Get dynamic (non-chunked) portions between cached chunks
 */
function getInterleavingDynamicChunks(
  chunks: PDFRange[],
  start: number,
  end: number
): Chunk[] {
  const dynamicChunks: Chunk[] = [];

  for (const chunk of chunks) {
    if (start < chunk.start) {
      dynamicChunks.push({ start, end: chunk.start });
    }
    start = chunk.end;
  }

  if (start < end) {
    dynamicChunks.push({ start, end });
  }

  return dynamicChunks;
}

/**
 * Trim the cache to keep it under the size limit
 */
function trimState({
  usageScore,
  cachedUrls,
}: {
  usageScore: Map<string, number>;
  cachedUrls: Map<string, { url: string; init: RequestInit }>;
}) {
  for (const [hash, score] of usageScore) {
    if (usageScore.size < INCREMENTAL_CACHE_SIZE) {
      break;
    }

    if (score >= CHUNK_USAGE_THRESHOLD_CACHED) {
      // Keep frequently used chunks, but decay their score
      usageScore.set(hash, score * CHUNK_USAGE_STALE_DECAY_RATE);
      continue;
    }

    // Remove least recently used chunks
    cachedUrls.delete(hash);
    usageScore.delete(hash);
  }
}
