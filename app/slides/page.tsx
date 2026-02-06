"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import dynamic from "next/dynamic";
import {
  Play,
  Download,
  ChevronLeft,
  Code,
  Plus,
  Trash2,
  ChevronRight,
  Eye,
  Columns2,
} from "lucide-react";
import Link from "next/link";
import MarkdownPreview from "@/components/editor/MarkdownPreview";
import LaTeXPreview from "@/components/latex/LaTeXPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { debounce } from "@/lib/utils";
import type { MarkdownEditorHandle } from "@/components/editor/MarkdownEditor";

const CodeMirrorEditor = dynamic(
  () => import("@/components/editor/MarkdownEditor"),
  {
    ssr: false,
    loading: () => <div className="h-full bg-zinc-900" />,
  }
);

type SlideSyntax = "slidev" | "typst" | "latex";
type SlideViewMode = "editor" | "split" | "preview";

interface Slide {
  id: string;
  syntax: SlideSyntax;
  source: string;
}

interface BeamerFrame {
  index: number;
  title: string;
  source: string;
  startLine: number;
  endLine: number;
}

interface SidebarEntry {
  key: string;
  slideIndex: number;
  frameIndex: number | null;
  syntax: SlideSyntax;
  label: string;
  orderLabel: string;
}

const STORAGE_KEY = "zendor-slides-deck-v1";
const BEAMER_TEMPLATE = `\\documentclass{beamer}
\\usetheme{Madrid}
\\title{Presentation Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\begin{frame}
\\titlepage
\\end{frame}

\\begin{frame}{Problem}
\\begin{itemize}
  \\item State the problem clearly
  \\item Add a key data point
  \\item Explain why now
\\end{itemize}
\\end{frame}

\\begin{frame}{Plan}
\\begin{columns}
\\column{0.48\\textwidth}
\\begin{block}{Track A}
\\begin{itemize}
  \\item Milestone 1
  \\item Milestone 2
\\end{itemize}
\\end{block}
\\column{0.48\\textwidth}
\\begin{alertblock}{Risk}
\\begin{itemize}
  \\item Constraint or risk here
\\end{itemize}
\\end{alertblock}
\\end{columns}
\\end{frame}

\\end{document}
`;

type DeckSave = (deck: {
  title: string;
  slides: Slide[];
  viewMode: SlideViewMode;
}) => void;

function getDefaultSlides(): Slide[] {
  return [
    {
      id:
        typeof crypto !== "undefined"
          ? crypto.randomUUID()
          : `slide-${Date.now()}`,
      syntax: "slidev",
      source: `# Presentation Title\n\n## Subtitle or author name\n`,
    },
    {
      id:
        typeof crypto !== "undefined"
          ? crypto.randomUUID()
          : `slide-${Date.now()}-2`,
      syntax: "slidev",
      source: `# Key Points\n\n- Simple source editing\n- Slidev-style markdown\n- Typst source (preview coming soon)\n`,
    },
  ];
}

function getStoredDeck(): {
  title: string;
  slides: Slide[];
  viewMode?: SlideViewMode;
} | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      title?: unknown;
      slides?: unknown;
      viewMode?: unknown;
    };
    if (!Array.isArray(parsed.slides)) return null;

    const slides = (parsed.slides as Array<Record<string, unknown>>)
      .map((s) => {
        const syntax =
          s.syntax === "typst" || s.syntax === "latex" ? s.syntax : "slidev";
        const source = typeof s.source === "string" ? s.source : "";
        const id =
          typeof s.id === "string"
            ? s.id
            : typeof crypto !== "undefined"
              ? crypto.randomUUID()
              : `slide-${Date.now()}`;
        return { id, syntax, source } satisfies Slide;
      })
      .filter(Boolean);

    return {
      title:
        typeof parsed.title === "string"
          ? parsed.title
          : "Untitled Presentation",
      slides: slides.length > 0 ? slides : getDefaultSlides(),
      viewMode:
        parsed.viewMode === "editor" ||
        parsed.viewMode === "preview" ||
        parsed.viewMode === "split"
          ? parsed.viewMode
          : undefined,
    };
  } catch {
    return null;
  }
}

function extractSlideLabel(slide: Slide): string {
  const src = slide.source.trim();
  if (!src)
    return slide.syntax === "typst"
      ? "(empty Typst)"
      : slide.syntax === "latex"
        ? "(empty LaTeX)"
        : "(empty Slidev)";

  const heading = src.match(/^#\s+(.+)$/m);
  if (heading?.[1]) return heading[1].trim();

  const firstLine = src.split("\n").find((l) => l.trim());
  return (firstLine || "Untitled").trim().slice(0, 48);
}

function extractBeamerFrames(source: string): BeamerFrame[] {
  const frameRegex = /\\begin\{frame\}(?:\[[^\]]*\])?(?:\{([^}]*)\})?([\s\S]*?)\\end\{frame\}/g;
  const frames: BeamerFrame[] = [];
  let match: RegExpExecArray | null;

  while ((match = frameRegex.exec(source)) !== null) {
    const fullFrame = match[0];
    const inlineTitle = (match[1] || "").trim();
    const body = (match[2] || "").trim();
    const bodyFrameTitle = body.match(/\\frametitle\{([^}]+)\}/)?.[1]?.trim();
    const firstContent = body
      .replace(/\\[a-zA-Z*]+(?:\[[^\]]*\])?(?:\{[^}]*\})?/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 42);

    const startOffset = match.index;
    const startLine = source.slice(0, startOffset).split("\n").length;
    const endLine = startLine + fullFrame.split("\n").length - 1;

    frames.push({
      index: frames.length,
      title: inlineTitle || bodyFrameTitle || firstContent || `Frame ${frames.length + 1}`,
      source: fullFrame,
      startLine,
      endLine,
    });
  }

  return frames;
}

function buildFramePreviewSource(slideSource: string, frameSource: string): string {
  const preambleMatch = slideSource.match(/^[\s\S]*?\\begin\{document\}/);
  const preamble = preambleMatch
    ? preambleMatch[0]
    : "\\documentclass{beamer}\n\\begin{document}";
  return `${preamble}\n\n${frameSource}\n\n\\end{document}`;
}

export default function SlidesPage() {
  const stored = useMemo(() => getStoredDeck(), []);
  const [slides, setSlides] = useState<Slide[]>(
    () => stored?.slides ?? getDefaultSlides()
  );
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentBeamerFrameIndex, setCurrentBeamerFrameIndex] = useState(0);
  const [title, setTitle] = useState(
    () => stored?.title ?? "Untitled Presentation"
  );
  const [viewMode, setViewMode] = useState<SlideViewMode>(
    () => stored?.viewMode ?? "split"
  );
  const editorRef = useRef<MarkdownEditorHandle | null>(null);
  const debouncedSaveRef = useRef<(DeckSave & { cancel: () => void }) | null>(
    null
  );

  const currentSlide = useMemo(
    () => slides[currentSlideIndex] ?? slides[0],
    [slides, currentSlideIndex]
  );
  const currentBeamerFrames = useMemo(
    () =>
      currentSlide?.syntax === "latex"
        ? extractBeamerFrames(currentSlide.source)
        : [],
    [currentSlide]
  );
  const effectiveBeamerFrameIndex = useMemo(() => {
    if (currentSlide.syntax !== "latex") return 0;
    if (currentBeamerFrames.length === 0) return 0;
    return Math.max(
      0,
      Math.min(currentBeamerFrameIndex, currentBeamerFrames.length - 1)
    );
  }, [currentSlide.syntax, currentBeamerFrames.length, currentBeamerFrameIndex]);
  const currentBeamerFrame = useMemo(
    () => currentBeamerFrames[effectiveBeamerFrameIndex] ?? null,
    [currentBeamerFrames, effectiveBeamerFrameIndex]
  );
  const sidebarEntries = useMemo<SidebarEntry[]>(() => {
    const entries: SidebarEntry[] = [];
    slides.forEach((slide, slideIndex) => {
      if (slide.syntax === "latex") {
        const frames = extractBeamerFrames(slide.source);
        if (frames.length > 0) {
          frames.forEach((frame, frameIndex) => {
            entries.push({
              key: `${slide.id}-frame-${frameIndex}`,
              slideIndex,
              frameIndex,
              syntax: slide.syntax,
              label: frame.title,
              orderLabel: `${slideIndex + 1}.${frameIndex + 1}`,
            });
          });
          return;
        }
      }

      entries.push({
        key: slide.id,
        slideIndex,
        frameIndex: null,
        syntax: slide.syntax,
        label: extractSlideLabel(slide),
        orderLabel: `${slideIndex + 1}`,
      });
    });
    return entries;
  }, [slides]);
  const currentSidebarIndex = useMemo(
    () =>
      sidebarEntries.findIndex((entry) => {
        if (entry.slideIndex !== currentSlideIndex) return false;
        if (entry.frameIndex === null) return currentSlide.syntax !== "latex";
        return entry.frameIndex === effectiveBeamerFrameIndex;
      }),
    [sidebarEntries, currentSlideIndex, currentSlide.syntax, effectiveBeamerFrameIndex]
  );
  const previewContent = useMemo(() => {
    if (currentSlide.syntax !== "latex" || !currentBeamerFrame) {
      return currentSlide.source;
    }
    return buildFramePreviewSource(currentSlide.source, currentBeamerFrame.source);
  }, [currentSlide, currentBeamerFrame]);

  useEffect(() => {
    if (!debouncedSaveRef.current) {
      debouncedSaveRef.current = debounce(
        (deck: { title: string; slides: Slide[]; viewMode: SlideViewMode }) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
        },
        500
      );
    }

    debouncedSaveRef.current?.({ title, slides, viewMode });
    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, [slides, title, viewMode]);

  const updateCurrentSlide = useCallback(
    (updates: Partial<Slide>) => {
      setSlides((prev) =>
        prev.map((s, idx) =>
          idx === currentSlideIndex ? { ...s, ...updates } : s
        )
      );
    },
    [currentSlideIndex]
  );

  const updateCurrentSlideSource = useCallback(
    (newSource: string) => {
      setSlides((prev) =>
        prev.map((s, idx) =>
          idx === currentSlideIndex ? { ...s, source: newSource } : s
        )
      );
    },
    [currentSlideIndex]
  );

  const addSlide = useCallback(() => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      syntax: "slidev",
      source: "# New Slide\n\n",
    };
    setSlides((prev) => [...prev, newSlide]);
    setCurrentSlideIndex(slides.length);
  }, [slides.length]);

  const deleteSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, idx) => idx !== currentSlideIndex));
    setCurrentSlideIndex((prev) =>
      Math.max(0, Math.min(prev, slides.length - 2))
    );
  }, [currentSlideIndex, slides.length]);

  const handleExport = () => {
    const data = JSON.stringify({ title, slides }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.slides.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const nextSlide = () => {
    if (currentSidebarIndex < 0 || currentSidebarIndex >= sidebarEntries.length - 1) {
      return;
    }
    const next = sidebarEntries[currentSidebarIndex + 1];
    setCurrentSlideIndex(next.slideIndex);
    setCurrentBeamerFrameIndex(next.frameIndex ?? 0);
  };

  const prevSlide = () => {
    if (currentSidebarIndex <= 0) return;
    const prev = sidebarEntries[currentSidebarIndex - 1];
    setCurrentSlideIndex(prev.slideIndex);
    setCurrentBeamerFrameIndex(prev.frameIndex ?? 0);
  };

  const handlePreviewClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const editor = editorRef.current;
      if (!editor) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const percent =
        rect.height > 0
          ? Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
          : 0;
      const totalLines = currentSlide.source.split("\n").length;
      let targetLine = Math.max(1, Math.round(percent * (totalLines - 1)) + 1);
      if (currentSlide.syntax === "latex" && currentBeamerFrame) {
        const frameLineSpan = Math.max(
          1,
          currentBeamerFrame.endLine - currentBeamerFrame.startLine
        );
        targetLine =
          currentBeamerFrame.startLine + Math.round(percent * frameLineSpan);
      }
      editor.scrollToLine(targetLine);
    },
    [currentSlide.source, currentSlide.syntax, currentBeamerFrame]
  );

  const handleInsertBeamerTemplate = useCallback(() => {
    if (currentSlide.syntax !== "latex") return;
    const shouldReplace =
      !currentSlide.source.trim() ||
      window.confirm("Replace current LaTeX source with Beamer starter template?");
    if (!shouldReplace) return;
    updateCurrentSlideSource(BEAMER_TEMPLATE);
    setCurrentBeamerFrameIndex(0);
  }, [currentSlide.syntax, currentSlide.source, updateCurrentSlideSource]);

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <Link
            href="/editor"
            className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 w-[360px] bg-transparent border-zinc-700 text-zinc-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "editor" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("editor")}
            title="Editor"
          >
            <Code />
          </Button>
          <Button
            variant={viewMode === "split" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("split")}
            title="Split"
          >
            <Columns2 />
          </Button>
          <Button
            variant={viewMode === "preview" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("preview")}
            title="Preview"
          >
            <Eye />
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="gap-2" title="Present (coming soon)">
            <Play className="h-4 w-4" />
            Present
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Slides Thumbnails */}
        <aside className="w-48 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="flex-1 p-2 overflow-y-auto">
            {sidebarEntries.map((entry) => {
              const isActive =
                entry.slideIndex === currentSlideIndex &&
                ((entry.frameIndex === null && currentSlide.syntax !== "latex") ||
                  entry.frameIndex === effectiveBeamerFrameIndex);
              return (
                <div
                  key={entry.key}
                  onClick={() => {
                    setCurrentSlideIndex(entry.slideIndex);
                    setCurrentBeamerFrameIndex(entry.frameIndex ?? 0);
                  }}
                  className={`mb-2 cursor-pointer rounded border-2 transition-colors ${
                    isActive
                      ? "border-blue-500"
                      : "border-transparent hover:border-zinc-600"
                  }`}
                >
                  <div className="aspect-video rounded overflow-hidden relative bg-zinc-950 border border-zinc-800">
                    <div className="absolute inset-0 p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[9px] text-zinc-500">
                          {entry.orderLabel}
                        </div>
                        <div className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                          {entry.syntax}
                        </div>
                      </div>
                      <div className="mt-1 text-[9px] leading-snug text-zinc-200 line-clamp-3">
                        {entry.label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-2 border-t border-zinc-800">
            <Button
              variant="ghost"
              onClick={addSlide}
              className="w-full justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Slide
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex overflow-hidden">
            {(viewMode === "editor" || viewMode === "split") && (
              <div
                className={
                  viewMode === "split"
                    ? "w-1/2 border-r border-zinc-800"
                    : "w-full"
                }
              >
                <CodeMirrorEditor
                  ref={editorRef}
                  key={currentSlide.id}
                  initialValue={currentSlide.source}
                  onChange={updateCurrentSlideSource}
                  mode={currentSlide.syntax === "latex" ? "latex" : "markdown"}
                />
              </div>
            )}

            {(viewMode === "preview" || viewMode === "split") && (
              <div className={viewMode === "split" ? "w-1/2" : "w-full"}>
                <div className="h-full flex items-center justify-center p-6 bg-zinc-950">
                  <div
                    className="shadow-2xl rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900"
                    style={{
                      width: "100%",
                      maxWidth: "960px",
                      aspectRatio: "16/9",
                    }}
                  >
                    {currentSlide.syntax === "slidev" ? (
                      <div className="h-full w-full overflow-hidden">
                        <div className="h-full w-full" onClick={handlePreviewClick}>
                          <MarkdownPreview
                            content={currentSlide.source}
                            className="h-full w-full"
                          />
                        </div>
                      </div>
                    ) : currentSlide.syntax === "latex" ? (
                      <div
                        className="h-full w-full overflow-auto p-6"
                        onClick={handlePreviewClick}
                      >
                        <LaTeXPreview content={previewContent} />
                      </div>
                    ) : (
                      <div className="h-full w-full overflow-auto p-6" onClick={handlePreviewClick}>
                        <div className="text-sm text-zinc-400 mb-3">
                          Typst preview isn&apos;t supported yet. You can edit
                          Typst source on the left.
                        </div>
                        <pre className="text-zinc-100 text-sm whitespace-pre-wrap font-mono bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                          {currentSlide.source || ""}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 py-3 bg-zinc-800 border-t border-zinc-700">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevSlide}
              disabled={currentSlideIndex === 0}
              className="text-zinc-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm text-zinc-400 min-w-[80px] text-center">
              {Math.max(1, currentSidebarIndex + 1)} / {sidebarEntries.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextSlide}
              disabled={currentSidebarIndex === sidebarEntries.length - 1}
              className="text-zinc-300"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            {slides.length > 1 && (
              <>
                <div className="w-px h-6 bg-zinc-700 mx-2" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={deleteSlide}
                  className="text-zinc-400 hover:text-red-400"
                  title="Delete Slide"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        <aside className="w-64 bg-zinc-900 border-l border-zinc-800 p-4">
          <h3 className="font-medium text-zinc-200 mb-4">Properties</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Syntax</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={
                    currentSlide.syntax === "slidev" ? "secondary" : "outline"
                  }
                  onClick={() => updateCurrentSlide({ syntax: "slidev" })}
                  className="w-full"
                >
                  Slidev
                </Button>
                <Button
                  variant={
                    currentSlide.syntax === "typst" ? "secondary" : "outline"
                  }
                  onClick={() => updateCurrentSlide({ syntax: "typst" })}
                  className="w-full"
                >
                  Typst
                </Button>
                <Button
                  variant={
                    currentSlide.syntax === "latex" ? "secondary" : "outline"
                  }
                  onClick={() => updateCurrentSlide({ syntax: "latex" })}
                  className="w-full col-span-2"
                >
                  LaTeX (Beamer)
                </Button>
              </div>
            </div>
            {currentSlide.syntax === "latex" && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleInsertBeamerTemplate}
              >
                Insert Beamer Starter Template
              </Button>
            )}
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Tips</label>
              <div className="text-xs text-zinc-500 space-y-2">
                <div>Slides are separated by the list on the left.</div>
                <div>
                  For now we support Slidev markdown, Typst, and LaTeX (Beamer).
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
