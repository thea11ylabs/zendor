"use client";

import { use, useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import dynamic from "next/dynamic";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Toolbar, { ViewMode } from "@/components/Toolbar";
import MarkdownPreview from "@/components/editor/MarkdownPreview";
import type { MarkdownEditorHandle } from "@/components/editor/MarkdownEditor";
import { debounce } from "@/lib/utils";

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
  () => import("@/components/editor/MarkdownEditor"),
  {
    ssr: false,
    loading: EditorSkeleton,
  }
);

const VisualEditor = dynamic(() => import("@/components/editor/VisualEditor"), {
  ssr: false,
  loading: EditorSkeleton,
});

// Generate random color for user
function generateUserColor() {
  const colors = [
    "#EF4444", // red
    "#F59E0B", // amber
    "#10B981", // emerald
    "#3B82F6", // blue
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#06B6D4", // cyan
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Generate user initials from name or email
function getUserInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    // Get initials from name (up to 2 characters)
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  if (email) {
    // Use first 2 characters of email
    return email.substring(0, 2).toUpperCase();
  }

  // Fallback to "AN" for anonymous
  return "AN";
}

export default function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const document = useQuery(api.documents.getByShareToken, {
    shareToken: token,
  });
  const updateSharedDocument = useMutation(api.documents.updateSharedDocument);
  const updateSharedDocumentTitle = useMutation(
    api.documents.updateSharedDocumentTitle
  );
  const updatePresence = useMutation(api.documents.updatePresence);
  const activeUsers = useQuery(
    api.documents.getPresence,
    document?._id ? { documentId: document._id } : "skip"
  );

  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [localTitle, setLocalTitle] = useState("");
  const [debouncedContent, setDebouncedContent] = useState("");
  const [editorScrollPercent, setEditorScrollPercent] = useState(0);
  const editorRef = useRef<MarkdownEditorHandle>(null);

  // User identity for presence - use real user data if available
  const [userColor] = useState(() => generateUserColor());

  // Derive user name and ID from current user (reactive to auth state)
  const userName = useMemo(() => {
    if (currentUser?.name) return currentUser.name;
    if (currentUser?.email) return currentUser.email.split("@")[0];
    return getUserInitials(undefined, undefined);
  }, [currentUser]);

  const userId = currentUser?._id;

  // Derive display values from document or local edits
  const documentName = localTitle || document?.title || "Untitled Document";
  const currentContent = debouncedContent || document?.content || "";

  // Debounced preview update - consistent delay
  const debouncedSetPreview = useMemo(
    () => debounce((c: string) => setDebouncedContent(c), 300),
    []
  );

  // Presence heartbeat
  useEffect(() => {
    if (!document?._id) return;

    // Initial presence
    updatePresence({
      documentId: document._id,
      userName,
      userColor,
      userId,
    });

    // Update every 10 seconds for more responsive presence
    const interval = setInterval(() => {
      updatePresence({
        documentId: document._id,
        userName,
        userColor,
        userId,
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [document?._id, userName, userColor, userId, updatePresence]);

  const handleContentChange = useCallback(
    async (newContent: string) => {
      if (!document || document.sharePermission !== "edit") return;

      debouncedSetPreview(newContent);

      try {
        await updateSharedDocument({
          shareToken: token,
          content: newContent,
          version: document.version,
        });
      } catch (error) {
        console.error("Failed to update document:", error);
      }
    },
    [document, token, updateSharedDocument, debouncedSetPreview]
  );

  const handleNameChange = useCallback(
    async (newName: string) => {
      if (!document || document.sharePermission !== "edit") return;

      setLocalTitle(newName);
      try {
        await updateSharedDocumentTitle({
          shareToken: token,
          title: newName,
        });
      } catch (error) {
        console.error("Failed to update title:", error);
      }
    },
    [document, token, updateSharedDocumentTitle]
  );

  if (document === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (document === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-6">
        <div className="max-w-md text-center">
          <FileText className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Document Not Found
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            This document doesn&apos;t exist or is no longer being shared.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = document.sharePermission === "edit";

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        documentName={documentName}
        onDocumentNameChange={canEdit ? handleNameChange : () => {}}
        onSave={() => {}}
        onExport={() => {}}
        onImport={() => {}}
        onNew={() => {}}
        isSaved={true}
        isAuthenticated={isAuthenticated}
        user={
          currentUser
            ? {
                name: currentUser.name,
                login: currentUser.name,
                avatar_url: currentUser.image || "",
              }
            : null
        }
        isSaving={false}
        onLogin={() => (window.location.href = "/sign-in")}
        hasDocumentId={false}
        // Hide irrelevant buttons for shared view
        commentCount={0}
        citationCount={0}
        figureCount={0}
        commentsOpen={false}
        citationsOpen={false}
        figuresOpen={false}
        pythonOpen={false}
        chatOpen={false}
        notesOpen={false}
        tasksOpen={false}
      />

      {/* Active Users Banner */}
      {activeUsers && activeUsers.length > 0 && (
        <div className="flex items-center gap-3 px-6 py-3 bg-violet-50 dark:bg-violet-900/30 border-b border-violet-200 dark:border-violet-800">
          <div className="flex items-center -space-x-2">
            {activeUsers.slice(0, 5).map((user) => (
              <div
                key={user._id}
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-white dark:ring-zinc-900 shadow-md cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: user.userColor }}
                title={user.userName}
              >
                {getUserInitials(user.userName, undefined)}
              </div>
            ))}
            {activeUsers.length > 5 && (
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-zinc-300 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 ring-2 ring-white dark:ring-zinc-900 shadow-md">
                +{activeUsers.length - 5}
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
              {activeUsers.length === 1 ? (
                <span>
                  <strong>{activeUsers[0].userName}</strong> is viewing this
                  document
                </span>
              ) : (
                <span>
                  <strong>{activeUsers.length} people</strong> are viewing this
                  document
                </span>
              )}
            </p>
          </div>
          {!canEdit && (
            <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              Read-only
            </span>
          )}
        </div>
      )}

      <main className="flex-1 flex min-h-0">
        {viewMode === "doc" && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <VisualEditor
              content={document.content}
              onChange={canEdit ? handleContentChange : () => {}}
            />
          </div>
        )}

        {viewMode === "editor" && (
          <div className="flex-1 border-r border-zinc-200 dark:border-zinc-800 min-h-0 overflow-hidden">
            <MarkdownEditor
              ref={editorRef}
              initialValue={document.content}
              onChange={canEdit ? handleContentChange : () => {}}
            />
          </div>
        )}

        {viewMode === "split" && (
          <div className="grid grid-cols-2 w-full h-full min-h-0">
            <div className="border-r border-zinc-200 dark:border-zinc-800 min-h-0 overflow-hidden">
              <MarkdownEditor
                ref={editorRef}
                initialValue={document.content}
                onChange={canEdit ? handleContentChange : () => {}}
                onScrollPositionChange={setEditorScrollPercent}
              />
            </div>
            <div className="min-h-0 overflow-auto">
              <MarkdownPreview
                content={currentContent}
                scrollPercent={editorScrollPercent}
              />
            </div>
          </div>
        )}

        {viewMode === "preview" && (
          <div className="flex-1">
            <MarkdownPreview content={currentContent} />
          </div>
        )}
      </main>
    </div>
  );
}
