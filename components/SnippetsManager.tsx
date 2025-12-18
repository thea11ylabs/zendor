"use client";

import { useState, useMemo } from "react";
import { StickyNote, X, Plus, Trash2 } from "lucide-react";
import {
  getSnippets,
  deleteSnippet,
  addSnippet,
  updateSnippet,
  SNIPPET_COLORS,
  type Snippet,
} from "../lib/snippets";

interface SnippetsManagerProps {
  isOpen: boolean;
  onToggle: () => void;
}

const colorOptions: Snippet["color"][] = ["yellow", "blue", "green", "pink", "purple"];

export default function SnippetsManager({ isOpen, onToggle }: SnippetsManagerProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState<Snippet["color"]>("yellow");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const snippets = useMemo(() => getSnippets(), [refreshKey, isOpen]);
  const refreshSnippets = () => setRefreshKey((k) => k + 1);

  const handleAddSnippet = () => {
    if (!newContent.trim()) return;
    addSnippet({ content: newContent.trim(), color: newColor });
    setNewContent("");
    refreshSnippets();
  };

  const handleDeleteSnippet = (id: string) => {
    deleteSnippet(id);
    refreshSnippets();
  };

  const handleUpdateContent = (id: string, content: string) => {
    updateSnippet(id, { content });
    refreshSnippets();
  };

  const handleUpdateColor = (id: string, color: Snippet["color"]) => {
    updateSnippet(id, { color });
    refreshSnippets();
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700 shadow-xl transform transition-transform z-30 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Snippets
          </h2>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        {/* Add new snippet */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write a quick note..."
            className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-1">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-6 h-6 rounded-full border-2 ${
                    SNIPPET_COLORS[color].bg
                  } ${
                    newColor === color
                      ? "border-zinc-900 dark:border-zinc-100"
                      : "border-transparent"
                  }`}
                  title={color}
                />
              ))}
            </div>
            <button
              onClick={handleAddSnippet}
              disabled={!newContent.trim()}
              className="px-3 py-1 text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {/* Snippets list */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ height: "calc(100% - 180px)" }}
        >
          {snippets.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No snippets yet</p>
              <p className="text-xs mt-1">Add a quick note above</p>
            </div>
          ) : (
            snippets.map((snippet) => (
              <div
                key={snippet.id}
                className={`rounded-lg p-3 border ${SNIPPET_COLORS[snippet.color].bg} ${SNIPPET_COLORS[snippet.color].border}`}
              >
                <textarea
                  value={snippet.content}
                  onChange={(e) => handleUpdateContent(snippet.id, e.target.value)}
                  className="w-full bg-transparent text-sm text-zinc-800 dark:text-zinc-200 resize-none border-none outline-none"
                  rows={3}
                />
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
                  <div className="flex gap-1">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleUpdateColor(snippet.id, color)}
                        className={`w-5 h-5 rounded-full border ${
                          SNIPPET_COLORS[color].bg
                        } ${
                          snippet.color === color
                            ? "border-zinc-600 dark:border-zinc-300"
                            : "border-transparent"
                        }`}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => handleDeleteSnippet(snippet.id)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20"
          onClick={onToggle}
        />
      )}
    </>
  );
}
