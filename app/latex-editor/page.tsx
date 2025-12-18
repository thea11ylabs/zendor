"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import Toolbar, { ViewMode } from "../../components/Toolbar";
import PDFPreview from "../../components/PDFPreview";
import LaTeXPreview from "../../components/LaTeXPreview";
import CommentSidebar, { Comment } from "../../components/CommentSidebar";
import CitationManager from "../../components/CitationManager";
import { SimpleChatPanel } from "../../components/SimpleChatPanel";
import MiniNotes from "../../components/MiniNotes";
import MiniTaskTracker from "../../components/MiniTaskTracker";
import { getCitations } from "../../lib/citations";

const MarkdownEditor = dynamic(
  () => import("../../components/MarkdownEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-zinc-500">
        Loading editor...
      </div>
    ),
  }
);

const DEFAULT_LATEX = String.raw`\documentclass{article}
\usepackage{amsmath}

\title{LaTeX Demo}
\author{Author Name}

\begin{document}

\maketitle

\begin{abstract}
This is a test document for the LaTeX preview.
\end{abstract}

\section{Basic Math}

Inline math: $x^2 + y^2 = z^2$

Display math with equation:

\begin{equation}
E = mc^2
\end{equation}

Display math with brackets:

\[
a^2 + b^2 = c^2
\]

Display math with double dollars:

$$\frac{a}{b} = \frac{c}{d}$$

\section{More Math}

Greek letters: $\alpha, \beta, \gamma$

Fractions: $\frac{1}{2}$

Square root: $\sqrt{2}$

\section{Text Formatting}

You can use \textbf{bold text}, \textit{italic text}, and \texttt{monospace}.

\section{Lists}

\begin{itemize}
\item First item
\item Second item
\end{itemize}

\begin{enumerate}
\item One
\item Two
\end{enumerate}

\end{document}
`;

const STORAGE_KEY = "zendor-latex-document";
const NAME_KEY = "zendor-latex-document-name";

const latexStorage =
  typeof window === "undefined"
    ? undefined
    : createJSONStorage<string>(() => localStorage);

const latexContentAtom = atomWithStorage<string>(
  STORAGE_KEY,
  DEFAULT_LATEX,
  latexStorage,
  { getOnInit: true }
);

const latexNameAtom = atomWithStorage<string>(
  NAME_KEY,
  "Untitled LaTeX Document",
  latexStorage,
  { getOnInit: true }
);

export default function LaTeXEditorPage() {
  const [content, setContent] = useAtom(latexContentAtom);
  const [documentName, setDocumentName] = useAtom(latexNameAtom);
  const [isSaved, setIsSaved] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [previewType, setPreviewType] = useState<"preview" | "pdf">("preview");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false);
  const [citationSidebarOpen, setCitationSidebarOpen] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [editorScrollPercent, setEditorScrollPercent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, []);

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      setIsSaved(false);
    },
    [setContent]
  );

  const handleNameChange = useCallback(
    (newName: string) => {
      setDocumentName(newName);
      setIsSaved(false);
    },
    [setDocumentName]
  );

  const handleSave = useCallback(() => {
    setIsSaved(true);
  }, []);

  // Autosave
  useEffect(() => {
    if (isSaved || isInitialMount.current) return;
    const timeoutId = setTimeout(() => {
      setIsSaved(true);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [content, documentName, isSaved]);

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

  // Keyboard shortcuts
  useEffect(() => {
    let lastShiftTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }

      // Double Shift to open chat
      if (e.key === "Shift") {
        const now = Date.now();
        if (now - lastShiftTime < 500) {
          // Double shift detected within 500ms
          e.preventDefault();
          setChatSidebarOpen(true);
          lastShiftTime = 0; // Reset
        } else {
          lastShiftTime = now;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <input
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
        onToggleComments={() => setCommentSidebarOpen(!commentSidebarOpen)}
        onToggleCitations={() => setCitationSidebarOpen(!citationSidebarOpen)}
        onToggleChat={() => setChatSidebarOpen(!chatSidebarOpen)}
        onToggleNotes={() => setNotesOpen(!notesOpen)}
        onToggleTasks={() => setTasksOpen(!tasksOpen)}
        commentsOpen={commentSidebarOpen}
        citationsOpen={citationSidebarOpen}
        chatOpen={chatSidebarOpen}
        notesOpen={notesOpen}
        tasksOpen={tasksOpen}
      />

      <main className="flex-1 flex min-h-0">
        {viewMode === "editor" && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <MarkdownEditor
              key={`latex-editor-${documentName}`}
              initialValue={content}
              onChange={handleContentChange}
              mode="latex"
              onScrollPositionChange={setEditorScrollPercent}
            />
          </div>
        )}

        {viewMode === "doc" && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <LaTeXPreview content={content} />
          </div>
        )}

        {viewMode === "preview" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Preview/PDF Toggle */}
            <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setPreviewType("preview")}
                className={`px-2 py-1 text-xs rounded ${
                  previewType === "preview"
                    ? "bg-white dark:bg-zinc-700 shadow-sm"
                    : "hover:bg-zinc-200 dark:hover:bg-zinc-600"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setPreviewType("pdf")}
                className={`px-2 py-1 text-xs rounded ${
                  previewType === "pdf"
                    ? "bg-white dark:bg-zinc-700 shadow-sm"
                    : "hover:bg-zinc-200 dark:hover:bg-zinc-600"
                }`}
              >
                PDF
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {previewType === "preview" ? (
                <LaTeXPreview content={content} />
              ) : (
                <PDFPreview
                  content={content}
                  title={documentName}
                  onClose={() => setPreviewType("preview")}
                  inline
                />
              )}
            </div>
          </div>
        )}

        {viewMode === "split" && (
          <div className="grid grid-cols-2 w-full h-full min-h-0">
            <div className="border-r border-zinc-200 dark:border-zinc-800 min-h-0 overflow-hidden">
              <MarkdownEditor
                key={`latex-split-${documentName}`}
                initialValue={content}
                onChange={handleContentChange}
                mode="latex"
                onScrollPositionChange={setEditorScrollPercent}
              />
            </div>
            <div className="flex flex-col min-h-0 overflow-hidden">
              {/* Preview/PDF Toggle */}
              <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setPreviewType("preview")}
                  className={`px-2 py-1 text-xs rounded ${
                    previewType === "preview"
                      ? "bg-white dark:bg-zinc-700 shadow-sm"
                      : "hover:bg-zinc-200 dark:hover:bg-zinc-600"
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setPreviewType("pdf")}
                  className={`px-2 py-1 text-xs rounded ${
                    previewType === "pdf"
                      ? "bg-white dark:bg-zinc-700 shadow-sm"
                      : "hover:bg-zinc-200 dark:hover:bg-zinc-600"
                  }`}
                >
                  PDF
                </button>
              </div>
              {/* Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {previewType === "preview" ? (
                  <LaTeXPreview
                    content={content}
                    scrollPercent={editorScrollPercent}
                  />
                ) : (
                  <PDFPreview
                    content={content}
                    title={documentName}
                    onClose={() => setPreviewType("preview")}
                    inline
                  />
                )}
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

      <SimpleChatPanel
        isOpen={chatSidebarOpen}
        onClose={() => setChatSidebarOpen(false)}
        documentContent={content}
      />

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
    </div>
  );
}
