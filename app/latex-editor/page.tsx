"use client";

import {
  useState,
  useCallback,
  useRef,
  useDeferredValue,
  Activity,
} from "react";
import type { MarkdownEditorHandle } from "@/components/editor/MarkdownEditor";
import type { PDFJSViewerHandle } from "@/components/pdf/PDFJSViewer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAtom } from "jotai";
import Toolbar, { ViewMode } from "../../components/Toolbar";
import PDFPreview from "../../components/pdf/PDFPreview";
import LaTeXPreview from "../../components/latex/LaTeXPreview";
import CommentSidebar, {
  Comment,
} from "../../components/editor/CommentSidebar";
import CitationManager from "../../components/editor/CitationManager";
import FigureManager from "../../components/editor/media/FigureManager";
import PythonRunner from "../../components/code/PythonRunner";
import { SimpleChatPanel } from "../../components/ai-chat/SimpleChatPanel";
import MiniNotes from "../../components/editor/productivity/MiniNotes";
import MiniTaskTracker from "../../components/editor/productivity/MiniTaskTracker";
import { getCitations } from "../../lib/citations";
import { getFigures } from "../../lib/figures";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  LayoutDashboard,
  Github,
  Sun,
  Moon,
} from "lucide-react";
import { useConvexAuth } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  latexContentAtom,
  latexNameAtom,
  DEFAULT_LATEX,
} from "@/stores/latex-atoms";
// Editor skeleton loader
const EditorSkeleton = () => {
  // Stable line widths
  const lineWidths = [75, 65, 80, 55, 70, 85, 60, 75, 50, 78, 68, 72];

  return (
    <div className="h-full w-full bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
        <div className="h-8 w-8 bg-zinc-300 dark:bg-zinc-700 rounded animate-pulse" />
        <div className="h-8 w-24 bg-zinc-300 dark:bg-zinc-700 rounded animate-pulse" />
      </div>

      {/* Editor content skeleton */}
      <div className="flex-1 p-4 space-y-3">
        {/* Line numbers + content */}
        {lineWidths.map((width, i) => (
          <div key={i} className="flex gap-6 items-start">
            <div className="w-8 h-4 bg-zinc-400 dark:bg-zinc-700 rounded animate-pulse opacity-50" />
            <div
              className="h-4 bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse"
              style={{
                width: `${width}%`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Status bar skeleton */}
      <div className="flex items-center justify-end px-4 py-1 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        <div className="h-3 w-20 bg-zinc-300 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
    </div>
  );
};

const MarkdownEditor = dynamic(
  () => import("@/components/editor/MarkdownEditor"),
  {
    ssr: false,
    loading: EditorSkeleton,
  }
);

export default function LaTeXEditorPage() {
  console.log("I'm in latex");
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [content, setContent] = useAtom(latexContentAtom);
  const [documentName, setDocumentName] = useAtom(latexNameAtom);

  // Deferred content for PDF - shows stale while compiling!
  const deferredContent = useDeferredValue(content);

  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [previewType, setPreviewType] = useState<"preview" | "pdf">("preview");
  const [invertPdfColors, setInvertPdfColors] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false);
  const [citationSidebarOpen, setCitationSidebarOpen] = useState(false);
  const [figureSidebarOpen, setFigureSidebarOpen] = useState(false);
  const [pythonSidebarOpen, setPythonSidebarOpen] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [editorScrollPercent, setEditorScrollPercent] = useState(0);
  const [editFigureId, setEditFigureId] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfViewerRef = useRef<PDFJSViewerHandle>(null);
  const editorRef = useRef<MarkdownEditorHandle>(null);

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      setIsSaved(false);
    },
    [setContent]
  );

  const handleLineClick = useCallback((lineNumber: number, linePercent: number) => {
    // Scroll PDF to the corresponding position
    if (pdfViewerRef.current && previewType === "pdf") {
      pdfViewerRef.current.scrollToPercent(linePercent);
    }
  }, [previewType]);

  const handlePdfDoubleClick = useCallback((percent: number) => {
    // Scroll editor to the corresponding position
    if (editorRef.current) {
      editorRef.current.scrollToPercent(percent);
    }
  }, []);

  const handleNameChange = useCallback(
    (newName: string) => {
      setDocumentName(newName);
      setIsSaved(false);
    },
    [setDocumentName]
  );

  const handleSave = useCallback(() => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaved(true);
      setIsSaving(false);
    }, 500);
  }, []);

  // Autosave
  // useEffect(() => {
  //   if (isSaved || isInitialMount.current) return;
  //   const timeoutId = setTimeout(() => {
  //     setIsSaved(true);
  //   }, 2000);
  //   return () => clearTimeout(timeoutId);
  // }, [content, documentName, isSaved]);

  const handleExport = useCallback(() => {
    const blob = new Blob([content], { type: "text/x-latex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentName.replace(/[^a-z0-9]/gi, "_")}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, documentName]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setContent(text);
          setDocumentName(file.name.replace(/\.tex$/, ""));
          setIsSaved(false);
        };
        reader.readAsText(file);
      }
      e.target.value = "";
    },
    [setContent, setDocumentName]
  );

  const handleNew = useCallback(() => {
    if (!isSaved) {
      const confirmed = window.confirm(
        "You have unsaved changes. Create new document?"
      );
      if (!confirmed) return;
    }
    setContent(DEFAULT_LATEX);
    setDocumentName("Untitled LaTeX Document");
    setIsSaved(false);
  }, [isSaved, setContent, setDocumentName]);

  const handleAddComment = useCallback(
    (selectedText: string, commentText: string) => {
      const newComment: Comment = {
        id: crypto.randomUUID(),
        selectedText,
        commentText,
        createdAt: Date.now(),
        resolved: false,
      };
      setComments((prev) => [...prev, newComment]);
      setSelectedText("");
    },
    []
  );

  const handleResolveComment = useCallback((id: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: true } : c))
    );
  }, []);

  const handleDeleteComment = useCallback((id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleInsertCitation = useCallback(
    (key: string) => {
      setContent((prev) => prev + `\\cite{${key}}`);
      setIsSaved(false);
    },
    [setContent]
  );

  const handleExportPDF = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  const handleInsertFigure = useCallback(
    (label: string) => {
      const figureCode = `\n\\begin{figure}[h]\n  \\centering\n  % Add your image here with \\includegraphics\n  \\caption{Figure caption}\n  \\label{fig:${label}}\n\\end{figure}\n`;
      setContent((prev) => prev + figureCode);
      setIsSaved(false);
    },
    [setContent]
  );

  const handlePythonOutput = useCallback(
    (output: string) => {
      setContent(
        (prev) =>
          prev +
          "\n\n% Python Output:\n% " +
          output.replace(/\n/g, "\n% ") +
          "\n"
      );
      setIsSaved(false);
    },
    [setContent]
  );

  // Keyboard shortcuts
  // useEffect(() => {
  //   console.log("Here being called")
  //   let lastShiftTime = 0;

  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     // Cmd+S to save
  //     if ((e.metaKey || e.ctrlKey) && e.key === "s") {
  //       e.preventDefault();
  //       handleSave();
  //     }

  //     // Double Shift to open chat
  //     if (e.key === "Shift") {
  //       const now = Date.now();
  //       if (now - lastShiftTime < 500) {
  //         // Double shift detected within 500ms
  //         e.preventDefault();
  //         setChatSidebarOpen(true);
  //         lastShiftTime = 0; // Reset
  //       } else {
  //         lastShiftTime = now;
  //       }
  //     }
  //   };

  //   window.addEventListener("keydown", handleKeyDown);
  //   return () => window.removeEventListener("keydown", handleKeyDown);
  // }, [handleSave]);

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <Input
        ref={fileInputRef}
        type="file"
        accept=".tex,.latex,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        documentName={documentName}
        onDocumentNameChange={handleNameChange}
        onSave={handleSave}
        onExport={handleExport}
        onImport={handleImport}
        onNew={handleNew}
        isSaved={isSaved}
        commentCount={comments.filter((c) => !c.resolved).length}
        citationCount={getCitations().length}
        figureCount={getFigures().length}
        onToggleComments={() => setCommentSidebarOpen(!commentSidebarOpen)}
        onToggleCitations={() => setCitationSidebarOpen(!citationSidebarOpen)}
        onToggleFigures={() => setFigureSidebarOpen(!figureSidebarOpen)}
        onTogglePython={() => setPythonSidebarOpen(!pythonSidebarOpen)}
        onToggleChat={() => setChatSidebarOpen(!chatSidebarOpen)}
        onToggleNotes={() => setNotesOpen(!notesOpen)}
        onToggleTasks={() => setTasksOpen(!tasksOpen)}
        onExportPDF={handleExportPDF}
        commentsOpen={commentSidebarOpen}
        citationsOpen={citationSidebarOpen}
        figuresOpen={figureSidebarOpen}
        pythonOpen={pythonSidebarOpen}
        chatOpen={chatSidebarOpen}
        notesOpen={notesOpen}
        tasksOpen={tasksOpen}
        isAuthenticated={isAuthenticated}
        user={
          user
            ? {
                login: user.name,
                name: user.name,
                avatar_url: user.image || "",
              }
            : null
        }
        isSaving={isSaving}
        onLogin={() => router.push("/sign-in")}
        hasDocumentId={false}
      />

      {/* Scratch Mode Banner - LaTeX documents are always scratch mode */}
      <div className="bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
                Scratch Mode - Changes saved to browser only
              </p>
              <p className="text-xs text-violet-700 dark:text-violet-300">
                Your work is stored locally and may be lost if you clear browser
                data.
              </p>
            </div>
          </div>
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
            >
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
            >
              <Github className="w-4 h-4" />
              Sign In
            </Link>
          )}
        </div>
      </div>

      <main className="flex-1 flex min-h-0">
        {viewMode === "editor" && (
          <div className="flex-1 min-h-0">
            <MarkdownEditor
              ref={editorRef}
              key={`latex-editor-${documentName}`}
              initialValue={content}
              onChange={handleContentChange}
              mode="latex"
              onScrollPositionChange={setEditorScrollPercent}
              onLineClick={handleLineClick}
            />
          </div>
        )}

        {viewMode === "doc" && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <LaTeXPreview content={content} />
          </div>
        )}

        {viewMode === "preview" && (
          <div className="flex-1 w-full flex flex-col min-h-0">
            {/* Preview/PDF Toggle */}
            <div className="shrink-0 w-full flex items-center justify-between px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  onClick={() => setPreviewType("preview")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    previewType === "preview"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  Preview
                </Button>
                <Button
                  type="button"
                  onClick={() => setPreviewType("pdf")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    previewType === "pdf"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  PDF
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {previewType === "pdf" && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPdfLoading}
                    className={`relative overflow-hidden px-3 py-1.5 text-xs font-medium text-white transition-all ${
                      isPdfLoading
                        ? "bg-[repeating-linear-gradient(45deg,rgba(22,101,52,0.6),rgba(22,101,52,0.6)_5px,rgba(255,255,255,0.15)_5px,rgba(255,255,255,0.15)_10px)] bg-[length:200%_200%]"
                        : "bg-green-700 hover:bg-green-600 dark:bg-green-800 dark:hover:bg-green-700"
                    }`}
                    style={isPdfLoading ? {
                      animation: "slideStripe 4s linear infinite"
                    } : {}}
                  >
                    {isPdfLoading ? "Compiling" : "Compile"}
                  </Button>
                )}
                {previewType === "pdf" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setInvertPdfColors(!invertPdfColors)}
                        className="p-2 rounded-lg transition-colors bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        title={
                          invertPdfColors
                            ? "Switch to Light Mode"
                            : "Switch to Dark Mode"
                        }
                      >
                        {invertPdfColors ? (
                          <Moon className="h-4 w-4" />
                        ) : (
                          <Sun className="h-4 w-4" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {invertPdfColors
                        ? "Switch to Light Mode"
                        : "Switch to Dark Mode"}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 w-full h-full overflow-hidden relative">
              <Activity mode={previewType === "preview" ? "visible" : "hidden"}>
                <div className="absolute inset-0">
                  <LaTeXPreview content={content} />
                </div>
              </Activity>

              <Activity mode={previewType === "pdf" ? "visible" : "hidden"}>
                <PDFPreview
                  ref={pdfViewerRef}
                  content={deferredContent}
                  title={documentName}
                  invertColors={invertPdfColors}
                  onLoadingChange={setIsPdfLoading}
                  onPdfDoubleClick={handlePdfDoubleClick}
                />
              </Activity>
            </div>
          </div>
        )}

        {viewMode === "split" && (
          <div className="flex w-full flex-1 min-h-0">
            <div className="flex-1 border-r border-zinc-200 dark:border-zinc-800 min-h-0 overflow-hidden">
              <MarkdownEditor
                ref={editorRef}
                key={`latex-split-${documentName}`}
                initialValue={content}
                onChange={handleContentChange}
                mode="latex"
                onScrollPositionChange={setEditorScrollPercent}
                onLineClick={handleLineClick}
              />
            </div>
            <div className="flex-1 flex flex-col min-h-0 bg-zinc-900">
              {/* Preview/PDF Toggle */}
              <div className="shrink-0 flex items-center justify-between px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewType("preview")}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      previewType === "preview"
                        ? "bg-green-800 text-white shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewType("pdf")}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      previewType === "pdf"
                        ? "bg-green-800 text-white shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    PDF
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {previewType === "pdf" && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPdfLoading}
                      className={`relative overflow-hidden px-3 py-1.5 text-xs font-medium text-white transition-all ${
                        isPdfLoading
                          ? "bg-[repeating-linear-gradient(45deg,rgba(22,101,52,0.6),rgba(22,101,52,0.6)_5px,rgba(255,255,255,0.15)_5px,rgba(255,255,255,0.15)_10px)] bg-[length:200%_200%]"
                          : "bg-green-700 hover:bg-green-600 dark:bg-green-800 dark:hover:bg-green-700"
                      }`}
                      style={isPdfLoading ? {
                        animation: "slideStripe 4s linear infinite"
                      } : {}}
                    >
                      {isPdfLoading ? "Compiling" : "Compile"}
                    </Button>
                  )}
                  {previewType === "pdf" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setInvertPdfColors(!invertPdfColors)}
                          className="p-2 rounded-lg transition-colors bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                          title={
                            invertPdfColors
                              ? "Switch to Light Mode"
                              : "Switch to Dark Mode"
                          }
                        >
                          {invertPdfColors ? (
                            <Moon className="h-4 w-4" />
                          ) : (
                            <Sun className="h-4 w-4" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {invertPdfColors
                          ? "Switch to Light Mode"
                          : "Switch to Dark Mode"}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 min-h-0 overflow-hidden relative bg-zinc-900">
                <Activity
                  mode={previewType === "preview" ? "visible" : "hidden"}
                >
                  <div className="absolute inset-0">
                    <LaTeXPreview
                      content={content}
                      scrollPercent={editorScrollPercent}
                    />
                  </div>
                </Activity>

                <Activity mode={previewType === "pdf" ? "visible" : "hidden"}>
                  <div className="absolute inset-0">
                    <PDFPreview
                      ref={pdfViewerRef}
                      content={deferredContent}
                      title={documentName}
                      invertColors={invertPdfColors}
                      onLoadingChange={setIsPdfLoading}
                      onPdfDoubleClick={handlePdfDoubleClick}
                    />
                  </div>
                </Activity>
              </div>
            </div>
          </div>
        )}
      </main>

      <CommentSidebar
        comments={comments}
        onAddComment={handleAddComment}
        onResolveComment={handleResolveComment}
        onDeleteComment={handleDeleteComment}
        selectedText={selectedText}
        isOpen={commentSidebarOpen}
        onToggle={() => setCommentSidebarOpen(!commentSidebarOpen)}
      />

      <CitationManager
        isOpen={citationSidebarOpen}
        onToggle={() => setCitationSidebarOpen(!citationSidebarOpen)}
        onInsertCitation={handleInsertCitation}
      />

      {chatSidebarOpen && (
        <SimpleChatPanel
          isOpen={chatSidebarOpen}
          onClose={() => setChatSidebarOpen(false)}
          documentContent={content}
        />
      )}

      <MiniNotes
        isOpen={notesOpen}
        onToggle={() => setNotesOpen(!notesOpen)}
        documentKey="latex"
      />

      <MiniTaskTracker
        isOpen={tasksOpen}
        onToggle={() => setTasksOpen(!tasksOpen)}
        documentKey="latex"
      />

      <FigureManager
        isOpen={figureSidebarOpen}
        onToggle={() => setFigureSidebarOpen(!figureSidebarOpen)}
        onInsertFigure={handleInsertFigure}
        editFigureId={editFigureId}
        onClearEditFigure={() => setEditFigureId(null)}
      />

      <PythonRunner
        isOpen={pythonSidebarOpen}
        onToggle={() => setPythonSidebarOpen(!pythonSidebarOpen)}
        onInsertOutput={handlePythonOutput}
      />
    </div>
  );
}
