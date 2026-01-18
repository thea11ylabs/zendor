"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  FileText,
  Github,
  Loader,
  AlertCircle,
  LayoutDashboard,
} from "lucide-react";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import Toolbar, { ViewMode } from "../../components/Toolbar";
import MarkdownPreview from "../../components/editor/MarkdownPreview";
import CommentSidebar, {
  type Comment,
} from "@/components/editor/CommentSidebar";
import CitationManager from "../../components/editor/CitationManager";
import FigureManager from "@/components/editor/media/FigureManager";
import PythonRunner from "../../components/code/PythonRunner";
import PDFPreview from "../../components/pdf/PDFPreview";
import { SimpleChatPanel } from "../../components/ai-chat/SimpleChatPanel";
import MiniNotes from "@/components/editor/productivity/MiniNotes";
import MiniTaskTracker from "../../components/editor/productivity/MiniTaskTracker";
import { ShareDialog } from "../../components/collab/ShareDialog";
import { useConvexAuth, useMutation } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useDocument } from "@/hooks/useDocument";
import { getCitations } from "../../lib/citations";
import { getFigures } from "../../lib/figures";
import { Input } from "@/components/ui/input";
import { debounce } from "@/lib/utils";

import type { MarkdownEditorHandle } from "../../components/editor/MarkdownEditor";

// Editor skeleton loader
const EditorSkeleton = () => (
  <div className="h-full w-full bg-zinc-50 dark:bg-zinc-950 p-4 space-y-3 animate-pulse">
    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3"></div>
  </div>
);

const MarkdownEditor = dynamic(
  () => import("../../components/editor/MarkdownEditor"),
  {
    ssr: false,
    loading: EditorSkeleton,
  }
);

const VisualEditor = dynamic(
  () => import("../../components/editor/VisualEditor"),
  {
    ssr: false,
    loading: EditorSkeleton,
  }
);

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

const MODE_KEY = "zendor-editor-mode";
const COMMENTS_KEY = "zendor-comments";

const editorModeStorage =
  typeof window === "undefined"
    ? undefined
    : createJSONStorage<ViewMode>(() => localStorage);

const editorCommentsStorage =
  typeof window === "undefined"
    ? undefined
    : createJSONStorage<Comment[]>(() => localStorage);

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
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const createDocument = useMutation(api.documents.create);

  // Get document ID from URL
  const docIdParam = searchParams.get("doc");
  const documentId = docIdParam ? (docIdParam as Id<"documents">) : null;

  // Use document hook for persistence (only if authenticated)
  const {
    document: doc,
    content,
    updateContent,
    updateTitle,
    save,
    isSaving,
    isSaved,
  } = useDocument(documentId, isAuthenticated);

  const [viewMode, setViewMode] = useAtom(editorModeAtom);
  const [comments, setComments] = useAtom(editorCommentsAtom);
  const [documentName, setDocumentName] = useState(
    doc?.title || "Untitled Document"
  );
  const [selectedText, setSelectedText] = useState("");
  const [commentSidebarOpen, setCommentSidebarOpen] = useState(false);
  const [citationSidebarOpen, setCitationSidebarOpen] = useState(false);
  const [figureSidebarOpen, setFigureSidebarOpen] = useState(false);
  const [pythonSidebarOpen, setPythonSidebarOpen] = useState(false);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editFigureId, setEditFigureId] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"markdown" | "pdf">(
    "markdown"
  );
  const [editorScrollPercent, setEditorScrollPercent] = useState(0);
  const [debouncedContent, setDebouncedContent] = useState(content);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<MarkdownEditorHandle>(null);

  // Debounced preview update - consistent delay
  const debouncedSetPreview = useMemo(
    () => debounce((c: string) => setDebouncedContent(c), 300),
    []
  );

  // Sync document title with local state
  useEffect(() => {
    if (doc?.title && documentName !== doc.title) {
      setDocumentName(doc.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.title]);

  // Handle new document from URL params
  useEffect(() => {
    const isNew = searchParams.get("new") === "true";

    if (isNew && isAuthenticated && !documentId) {
      // Create a new document
      createDocument({}).then((newDocId) => {
        router.replace(`/editor?doc=${newDocId}`);
      });
    } else if (isNew && !isAuthenticated) {
      // For unauthenticated users, just clear the URL param
      router.replace("/editor");
    }
  }, [searchParams, isAuthenticated, documentId, createDocument, router]);

  // Handle content changes - editor is uncontrolled but we sync state for other components
  const handleContentChange = useCallback(
    (newContent: string) => {
      updateContent(newContent);
      debouncedSetPreview(newContent);
    },
    [debouncedSetPreview, updateContent]
  );

  const handleNameChange = useCallback(
    (newName: string) => {
      setDocumentName(newName);
      updateTitle(newName);
    },
    [updateTitle]
  );

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
    },
    [setViewMode]
  );

  // Save
  const handleSave = useCallback(() => {
    save();
  }, [save]);

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
          updateContent(text);
          setDebouncedContent(text);
          const title = file.name.replace(/\.md$/, "");
          setDocumentName(title);
          updateTitle(title);
        };
        reader.readAsText(file);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [updateContent, updateTitle]
  );

  // New document
  const handleNew = useCallback(async () => {
    if (!isSaved) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to create a new document?"
      );
      if (!confirmed) return;
    }

    if (isAuthenticated) {
      // Create new document in Convex
      try {
        const newDocId = await createDocument({ content: DEFAULT_CONTENT });
        router.push(`/editor?doc=${newDocId}`);
      } catch (error) {
        console.error("Failed to create document:", error);
      }
    } else {
      // For non-authenticated users, just reset the editor
      editorRef.current?.setValue(DEFAULT_CONTENT);
      updateContent(DEFAULT_CONTENT);
      setDebouncedContent(DEFAULT_CONTENT);
      setDocumentName("Untitled Document");
      updateTitle("Untitled Document");
    }
  }, [
    isSaved,
    isAuthenticated,
    createDocument,
    router,
    updateContent,
    updateTitle,
  ]);

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
      updateContent(content + `\\cite{${key}}`);
    },
    [content, updateContent]
  );

  const handleInsertFigure = useCallback(
    (label: string) => {
      // Get the figure to use its caption
      const figures = getFigures();
      const figure = figures.find((f) => f.label === label);
      const caption = figure?.caption || "Figure";
      updateContent(content + `![${caption}](${label})`);
    },
    [content, updateContent]
  );

  const handleEditFigure = useCallback((figureId: string) => {
    setEditFigureId(figureId);
  }, []);

  // Export to PDF using browser print
  const handleExportPDF = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  // Insert Python output to document
  const handleInsertPythonOutput = useCallback(
    (output: string) => {
      updateContent(content + "\n\n```\n" + output + "\n```\n");
    },
    [content, updateContent]
  );

  // Show unauthorized message if trying to access a document that doesn't exist or user doesn't own
  if (documentId && !isLoading && doc === null && isAuthenticated) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-md text-center px-6">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Document Not Found
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            This document doesn&apos;t exist or you don&apos;t have access to
            it.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-500 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/editor"
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              New Document
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if trying to access a specific document without being authenticated
  if (documentId && !isLoading && !isAuthenticated) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-md text-center px-6">
          <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Sign In Required
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            You need to sign in to access this document.
          </p>
          <Link
            href={`/sign-in?redirect=/editor?doc=${documentId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-500 transition-colors"
          >
            <Github className="w-5 h-5" />
            Sign In with GitHub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <Input
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
        onToggleComments={() => setCommentSidebarOpen(!commentSidebarOpen)}
        onToggleCitations={() => setCitationSidebarOpen(!citationSidebarOpen)}
        onToggleFigures={() => setFigureSidebarOpen(!figureSidebarOpen)}
        onTogglePython={() => setPythonSidebarOpen(!pythonSidebarOpen)}
        onToggleChat={() => setChatSidebarOpen(!chatSidebarOpen)}
        onToggleNotes={() => setNotesOpen(!notesOpen)}
        onToggleTasks={() => setTasksOpen(!tasksOpen)}
        onToggleShare={() => setShareDialogOpen(true)}
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
        hasDocumentId={!!documentId}
      />

      {/* Scratch Mode Banner - Only show when no documentId */}
      {!documentId && (
        <div className="bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800 px-6 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
                  Scratch Mode - Changes saved to browser only
                </p>
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  Your work is stored locally and may be lost if you clear
                  browser data.
                </p>
              </div>
            </div>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
              >
                <LayoutDashboard className="w-4 h-4" />
                Create Document
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
              >
                <Github className="w-4 h-4" />
                Sign In to Save
              </Link>
            )}
          </div>
        </div>
      )}

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
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    previewType === "markdown"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setPreviewType("pdf")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    previewType === "pdf"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
                  <PDFPreview content={content} title={documentName} />
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === "preview" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Preview/PDF Toggle */}
            <div className="shrink-0 flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setPreviewType("markdown")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  previewType === "markdown"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setPreviewType("pdf")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  previewType === "pdf"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
                />
              ) : (
                <PDFPreview content={content} title={documentName} />
              )}
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

      {/* Share Dialog */}
      {shareDialogOpen && documentId && (
        <ShareDialog
          documentId={documentId}
          isPublic={doc?.isPublic}
          shareToken={doc?.shareToken}
          sharePermission={doc?.sharePermission}
          onClose={() => setShareDialogOpen(false)}
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
            <Loader className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-sm text-zinc-500">Loading editor...</p>
          </div>
        </div>
      }
    >
      <EditorPageContent />
    </Suspense>
  );
}
