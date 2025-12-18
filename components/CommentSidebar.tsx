"use client";

import { useState } from "react";
import { MessageSquare, X, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export interface Comment {
  id: string;
  selectedText: string;
  commentText: string;
  createdAt: number;
  resolved: boolean;
}

interface CommentSidebarProps {
  comments: Comment[];
  onAddComment: (selectedText: string, commentText: string) => void;
  onResolveComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
  selectedText: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function CommentSidebar({
  comments,
  onAddComment,
  onResolveComment,
  onDeleteComment,
  selectedText,
  isOpen,
  onToggle,
}: CommentSidebarProps) {
  const [newComment, setNewComment] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [capturedText, setCapturedText] = useState("");

  // Capture selected text when it changes and sidebar is open
  const textToCapture = isOpen && selectedText ? selectedText : null;
  if (textToCapture && textToCapture !== capturedText && !capturedText) {
    setCapturedText(textToCapture);
  }

  const activeComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && capturedText.trim()) {
      onAddComment(capturedText, newComment.trim());
      setNewComment("");
      setCapturedText("");
    }
  };

  const handleCancel = () => {
    setCapturedText("");
    setNewComment("");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700 shadow-xl transform transition-transform z-30 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Comments
          </h2>
          <Button
            onClick={onToggle}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            <X className="h-5 w-5 text-zinc-500" />
          </Button>
        </div>

        <div
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4"
          style={{ height: "calc(100% - 60px)" }}
        >
          {/* Add Comment Form */}
          {capturedText && (
            <form
              onSubmit={handleSubmit}
              className="space-y-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
            >
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                New comment on:
              </div>
              <div className="text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded p-2 text-zinc-700 dark:text-zinc-300 line-clamp-3">
                &ldquo;{capturedText}&rdquo;
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your comment..."
                className="w-full p-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Comment
                </button>
              </div>
            </form>
          )}

          {!capturedText &&
            activeComments.length === 0 &&
            resolvedComments.length === 0 && (
              <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No comments yet</p>
                <p className="text-xs mt-1">
                  Select text in the editor, then open this panel
                </p>
              </div>
            )}

          {/* Active Comments */}
          {activeComments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Active ({activeComments.length})
              </h3>
              {activeComments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 space-y-2"
                >
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 italic">
                    &ldquo;{comment.selectedText}&rdquo;
                  </div>
                  <div className="text-sm text-zinc-900 dark:text-zinc-100">
                    {comment.commentText}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      {formatDate(comment.createdAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onResolveComment(comment.id)}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400"
                        title="Resolve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolved Comments */}
          {resolvedComments.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowResolved(!showResolved)}
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                {showResolved ? "▼" : "▶"} Resolved ({resolvedComments.length})
              </button>
              {showResolved &&
                resolvedComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 space-y-2 opacity-60"
                  >
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 italic line-through">
                      &ldquo;{comment.selectedText}&rdquo;
                    </div>
                    <div className="text-sm text-zinc-700 dark:text-zinc-300 line-through">
                      {comment.commentText}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">
                        {formatDate(comment.createdAt)}
                      </span>
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-20" onClick={onToggle} />
      )}
    </>
  );
}
