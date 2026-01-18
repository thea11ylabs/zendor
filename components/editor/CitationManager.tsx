"use client";

import { useState, useMemo } from "react";
import { BookOpen, X, Plus, Trash2 } from "lucide-react";
import {
  getCitations,
  deleteCitation,
  importBibTeX,
} from "../../lib/citations";
import { Button } from "@/components/ui/button";

interface CitationManagerProps {
  isOpen: boolean;
  onToggle: () => void;
  onInsertCitation: (key: string) => void;
}

export default function CitationManager({
  isOpen,
  onToggle,
  onInsertCitation,
}: CitationManagerProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [bibInput, setBibInput] = useState("");

  // Get citations, refresh when key changes or sidebar opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const citations = useMemo(() => getCitations(), [refreshKey, isOpen]);

  const refreshCitations = () => setRefreshKey((k) => k + 1);

  const handleImport = () => {
    if (bibInput.trim()) {
      importBibTeX(bibInput);
      refreshCitations();
      setBibInput("");
      setShowImport(false);
    }
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
            Bibliography
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(!showImport)}
              className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <Plus className="h-4 w-4 inline mr-1" />
              BibTeX
            </button>
            <Button
              onClick={onToggle}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
            >
              <X className="h-5 w-5 text-zinc-500" />
            </Button>
          </div>
        </div>

        {/* BibTeX Import */}
        {showImport && (
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 space-y-2">
            <textarea
              value={bibInput}
              onChange={(e) => setBibInput(e.target.value)}
              placeholder="Paste BibTeX entries here..."
              className="w-full h-32 p-2 text-xs font-mono border rounded bg-white dark:bg-zinc-800 dark:border-zinc-700"
            />
            <button
              onClick={handleImport}
              disabled={!bibInput.trim()}
              className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              Import
            </button>
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ height: "calc(100% - 60px)" }}
        >
          {citations.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No citations yet</p>
            </div>
          ) : (
            citations.map((citation, index) => (
              <div
                key={citation.id}
                className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 space-y-1"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-mono text-green-600 dark:text-green-400">
                    [{index + 1}] {citation.key}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onInsertCitation(citation.key)}
                      className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200"
                    >
                      Insert
                    </button>
                    <Button
                      onClick={() => {
                        deleteCitation(citation.id);
                        refreshCitations();
                      }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {citation.title}
                </div>
                <div className="text-xs text-zinc-500">
                  {citation.author} ({citation.year})
                </div>
              </div>
            ))
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
