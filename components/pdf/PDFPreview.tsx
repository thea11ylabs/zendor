"use client";

import { AlertCircle } from "lucide-react";
import { useState, useEffect, useRef, startTransition, forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import PDFJSViewer, { PDFJSViewerHandle } from "./PDFJSViewer";
import { debounce } from "@/lib/utils";
import type { PDFFile, CompilationResponse } from "@/types/pdf";

interface PDFPreviewProps {
  content: string;
  title: string;
  author?: string;
  invertColors?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onPdfDoubleClick?: (percent: number) => void;
}

type CompilationResult = {
  url: string;
  pdfFile?: PDFFile;
  source: "server" | "client";
  compilationTime: number;
  isObjectUrl: boolean;
};

function buildPdfFile(result: CompilationResponse): PDFFile {
  const baseUrl = `/api/pdf-chunks/${result.contentId}`;
  return {
    contentId: baseUrl,
    size: result.size,
    ranges: result.ranges,
    createdAt: result.createdAt,
  };
}

const PDFPreview = forwardRef<PDFJSViewerHandle, PDFPreviewProps>(function PDFPreview(
  {
    content,
    title,
    invertColors = false,
    onLoadingChange,
    onPdfDoubleClick,
  },
  ref
) {
  const [debouncedContent, setDebouncedContent] = useState(content);
  const [pdfRenderState, setPdfRenderState] = useState<
    "loading" | "updating" | "ready"
  >("loading");

  useEffect(() => {
    const debouncedFunc = debounce((newContent: string) => {
      setDebouncedContent(newContent);
    }, 1000);

    debouncedFunc(content);
    return () => debouncedFunc.cancel();
  }, [content]);

  const {
    data: compilation,
    isLoading,
    error,
  } = useQuery<CompilationResult>({
    queryKey: ["latex-compilation", debouncedContent],
    queryFn: async () => {
      if (!debouncedContent) {
        throw new Error("No content provided");
      }

      const startTime = Date.now();

      try {
        const response = await fetch("/api/compile-latex", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ content: debouncedContent }),
        });

        if (response.ok) {
          const compilationTime = Date.now() - startTime;
          const contentType = response.headers.get("Content-Type") || "";

          if (contentType.includes("application/json")) {
            const data = (await response.json()) as CompilationResponse;
            const pdfFile = buildPdfFile(data);
            return {
              url: pdfFile.contentId,
              pdfFile,
              source: "server",
              compilationTime,
              isObjectUrl: false,
            };
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          return {
            url,
            source: "server",
            compilationTime,
            isObjectUrl: true,
          };
        }

        const { compileLaTeX } = await import("@/lib/tex-compiler");
        const pdfData = await compileLaTeX(debouncedContent);
        const blob = new Blob([new Uint8Array(pdfData)], {
          type: "application/pdf",
        });
        const url = URL.createObjectURL(blob);
        const compilationTime = Date.now() - startTime;
        return {
          url,
          source: "client",
          compilationTime,
          isObjectUrl: true,
        };
      } catch (err) {
        console.error("LaTeX compilation error:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Failed to compile LaTeX";

        if (
          errorMsg.includes("format file") ||
          errorMsg.includes("swiftlatexpdftex.fmt")
        ) {
          throw new Error(
            "LaTeX compilation unavailable: SwiftLaTeX servers are down"
          );
        }
        throw new Error(errorMsg);
      }
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!debouncedContent,
  });

  const [lastCompilation, setLastCompilation] =
    useState<CompilationResult | null>(null);

  useEffect(() => {
    if (compilation) {
      setLastCompilation(compilation);
    }
  }, [compilation]);

  const effectiveCompilation = compilation ?? lastCompilation;
  const pdfUrl = effectiveCompilation?.url;

  useEffect(() => {
    if (onLoadingChange) {
      startTransition(() => {
        onLoadingChange(isLoading || pdfRenderState !== "ready");
      });
    }
  }, [isLoading, pdfRenderState, onLoadingChange]);

  const previousObjectUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (previousObjectUrlRef.current) {
        URL.revokeObjectURL(previousObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pdfUrl) return;

    if (effectiveCompilation?.isObjectUrl) {
      if (
        previousObjectUrlRef.current &&
        previousObjectUrlRef.current !== pdfUrl
      ) {
        URL.revokeObjectURL(previousObjectUrlRef.current);
      }
      previousObjectUrlRef.current = pdfUrl;
      return;
    }

    if (
      previousObjectUrlRef.current &&
      previousObjectUrlRef.current !== pdfUrl
    ) {
      URL.revokeObjectURL(previousObjectUrlRef.current);
      previousObjectUrlRef.current = null;
    }
  }, [pdfUrl, effectiveCompilation?.isObjectUrl]);

  return (
    <div className="pdf-viewer h-full">
      {pdfUrl && (
        <PDFJSViewer
          ref={ref}
          url={pdfUrl}
          pdfFile={effectiveCompilation?.pdfFile}
          storageKey={title || "untitled"}
          invertColors={invertColors}
          onRenderStateChange={setPdfRenderState}
          onPdfDoubleClick={onPdfDoubleClick}
        />
      )}

      {error && !isLoading && (
        <div className="absolute inset-0 bg-zinc-900/95 backdrop-blur-sm flex flex-col items-center justify-center text-red-400 text-sm p-4 z-10">
          <AlertCircle className="w-8 h-8 mb-3" />
          <div className="font-semibold mb-2">LaTeX Compilation Failed</div>
          <div className="text-xs text-center max-w-md text-zinc-400">
            {error.message}
          </div>
        </div>
      )}

      {!pdfUrl && !isLoading && !error && (
        <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
          No PDF available
        </div>
      )}
    </div>
  );
});

export default PDFPreview;
