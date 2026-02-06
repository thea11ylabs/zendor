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
  Terminal,
  FileType,
  Sparkles,
  Github,
  Loader,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Share2,
  Presentation,
  User,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

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
  onToggleComments?: () => void;
  onToggleCitations?: () => void;
  onToggleFigures?: () => void;
  onTogglePython?: () => void;
  onToggleChat?: () => void;
  onToggleNotes?: () => void;
  onToggleTasks?: () => void;
  onToggleShare?: () => void;
  commentsOpen?: boolean;
  citationsOpen?: boolean;
  figuresOpen?: boolean;
  pythonOpen?: boolean;
  chatOpen?: boolean;
  notesOpen?: boolean;
  tasksOpen?: boolean;
  // GitHub props
  isAuthenticated?: boolean;
  user?: GitHubUser | null;
  isSaving?: boolean;
  onLogin?: () => void;
  // Document ID for sharing
  hasDocumentId?: boolean;
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
  onToggleComments,
  onToggleCitations,
  onToggleFigures,
  onTogglePython,
  onToggleChat,
  onToggleNotes,
  onToggleTasks,
  onToggleShare,
  commentsOpen = false,
  citationsOpen = false,
  figuresOpen = false,
  pythonOpen = false,
  chatOpen = false,
  notesOpen = false,
  tasksOpen = false,
  isAuthenticated = false,
  user,
  isSaving = false,
  onLogin,
  hasDocumentId = false,
}: ToolbarProps) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="h-5 w-5 text-zinc-600 dark:text-zinc-400 shrink-0" />
          <Input
            type="text"
            value={documentName}
            onChange={(e) => onDocumentNameChange(e.target.value)}
            className="bg-transparent text-lg font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1 flex-1 min-w-0 max-w-md truncate"
            placeholder="Untitled Document"
          />
          {!isSaved && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
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
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors disabled:opacity-50"
          title={
            isSaving
              ? "Saving..."
              : isSaved
                ? "All changes saved"
                : "Unsaved changes"
          }
        >
          {isSaving ? (
            <>
              <Loader className="h-4 w-4 animate-spin text-violet-600" />
              <span className="text-xs text-violet-600 dark:text-violet-400">
                Saving...
              </span>
            </>
          ) : isSaved ? (
            <>
              <Save className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-600 dark:text-green-400">
                Saved
              </span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                Unsaved
              </span>
            </>
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
        {isAuthenticated && hasDocumentId && onToggleShare && (
          <button
            onClick={onToggleShare}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            title="Share Document"
          >
            <Share2 className="h-4 w-4" />
          </button>
        )}

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2" />

        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange("doc")}
            className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "doc"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            title="Visual Doc Editor"
          >
            <FileEdit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange("editor")}
            className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "editor"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            title="Markdown Editor Only"
          >
            <Code className="h-4 w-4" />
          </button>
          <Button
            variant="ghost"
            onClick={() => onViewModeChange("split")}
            className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "split"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            title="Split View"
          >
            <Columns className="h-4 w-4" />
          </Button>
          <button
            onClick={() => onViewModeChange("preview")}
            className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === "preview"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            title="Preview Only"
          >
            <Eye className="h-4 w-4" />
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleComments}
              className={`relative flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
                commentsOpen
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              {commentCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {commentCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Comments</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleCitations}
              className={`relative flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
                citationsOpen
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              {citationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {citationCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Citations</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleFigures}
              className={`relative flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
                figuresOpen
                  ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              {figureCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {figureCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Figures</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onTogglePython}
              className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
                pythonOpen
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <Terminal className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Python</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleChat}
              className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
                chatOpen
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>AI Assistant</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleNotes}
              className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
                notesOpen
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <NotebookPen className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Notes</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleTasks}
              className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
                tasksOpen
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <ListTodo className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Tasks</TooltipContent>
        </Tooltip>

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <div className="w-7 h-7 bg-linear-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.name || user.login}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name || user.login}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    @{user.login}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/dashboard")}
                className="cursor-pointer"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/editor")}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>New Document</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => window.open("https://github.com/thea11ylabs/zendor", "_blank")}
                className="cursor-pointer"
              >
                <Github className="mr-2 h-4 w-4" />
                <span>GitHub</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open("https://docs.zendor.dev", "_blank")}
                className="cursor-pointer"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Documentation</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => authClient.signOut()}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
