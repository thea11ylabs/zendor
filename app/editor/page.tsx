"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import Toolbar, { ViewMode } from "../../components/Toolbar";
import MarkdownPreview from "../../components/MarkdownPreview";
import CommentSidebar, { Comment } from "../../components/CommentSidebar";
import CitationManager from "../../components/CitationManager";
import FigureManager from "../../components/FigureManager";
import SnippetsManager from "../../components/SnippetsManager";
import PythonRunner from "../../components/PythonRunner";
import PDFPreview from "../../components/PDFPreview";
import { SimpleChatPanel } from "../../components/SimpleChatPanel";
import MiniNotes from "../../components/MiniNotes";
import MiniTaskTracker from "../../components/MiniTaskTracker";
import { useAuth } from "../../components/AuthProvider";
import { getCitations } from "../../lib/citations";
import { getFigures } from "../../lib/figures";
import { getSnippets } from "../../lib/snippets";

// Pure debounce utility
function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T & { cancel: () => void };
  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
  return debounced;
}

import type { MarkdownEditorHandle } from "../../components/MarkdownEditor";

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

const VisualEditor = dynamic(() => import("../../components/VisualEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-zinc-500">
      Loading editor...
    </div>
  ),
});

const DEFAULT_CONTENT = `# Welcome to Zendor

A simple, beautiful markdown editor with live preview and LaTeX support.

## Features

- **Split view** - See your markdown and preview side by side
- **Editor mode** - Focus on writing with a clean code editor
- **Preview mode** - See exactly how your document looks
- **Doc mode** - Google Docs-style visual editing
- **GitHub Flavored Markdown** - Tables, task lists, and more
- **LaTeX support** - Write beautiful math equations
- **Syntax highlighting** - Code blocks look great
- **Auto-save** - Your work is saved to browser storage

## Getting Started

Start typing in the editor to see your changes reflected in real-time.

### Code Example

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet("World");
\`\`\`

### LaTeX Examples

Write inline math like $E = mc^2$ or $\\alpha + \\beta = \\gamma$.

Display equations using double dollar signs:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

### Task List

- [x] Create markdown editor
- [x] Add live preview
- [x] Support GFM
- [x] Add LaTeX support
- [x] Add visual doc editor
- [ ] Add more features

### Table Example

| Feature | Status |
|---------|--------|
| Editor | Complete |
| Preview | Complete |
| Doc Mode | Complete |

> **Tip:** Use the toolbar above to switch between Doc, Editor, Split, and Preview modes.

---

Happy writing!
`;

const STORAGE_KEY = "zendor-document";
const NAME_KEY = "zendor-document-name";
const MODE_KEY = "zendor-editor-mode";
const COMMENTS_KEY = "zendor-comments";

const editorStringStorage =
  typeof window === "undefined"
    ? undefined
    : createJSONStorage<string>(() => localStorage);

const editorModeStorage =
  typeof window === "undefined"
    ? undefined
    : createJSONStorage<ViewMode>(() => localStorage);

const editorCommentsStorage =
  typeof window === "undefined"
    ? undefined
    : createJSONStorage<Comment[]>(() => localStorage);

const editorContentAtom = atomWithStorage<string>(
  STORAGE_KEY,
  DEFAULT_CONTENT,
  editorStringStorage,
  { getOnInit: true }
);

const editorNameAtom = atomWithStorage<string>(
  NAME_KEY,
  "Untitled Document",
  editorStringStorage,
  { getOnInit: true }
);

const editorModeAtom = atomWithStorage<ViewMode>(
  MODE_KEY,
  "split" as ViewMode,
  editorModeStorage,
  { getOnInit: true }
);

const editorCommentsAtom = atomWithStorage<Comment[]>(
  COMMENTS_KEY,
  [],
  editorCommentsStorage,
  { getOnInit: true }
);

function EditorPageContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, user, login } = useAuth();

  const [content, setContent] = useAtom(editorContentAtom);
  const [viewMode, setViewMode] = useAtom(editorModeAtom);
  const [documentName, setDocumentName] = useAtom(editorNameAtom);
  const [comments, setComments] = useAtom(editorCommentsAtom);

  const [isSaved, setIsSaved] = useState(true);
  const [selectedText, setSelectedText] = useState("");
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false);
  const [citationSidebarOpen, setCitationSidebarOpen] = useState(false);
  const [figureSidebarOpen, setFigureSidebarOpen] = useState(false);
  const [snippetsSidebarOpen, setSnippetsSidebarOpen] = useState(false);
  const [pythonSidebarOpen, setPythonSidebarOpen] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [editFigureId, setEditFigureId] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [previewType, setPreviewType] = useState<"markdown" | "pdf">(
    "markdown"
  );
  const [editorScrollPercent, setEditorScrollPercent] = useState(0);
  const [debouncedContent, setDebouncedContent] = useState(content);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<MarkdownEditorHandle>(null);

  // Debounced preview update
  const debouncedSetPreview = useMemo(
    () => debounce((c: string) => setDebouncedContent(c), 200),
    []
  );

  // Handle new document from URL params
  useEffect(() => {
    const isNew = searchParams.get("new") === "true";

    if (isNew) {
      // Start with a new document - use timeout to ensure editor is mounted
      const timeoutId = setTimeout(() => {
        editorRef.current?.setValue(DEFAULT_CONTENT);
        setContent(DEFAULT_CONTENT);
        setDebouncedContent(DEFAULT_CONTENT);
        setDocumentName("Untitled Document");
        setIsSaved(false);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, setContent, setDocumentName]);

  // Handle content changes - editor is uncontrolled but we sync state for other components
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent); // For VisualEditor, PDFPreview, ChatSidebar
      setIsSaved(false);
      debouncedSetPreview(newContent);
    },
    [debouncedSetPreview, setContent]
  );

  const handleNameChange = useCallback(
    (newName: string) => {
      setDocumentName(newName);
      setIsSaved(false);
    },
    [setDocumentName]
  );

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
    },
    [setViewMode]
  );

  // Save
  const handleSave = useCallback(() => {
    const currentContent = editorRef.current?.getValue() ?? content;
    setContent(currentContent);
    setIsSaved(true);
  }, [content, setContent]);

  // Export as .md file
  const handleExport = useCallback(() => {
    const currentContent = editorRef.current?.getValue() ?? "";
    const blob = new Blob([currentContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentName.replace(/[^a-z0-9]/gi, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [documentName]);

  // Import .md file
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
          editorRef.current?.setValue(text);
          setContent(text);
          setDebouncedContent(text);
          setDocumentName(file.name.replace(/\.md$/, ""));
          setIsSaved(false);
        };
        reader.readAsText(file);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [setContent, setDocumentName]
  );

  // New document
  const handleNew = useCallback(() => {
    if (!isSaved) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to create a new document?"
      );
      if (!confirmed) return;
    }
    editorRef.current?.setValue(DEFAULT_CONTENT);
    setContent(DEFAULT_CONTENT);
    setDebouncedContent(DEFAULT_CONTENT);
    setDocumentName("Untitled Document");
    setIsSaved(false);
  }, [isSaved, setContent, setDocumentName]);

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

  // Track text selection for comments
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || "";
      setSelectedText(text);
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, []);

  // Comment handlers
  const handleAddComment = useCallback(
    (selectedText: string, commentText: string) => {
      const newComment: Comment = {
        id: crypto.randomUUID(),
        selectedText,
        commentText,
        createdAt: Date.now(),
        resolved: false,
      };
      const newComments = [...comments, newComment];
      setComments(newComments);
      setSelectedText("");
    },
    [comments, setComments]
  );

  const handleResolveComment = useCallback(
    (id: string) => {
      const newComments = comments.map((c) =>
        c.id === id ? { ...c, resolved: true } : c
      );
      setComments(newComments);
    },
    [comments, setComments]
  );

  const handleDeleteComment = useCallback(
    (id: string) => {
      const newComments = comments.filter((c) => c.id !== id);
      setComments(newComments);
    },
    [comments, setComments]
  );

  const handleInsertCitation = useCallback(
    (key: string) => {
      setContent((prev) => prev + `\\cite{${key}}`);
      setIsSaved(false);
    },
    [setContent]
  );

  const handleInsertFigure = useCallback(
    (label: string) => {
      // Get the figure to use its caption
      const figures = getFigures();
      const figure = figures.find((f) => f.label === label);
      const caption = figure?.caption || "Figure";
      setContent((prev) => prev + `![${caption}](${label})`);
      setIsSaved(false);
    },
    [setContent]
  );

  const handleEditFigure = useCallback((figureId: string) => {
    setEditFigureId(figureId);
  }, []);

  // Export to PDF using browser print
  const handleExportPDF = useCallback(() => {
    setShowPrintView(true);
  }, []);

  // Insert Python output to document
  const handleInsertPythonOutput = useCallback(
    (output: string) => {
      setContent((prev) => prev + "\n\n```\n" + output + "\n```\n");
      setIsSaved(false);
    },
    [setContent]
  );

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      <Toolbar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
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
        snippetCount={getSnippets().length}
        onToggleComments={() => setCommentSidebarOpen(!commentSidebarOpen)}
        onToggleCitations={() => setCitationSidebarOpen(!citationSidebarOpen)}
        onToggleFigures={() => setFigureSidebarOpen(!figureSidebarOpen)}
        onToggleSnippets={() => setSnippetsSidebarOpen(!snippetsSidebarOpen)}
        onTogglePython={() => setPythonSidebarOpen(!pythonSidebarOpen)}
        onToggleChat={() => setChatSidebarOpen(!chatSidebarOpen)}
        onToggleNotes={() => setNotesOpen(!notesOpen)}
        onToggleTasks={() => setTasksOpen(!tasksOpen)}
        onExportPDF={handleExportPDF}
        commentsOpen={commentSidebarOpen}
        citationsOpen={citationSidebarOpen}
        figuresOpen={figureSidebarOpen}
        snippetsOpen={snippetsSidebarOpen}
        pythonOpen={pythonSidebarOpen}
        chatOpen={chatSidebarOpen}
        notesOpen={notesOpen}
        tasksOpen={tasksOpen}
        isAuthenticated={isAuthenticated}
        user={
          user
            ? {
                login: user.login || user.name,
                name: user.name,
                avatar_url: user.image || "",
              }
            : null
        }
        isSaving={false}
        onLogin={() => login("/editor")}
      />

      <main className="flex-1 flex min-h-0">
        {viewMode === "doc" && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <VisualEditor content={content} onChange={handleContentChange} />
          </div>
        )}

        {viewMode === "editor" && (
          <div className="flex-1 border-r border-zinc-200 dark:border-zinc-800 min-h-0 overflow-hidden">
            <MarkdownEditor
              ref={editorRef}
              initialValue={content}
              onChange={handleContentChange}
            />
          </div>
        )}

        {viewMode === "split" && (
          <div className="grid grid-cols-2 w-full h-full min-h-0">
            <div className="border-r border-zinc-200 dark:border-zinc-800 min-h-0 overflow-hidden">
              <MarkdownEditor
                ref={editorRef}
                initialValue={content}
                onChange={handleContentChange}
                onScrollPositionChange={setEditorScrollPercent}
              />
            </div>
            <div className="flex flex-col min-h-0 overflow-hidden">
              {/* Preview/PDF Toggle */}
              <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setPreviewType("markdown")}
                  className={`px-2 py-1 text-xs rounded ${
                    previewType === "markdown"
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
                {previewType === "markdown" ? (
                  <MarkdownPreview
                    content={debouncedContent}
                    onEditFigure={handleEditFigure}
                    scrollPercent={editorScrollPercent}
                  />
                ) : (
                  <PDFPreview
                    content={content}
                    title={documentName}
                    onClose={() => setPreviewType("markdown")}
                    inline
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === "preview" && (
          <div className="flex-1">
            <MarkdownPreview
              content={debouncedContent}
              onEditFigure={handleEditFigure}
            />
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

      <FigureManager
        isOpen={figureSidebarOpen}
        onToggle={() => setFigureSidebarOpen(!figureSidebarOpen)}
        onInsertFigure={handleInsertFigure}
        editFigureId={editFigureId}
        onClearEditFigure={() => setEditFigureId(null)}
      />

      <SnippetsManager
        isOpen={snippetsSidebarOpen}
        onToggle={() => setSnippetsSidebarOpen(!snippetsSidebarOpen)}
      />

      <PythonRunner
        isOpen={pythonSidebarOpen}
        onToggle={() => setPythonSidebarOpen(!pythonSidebarOpen)}
        onInsertOutput={handleInsertPythonOutput}
      />

      <SimpleChatPanel
        isOpen={chatSidebarOpen}
        onClose={() => setChatSidebarOpen(false)}
        documentContent={content}
      />

      <MiniNotes
        isOpen={notesOpen}
        onToggle={() => setNotesOpen(!notesOpen)}
        documentKey="editor"
      />

      <MiniTaskTracker
        isOpen={tasksOpen}
        onToggle={() => setTasksOpen(!tasksOpen)}
        documentKey="editor"
      />

      {/* PDF Preview */}
      {showPrintView && (
        <PDFPreview
          content={content}
          title={documentName}
          onClose={() => setShowPrintView(false)}
        />
      )}
    </div>
  );
}

// Wrapper component to handle Suspense boundary for useSearchParams
export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-500">Loading editor...</p>
          </div>
        </div>
      }
    >
      <EditorPageContent />
    </Suspense>
  );
}
