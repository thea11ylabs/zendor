"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { PDFFile } from "@/types/pdf";
import { PDFJSWrapper } from "@/lib/pdf/pdf-js-wrapper";
import { debounce } from "@/lib/utils";

export interface PDFJSViewerHandle {
  scrollToPercent: (percent: number) => void;
}

interface PDFJSViewerProps {
  url?: string;
  pdfFile?: PDFFile;
  className?: string;
  storageKey?: string;
  invertColors?: boolean;
  onRenderStateChange?: (state: "loading" | "updating" | "ready") => void;
  onPdfDoubleClick?: (percent: number) => void;
}

const PDFJSViewer = forwardRef<PDFJSViewerHandle, PDFJSViewerProps>(function PDFJSViewer(
  {
    url,
    pdfFile,
    className = "",
    storageKey,
    invertColors = false,
    onRenderStateChange,
    onPdfDoubleClick,
  },
  ref
) {
  const wrapperRef = useRef<PDFJSWrapper | null>(null);
  const initPromiseRef = useRef<Promise<PDFJSWrapper | null> | null>(null);
  const currentUrlRef = useRef<string>("");
  const [initialised, setInitialised] = useState(false);
  const [wrapperReady, setWrapperReady] = useState(false);
  const [renderState, setRenderState] = useState<
    "loading" | "updating" | "ready"
  >("loading");

  // Expose scrollToPercent method via ref
  useImperativeHandle(
    ref,
    () => ({
      scrollToPercent: (percent: number) => {
        if (wrapperRef.current) {
          wrapperRef.current.scrollToPercent(percent);
        }
      },
    }),
    []
  );

  useEffect(() => {
    onRenderStateChange?.(renderState);
  }, [renderState, onRenderStateChange]);

  const persistedKey = useMemo(() => {
    if (!storageKey) return null;
    return `pdf-viewer:${storageKey}`;
  }, [storageKey]);

  // Store position/scale before reloading
  const savedPositionRef = useRef<{
    page: number;
    offset: { top: number; left: number };
  } | null>(null);
  const savedScaleRef = useRef<string | number>("page-width");

  // Create wrapper once on mount
  const handleContainer = useCallback((container: HTMLDivElement | null) => {
    if (!container || wrapperRef.current || initPromiseRef.current) return;

    const inner = container.querySelector<HTMLDivElement>(
      ".pdfjs-viewer-inner"
    );
    if (!inner) return;

    initPromiseRef.current = PDFJSWrapper.create(inner)
      .then((wrapper) => {
        if (!container.isConnected) return wrapper;
        wrapperRef.current = wrapper;
        setWrapperReady(true);
        return wrapper;
      })
      .catch((error) => {
        console.error("PDFJSViewer initialization error:", error);
        return null;
      })
      .finally(() => {
        initPromiseRef.current = null;
      });
  }, []);

  // Listen for pagesinit event - fired when document is ready
  useEffect(() => {
    if (!wrapperRef.current) return;

    const wrapper = wrapperRef.current;

    const handlePagesInit = () => {
      setInitialised(true);
    };

    wrapper.eventBus.on("pagesinit", handlePagesInit);

    return () => {
      wrapper.eventBus.off("pagesinit", handlePagesInit);
    };
  }, [wrapperReady]);

  // Handle double-click on PDF to sync to editor
  useEffect(() => {
    if (!wrapperRef.current || !onPdfDoubleClick) return;

    const wrapper = wrapperRef.current;

    const handleDoubleClick = () => {
      const scrollTop = wrapper.container.scrollTop;
      const scrollHeight = wrapper.container.scrollHeight - wrapper.container.clientHeight;
      const percent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      onPdfDoubleClick(percent);
    };

    wrapper.container.addEventListener("dblclick", handleDoubleClick);

    return () => {
      wrapper.container.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [wrapperReady, onPdfDoubleClick]);

  // Hydrate saved position + scale from localStorage once
  useEffect(() => {
    if (!wrapperRef.current || !persistedKey) return;
    if (typeof window === "undefined") return;

    try {
      const storedScaleRaw = window.localStorage.getItem(
        `${persistedKey}:scale`
      );
      if (storedScaleRaw) {
        const parsedScale = JSON.parse(storedScaleRaw) as string | number;
        savedScaleRef.current = parsedScale;
      }
    } catch {
      // Ignore storage errors.
    }

    try {
      const storedPositionRaw = window.localStorage.getItem(
        `${persistedKey}:position`
      );
      if (storedPositionRaw) {
        const parsedPosition = JSON.parse(storedPositionRaw) as {
          page: number;
          offset: { top: number; left: number };
        };
        if (
          typeof parsedPosition?.page === "number" &&
          parsedPosition?.offset
        ) {
          savedPositionRef.current = parsedPosition;
        }
      }
    } catch {
      // Ignore storage errors.
    }
  }, [persistedKey, wrapperReady]);

  // Track scale changes (e.g. ctrl + scroll) to preserve zoom mode
  useEffect(() => {
    if (!wrapperRef.current) return;

    const wrapper = wrapperRef.current;

    const handleScaleChanging = (event: { scale?: number }) => {
      const nextScale = wrapper.viewer.currentScaleValue;
      savedScaleRef.current = nextScale ?? event.scale ?? savedScaleRef.current;
    };

    wrapper.eventBus.on("scalechanging", handleScaleChanging);

    return () => {
      wrapper.eventBus.off("scalechanging", handleScaleChanging);
    };
  }, [wrapperReady]);

  // Handle resize
  useLayoutEffect(() => {
    if (!wrapperRef.current) return;

    const wrapper = wrapperRef.current;

    const updateOnResize = () => {
      wrapper.updateOnResize();
    };

    const resizeObserver = new ResizeObserver(updateOnResize);
    resizeObserver.observe(wrapper.container);
    window.addEventListener("resize", updateOnResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateOnResize);
    };
  }, [wrapperReady]);

  // Track scroll position continuously when document is ready
  useEffect(() => {
    if (!wrapperRef.current || !initialised) return;

    const wrapper = wrapperRef.current;

    const persistPosition = debounce(() => {
      if (!wrapper.isVisible()) return;
      const position = wrapper.currentPosition;
      if (!position) return;

      savedPositionRef.current = position;
      savedScaleRef.current = wrapper.viewer.currentScaleValue;

      if (!persistedKey || typeof window === "undefined") return;

      try {
        window.localStorage.setItem(
          `${persistedKey}:position`,
          JSON.stringify(position)
        );
        window.localStorage.setItem(
          `${persistedKey}:scale`,
          JSON.stringify(savedScaleRef.current)
        );
      } catch {
        // Ignore storage errors.
      }
    }, 500);

    const savePosition = () => {
      if (!wrapper.isVisible()) return;
      const position = wrapper.currentPosition;
      if (position) {
        savedPositionRef.current = position;
        savedScaleRef.current = wrapper.viewer.currentScaleValue;
      }
    };

    const scrollListener = () => {
      savePosition();
      persistPosition();
    };

    wrapper.container.addEventListener("scroll", scrollListener, {
      passive: true,
    });

    const timer = setTimeout(savePosition, 100);

    return () => {
      wrapper.container.removeEventListener("scroll", scrollListener);
      clearTimeout(timer);
      persistPosition();
      persistPosition.cancel();
      savePosition();
    };
  }, [initialised, persistedKey]);

  // Restore the saved scale and scroll position
  useEffect(() => {
    if (!wrapperRef.current || !initialised) return;

    const wrapper = wrapperRef.current;
    if (!wrapper.isVisible()) return;

    if (savedPositionRef.current) {
      wrapper.scrollToPosition(savedPositionRef.current, savedScaleRef.current);
    } else {
      wrapper.viewer.currentScaleValue = savedScaleRef.current as string;
    }
  }, [initialised, wrapperReady]);

  useEffect(() => {
    if (!initialised || !wrapperRef.current) return;

    const pageElements = wrapperRef.current.container.querySelectorAll(
      'div[data-page-number][role="region"]'
    );
    pageElements.forEach((element) => {
      element.removeAttribute("role");
    });
  }, [initialised]);

  // Load document when URL changes
  useEffect(() => {
    if (!wrapperRef.current || !url) return;

    const isSameUrl = currentUrlRef.current === url;
    if (isSameUrl) return;

    currentUrlRef.current = url;

    const abortController = new AbortController();
    const wrapper = wrapperRef.current;
    const handlePageRendered = () => {
      setRenderState("ready");
      wrapper.eventBus.off("pagerendered", handlePageRendered);
    };

    const loadDocument = async () => {
      try {
        const hasDocument = Boolean(wrapper.viewer.pdfDocument);
        setInitialised(false);
        setRenderState(hasDocument ? "updating" : "loading");

        wrapper.eventBus.on("pagerendered", handlePageRendered);
        await wrapper.loadDocument({ url, pdfFile, abortController });
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error("PDFJSViewer load error:", error);
      }
    };

    loadDocument();

    return () => {
      wrapper.eventBus.off("pagerendered", handlePageRendered);
      abortController.abort();
    };
  }, [url, pdfFile, wrapperReady]);

  return (
    <div
      ref={handleContainer}
      className={`pdfjs-viewer pdfjs-viewer-outer relative w-full h-full bg-zinc-100 dark:bg-zinc-900 
        overflow-scroll ${className}`}
      data-render-state={renderState}
      aria-busy={renderState !== "ready"}
      tabIndex={-1}
      // style={{
      //   boxShadow: '0 0 10px rgb(0 0 0 / 50%)',
      // }}
    >
      <div
        className="pdfjs-viewer-inner absolute inset-0 overflow-y-scroll overflow-x-hidden w-full h-full opacity-100 translate-x-0 transition-all duration-3000 ease-[cubic-bezier(0.2,0,0,1)] data-[state=loading]:opacity-0 data-[state=loading]:translate-x-[12px] data-[state=loading]:duration-[320ms] data-[state=loading]:ease-[cubic-bezier(0.4,0,1,1)] data-[state=updating]:opacity-60 data-[state=updating]:translate-x-[8px] data-[state=updating]:duration-[320ms] data-[state=updating]:ease-[cubic-bezier(0.4,0,1,1)]"
        data-state={renderState}
        tabIndex={0}
        role="tabpanel"
      >
        <div
          className={`pdfViewer ${invertColors ? "invert hue-rotate-180" : ""}`}
        />
      </div>
    </div>
  );
});

export default PDFJSViewer;
