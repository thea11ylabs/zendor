import { fetchRange } from "./pdf-caching";
import { PDFFile } from "@/types/pdf";

/**
 * Generate a factory function for creating PDF caching transport instances
 * This allows PDF.js to load PDFs incrementally via cached chunks
 */
export function generatePdfCachingTransportFactory() {
  // Shared state across all transport instances
  const usageScore = new Map<string, number>();
  const cachedUrls = new Map<string, { url: string; init: RequestInit }>();

  /**
   * Factory function that creates transport instances
   */
  return async function createTransport({
    url,
    pdfFile,
    abortController,
  }: {
    url: string;
    pdfFile: PDFFile;
    abortController: AbortController;
  }) {
    // Dynamic import to avoid SSR issues
    const pdfjsLib = await import("pdfjs-dist");

    class PDFDataRangeTransport extends pdfjsLib.PDFDataRangeTransport {
    url: string;
    pdfFile: PDFFile;
    abortController: AbortController;

    constructor({
      url,
      pdfFile,
      abortController,
    }: {
      url: string;
      pdfFile: PDFFile;
      abortController: AbortController;
    }) {
      // Initialize with total PDF size and empty initial data
      super(pdfFile.size, new Uint8Array());

      this.url = url;
      this.pdfFile = pdfFile;
      this.abortController = abortController;
    }

    /**
     * Called by PDF.js when it needs a range of bytes
     * This is where we intercept requests and serve from cache
     */
    requestDataRange(start: number, end: number) {
      const abortSignal = this.abortController.signal;

      fetchRange({
        url: this.url,
        start,
        end,
        file: this.pdfFile,
        usageScore,
        cachedUrls,
        abortSignal,
      })
        .then((data) => {
          if (abortSignal.aborted) return;

          // Notify PDF.js that data is ready
          this.onDataRange(start, data ? new Uint8Array(data) : null);
        })
        .catch((error) => {
          if (abortSignal.aborted) return;

          console.error("PDF caching transport error:", error);

          // Notify PDF.js of error
          this.onDataRange(start, null);
        });
    }

    /**
     * Called when the transport is no longer needed
     */
    abort() {
      this.abortController.abort();
    }
  }

    return new PDFDataRangeTransport({
      url,
      pdfFile,
      abortController,
    });
  };
}
