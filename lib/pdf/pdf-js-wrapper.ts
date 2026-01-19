import type {
  EventBus,
  PDFLinkService,
  PDFViewer,
} from "pdfjs-dist/web/pdf_viewer.mjs";
import type { PDFFile } from "@/types/pdf";
import { generatePdfCachingTransportFactory } from "./pdf-caching-transport";
import { getPDFJS, imageResourcesPath, loadPdfDocumentFromUrl } from "./pdf-js";

const DEFAULT_RANGE_CHUNK_SIZE = 128 * 1024;

type PdfViewerModule = typeof import("pdfjs-dist/web/pdf_viewer.mjs");
type PDFJSModule = typeof import("pdfjs-dist");

let pdfViewerModulePromise: Promise<PdfViewerModule> | null = null;

async function loadPdfViewerModule(): Promise<PdfViewerModule> {
  if (typeof globalThis !== "undefined") {
    const pdfjs = await getPDFJS();
    const globalScope = globalThis as typeof globalThis & {
      pdfjsLib?: PDFJSModule | null;
    };
    if (!globalScope.pdfjsLib && pdfjs) {
      globalScope.pdfjsLib = pdfjs;
    }
  }

  if (!pdfViewerModulePromise) {
    pdfViewerModulePromise = import("pdfjs-dist/web/pdf_viewer.mjs");
  }

  return pdfViewerModulePromise;
}

function isSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return ua.includes("Safari") && !ua.includes("Chrome");
}

/**
 * Wrapper around PDF.js viewer that persists across document changes
 * Based on Overleaf's implementation for smooth updates and position preservation
 */
export class PDFJSWrapper {
  public readonly viewer: PDFViewer;
  public readonly eventBus: EventBus;
  private readonly linkService: PDFLinkService;
  private readonly pdfCachingTransportFactory: ReturnType<
    typeof generatePdfCachingTransportFactory
  >;
  private currentUrl?: string;

  static async create(container: HTMLDivElement) {
    const [viewerModule, pdfjs] = await Promise.all([
      loadPdfViewerModule(),
      getPDFJS(),
    ]);
    if (!pdfjs) throw new Error("PDF.js not available in SSR environment");
    return new PDFJSWrapper(container, viewerModule, pdfjs);
  }

  private constructor(
    public container: HTMLDivElement,
    viewerModule: PdfViewerModule,
    pdfjs: PDFJSModule
  ) {
    const { EventBus, PDFLinkService, LinkTarget, PDFViewer } = viewerModule;

    // Create event bus
    this.eventBus = new EventBus();

    // Create link service
    this.linkService = new PDFLinkService({
      eventBus: this.eventBus,
      externalLinkTarget: LinkTarget.BLANK,
      externalLinkRel: "noopener",
    });

    // Create viewer
    const maxCanvasPixels = isSafari() ? 4096 * 4096 : 8192 * 8192;
    this.viewer = new PDFViewer({
      container: this.container,
      eventBus: this.eventBus,
      imageResourcesPath,
      linkService: this.linkService,
      maxCanvasPixels,
      annotationMode: pdfjs.AnnotationMode.ENABLE,
      annotationEditorMode: pdfjs.AnnotationEditorType.DISABLE,
    });

    this.linkService.setViewer(this.viewer);
    this.pdfCachingTransportFactory = generatePdfCachingTransportFactory();
  }

  /**
   * Load a PDF document from URL
   * Updates the existing viewer instead of creating a new one
   */
  async loadDocument({
    url,
    pdfFile,
    abortController,
  }: {
    url: string;
    pdfFile?: PDFFile;
    abortController?: AbortController;
  }) {
    this.currentUrl = url;
    const controller = abortController ?? new AbortController();

    const rangeTransport =
      pdfFile
        ? await this.pdfCachingTransportFactory({
            url,
            pdfFile,
            abortController: controller,
          })
        : undefined;

    let rangeChunkSize: number | undefined;
    if (rangeTransport && pdfFile) {
      rangeChunkSize =
        pdfFile.size < 2 * DEFAULT_RANGE_CHUNK_SIZE
          ? pdfFile.size
          : DEFAULT_RANGE_CHUNK_SIZE;
    }

    const loadingTask = await loadPdfDocumentFromUrl(url, {
      range: rangeTransport,
      rangeChunkSize,
    });
    const pdfDocument = await loadingTask.promise;

    // Check if URL changed while loading
    if (url !== this.currentUrl) {
      pdfDocument.destroy();
      throw new Error("Document loading cancelled");
    }

    // Update existing viewer with new document
    this.viewer.setDocument(pdfDocument);
    this.linkService.setDocument(pdfDocument);

    return pdfDocument;
  }

  /**
   * Get current scroll position
   */
  get currentPosition() {
    try {
      const pageIndex = this.viewer.currentPageNumber - 1;
      const pageView = this.viewer.getPageView(pageIndex);

      if (!pageView || !pageView.div) {
        return null;
      }

      const pageRect = pageView.div.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();

      const dy = containerRect.top - pageRect.top;
      const dx = containerRect.left - pageRect.left;

      const [left, top] = pageView.viewport.convertToPdfPoint(dx, dy);
      const [, , width, height] = pageView.viewport.viewBox;

      return {
        page: pageIndex,
        offset: { top, left },
        pageSize: { height, width },
        scale: this.viewer.currentScale,
      };
    } catch (error) {
      console.warn("Failed to get current position:", error);
      return null;
    }
  }

  /**
   * Scroll to a specific position
   */
  scrollToPosition(position: {
    page: number;
    offset: { top: number; left: number };
  }, scale?: string | number) {
    try {
      const destArray = [
        null,
        { name: "XYZ" }, // XYZ = scroll to coordinates
        position.offset.left,
        position.offset.top,
        scale || null,
      ];

      this.viewer.scrollPageIntoView({
        pageNumber: position.page + 1,
        destArray,
      });

      // Adjust for page border
      const pageIndex = this.viewer.currentPageNumber - 1;
      const pageView = this.viewer.getPageView(pageIndex);

      if (pageView && pageView.div) {
        const offset = parseFloat(getComputedStyle(pageView.div).borderWidth) || 0;
        this.container.scrollBy({
          top: -offset,
          left: -offset,
        });
      }
    } catch (error) {
      console.warn("Failed to scroll to position:", error);
    }
  }

  /**
   * Scroll to a percentage of the document (0.0 to 1.0)
   */
  scrollToPercent(percent: number) {
    try {
      const pdfDocument = this.viewer.pdfDocument;
      if (!pdfDocument) return;

      const scrollHeight = this.container.scrollHeight - this.container.clientHeight;

      const targetScroll = scrollHeight * Math.max(0, Math.min(1, percent));

      this.container.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    } catch (error) {
      console.warn("Failed to scroll to percent:", error);
    }
  }

  /**
   * Update viewer on resize
   */
  updateOnResize() {
    if (!this.isVisible()) return;

    window.requestAnimationFrame(() => {
      const currentScaleValue = this.viewer.currentScaleValue;

      if (
        currentScaleValue === "auto" ||
        currentScaleValue === "page-fit" ||
        currentScaleValue === "page-height" ||
        currentScaleValue === "page-width"
      ) {
        this.viewer.currentScaleValue = currentScaleValue;
      }

      this.viewer.update();
    });
  }

  async fetchAllData() {
    await this.viewer.pdfDocument?.getData();
  }

  /**
   * Check if viewer is visible
   */
  isVisible(): boolean {
    return this.container.offsetParent !== null;
  }

  /**
   * Cleanup
   */
  destroy() {
    // PDF.js handles cleanup internally
  }
}
