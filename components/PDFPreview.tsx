"use client";

import { useState, useEffect } from "react";
import { X, Download, ZoomIn, ZoomOut, AlertCircle } from "lucide-react";
import { generateLatexPDF } from "./LaTeXPDFGenerator";

interface PDFPreviewProps {
  content: string;
  title: string;
  author?: string;
  onClose: () => void;
  inline?: boolean;
}

// PDF Preview component now uses LaTeX-style PDF generation

export default function PDFPreview({ content, title, author, onClose, inline = false }: PDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(inline ? 80 : 100);

  useEffect(() => {
    // Debounce PDF generation to avoid too many re-renders
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        // Use pure JavaScript LaTeX PDF generator
        const blob = await generateLatexPDF(content);
        const url = URL.createObjectURL(blob);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (err) {
        console.error("LaTeX compilation error:", err);
        setError(err instanceof Error ? err.message : "Failed to compile LaTeX");
      } finally {
        setLoading(false);
      }
    }, 1000); // 1s debounce for LaTeX compilation

    return () => {
      clearTimeout(timeoutId);
    };
  }, [content]);

  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      a.click();
    }
  };

  // Inline mode - just the PDF content, no UI
  if (inline) {
    return (
      <div className="h-full w-full bg-zinc-800">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400 mb-3"></div>
            <div>Compiling LaTeX...</div>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-red-400 text-sm p-4">
            <AlertCircle className="w-8 h-8 mb-3" />
            <div className="font-semibold mb-2">LaTeX Compilation Failed</div>
            <div className="text-xs text-center max-w-md text-zinc-400">{error}</div>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="PDF Preview"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
            No PDF available
          </div>
        )}
      </div>
    );
  }

  // Full-screen overlay mode
  return (
    <div className="fixed inset-0 z-50 bg-zinc-900 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-zinc-700 rounded">
            <X className="h-5 w-5 text-white" />
          </button>
          <span className="text-white font-medium">{title}.pdf</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="p-2 hover:bg-zinc-700 rounded">
            <ZoomOut className="h-4 w-4 text-white" />
          </button>
          <span className="text-white text-sm w-16 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-2 hover:bg-zinc-700 rounded">
            <ZoomIn className="h-4 w-4 text-white" />
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 ml-4">
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-8 bg-zinc-700">
        {loading ? (
          <div className="text-white">Generating PDF...</div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="bg-white shadow-2xl"
            style={{
              width: `${8.5 * zoom}px`,
              height: `${11 * zoom}px`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
            }}
            title="PDF Preview"
          />
        ) : (
          <div className="text-red-400">Failed to generate PDF</div>
        )}
      </div>
    </div>
  );
}
