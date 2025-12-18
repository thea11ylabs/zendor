"use client";

import {
  FileText,
  Download,
  Upload,
  Eye,
  Code,
  Columns,
  Save,
  Plus,
  FileEdit,
  MessageSquare,
  BookOpen,
  Image as ImageIcon,
  StickyNote,
  Terminal,
  FileType,
  Presentation,
  Sparkles,
  Github,
  Loader2,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export type ViewMode = "doc" | "editor" | "preview" | "split";
export type EditorMode = "markdown" | "latex";

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  editorMode?: EditorMode;
  onEditorModeChange?: (mode: EditorMode) => void;
  documentName: string;
  onDocumentNameChange: (name: string) => void;
  onSave: () => void;
  onExport: () => void;
  onExportPDF?: () => void;
  onImport: () => void;
  onNew: () => void;
  isSaved: boolean;
  commentCount?: number;
  citationCount?: number;
  figureCount?: number;
  snippetCount?: number;
  onToggleComments?: () => void;
  onToggleCitations?: () => void;
  onToggleFigures?: () => void;
  onToggleSnippets?: () => void;
  onTogglePython?: () => void;
  onToggleChat?: () => void;
  onToggleNotes?: () => void;
  onToggleTasks?: () => void;
  commentsOpen?: boolean;
  citationsOpen?: boolean;
  figuresOpen?: boolean;
  snippetsOpen?: boolean;
  pythonOpen?: boolean;
  chatOpen?: boolean;
  notesOpen?: boolean;
  tasksOpen?: boolean;
  // GitHub props
  isAuthenticated?: boolean;
  user?: GitHubUser | null;
  isSaving?: boolean;
  onLogin?: () => void;
}

export default function Toolbar({
  viewMode,
  onViewModeChange,
  editorMode = "markdown",
  onEditorModeChange,
  documentName,
  onDocumentNameChange,
  onSave,
  onExport,
  onExportPDF,
  onImport,
  onNew,
  isSaved,
  commentCount = 0,
  citationCount = 0,
  figureCount = 0,
  snippetCount = 0,
  onToggleComments,
  onToggleCitations,
  onToggleFigures,
  onToggleSnippets,
  onTogglePython,
  onToggleChat,
  onToggleNotes,
  onToggleTasks,
  commentsOpen = false,
  citationsOpen = false,
  figuresOpen = false,
  snippetsOpen = false,
  pythonOpen = false,
  chatOpen = false,
  notesOpen = false,
  tasksOpen = false,
  isAuthenticated = false,
  user,
  isSaving = false,
  onLogin,
}: ToolbarProps) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="h-5 w-5 text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
          <input
            type="text"
            value={documentName}
            onChange={(e) => onDocumentNameChange(e.target.value)}
            className="bg-transparent text-lg font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1 flex-1 min-w-0 max-w-md truncate"
            placeholder="Untitled Document"
          />
          {!isSaved && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
              (unsaved)
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          title="New Document"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={onImport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          title="Import Markdown"
        >
          <Upload className="h-4 w-4" />
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
          title={isAuthenticated ? "Save to GitHub" : "Save to Browser"}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          title="Export Markdown"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          onClick={onExportPDF}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          title="Export PDF (Print)"
        >
          <FileType className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />

        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange("doc")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "doc"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            title="Visual Doc Editor"
          >
            <FileEdit className="h-4 w-4" />
            <span className="hidden sm:inline">Doc</span>
          </button>
          <button
            onClick={() => onViewModeChange("editor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "editor"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            title="Markdown Editor Only"
          >
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Editor</span>
          </button>
          <button
            onClick={() => onViewModeChange("split")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "split"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            title="Split View"
          >
            <Columns className="h-4 w-4" />
            <span className="hidden sm:inline">Split</span>
          </button>
          <button
            onClick={() => onViewModeChange("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "preview"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            title="Preview Only"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>

        {/* Markdown/LaTeX Toggle */}
        {onEditorModeChange && (
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 ml-2">
            <button
              onClick={() => onEditorModeChange("markdown")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                editorMode === "markdown"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title="Markdown Mode"
            >
              MD
            </button>
            <button
              onClick={() => onEditorModeChange("latex")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                editorMode === "latex"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
              title="LaTeX Mode"
            >
              TeX
            </button>
          </div>
        )}

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />

        {/* Comments & Citations */}
        <button
          onClick={onToggleComments}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            commentsOpen
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
          title="Comments"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Comments</span>
          {commentCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {commentCount}
            </span>
          )}
        </button>
        <button
          onClick={onToggleCitations}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            citationsOpen
              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
          title="Citations"
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Citations</span>
          {citationCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {citationCount}
            </span>
          )}
        </button>
        <button
          onClick={onToggleFigures}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            figuresOpen
              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
          title="Figures"
        >
          <ImageIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Figures</span>
          {figureCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {figureCount}
            </span>
          )}
        </button>
        <button
          onClick={onToggleSnippets}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            snippetsOpen
              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
          title="Snippets"
        >
          <StickyNote className="h-4 w-4" />
          <span className="hidden sm:inline">Snippets</span>
          {snippetCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {snippetCount}
            </span>
          )}
        </button>
        <button
          onClick={onTogglePython}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            pythonOpen
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
          title="Python Runner"
        >
          <Terminal className="h-4 w-4" />
          <span className="hidden sm:inline">Python</span>
        </button>
        <button
          onClick={onToggleChat}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            chatOpen
              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
          title="AI Assistant"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">AI</span>
        </button>
        <button
          onClick={onToggleNotes}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            notesOpen
              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
          title="Notes"
        >
          <NotebookPen className="h-4 w-4" />
          <span className="hidden sm:inline">Notes</span>
        </button>
        <button
          onClick={onToggleTasks}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            tasksOpen
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
          title="Tasks"
        >
          <ListTodo className="h-4 w-4" />
          <span className="hidden sm:inline">Tasks</span>
        </button>

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />

        <Link
          href="/slides"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          title="Slide Editor"
        >
          <Presentation className="h-4 w-4" />
          <span className="hidden sm:inline">Slides</span>
        </Link>
        <Link
          href="/latex-editor"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          title="LaTeX Editor"
        >
          <FileType className="h-4 w-4" />
          <span className="hidden sm:inline">LaTeX</span>
        </Link>

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />

        {/* GitHub Auth Section */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              title="Dashboard"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="flex items-center gap-2 px-2">
              <Image
                src={user.avatar_url}
                alt={user.name || user.login}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                {user.login}
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            title="Sign in with GitHub"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
}
