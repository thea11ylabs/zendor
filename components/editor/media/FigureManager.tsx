"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Image as ImageIcon,
  X,
  Plus,
  Trash2,
  Edit2,
  Copy,
  ArrowLeft,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  getFigures,
  deleteFigure,
  addFigure,
  updateFigure,
  generateFigureLabel,
  type Figure,
} from "@/lib/figures";
import { Button } from "@/components/ui/button";
import {
  ExcalidrawImperativeAPI,
  AppState,
} from "@excalidraw/excalidraw/types";

// Import Excalidraw CSS
import "@excalidraw/excalidraw/index.css";

interface FigureManagerProps {
  isOpen: boolean;
  onToggle: () => void;
  onInsertFigure: (label: string) => void;
  editFigureId?: string | null;
  onClearEditFigure?: () => void;
}

export default function FigureManager({
  isOpen,
  onToggle,
  onInsertFigure,
  editFigureId: _editFigureId,
  onClearEditFigure,
}: FigureManagerProps) {
  void _editFigureId; // TODO: implement edit figure feature
  const [refreshKey, setRefreshKey] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFigure, setEditingFigure] = useState<Figure | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const figures = useMemo(() => getFigures(), [refreshKey, isOpen]);
  const refreshFigures = () => setRefreshKey((k) => k + 1);

  const handleNewFigure = () => {
    setEditingFigure(null);
    setEditorOpen(true);
  };

  const handleEditFigure = (figure: Figure) => {
    setEditingFigure(figure);
    setEditorOpen(true);
  };

  const handleSaveFigure = useCallback(
    (figureData: Omit<Figure, "id" | "createdAt" | "updatedAt">) => {
      if (editingFigure) {
        updateFigure(editingFigure.id, figureData);
      } else {
        addFigure(figureData);
      }
      setEditorOpen(false);
      refreshFigures();
    },
    [editingFigure]
  );

  const handleDeleteFigure = (id: string) => {
    if (confirm("Are you sure you want to delete this figure?")) {
      deleteFigure(id);
      refreshFigures();
    }
  };

  const handleCopyRef = (figure: Figure) => {
    const caption = figure.caption || "Figure";
    navigator.clipboard.writeText(`![${caption}](${figure.label})`);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingFigure(null);
    onClearEditFigure?.();
  };

  // Show full-screen editor
  if (editorOpen) {
    return (
      <ExcalidrawEditor
        editingFigure={editingFigure}
        onSave={handleSaveFigure}
        onClose={handleCloseEditor}
      />
    );
  }

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
            Figures
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewFigure}
              className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
            <Button
              variant="ghost"
              onClick={onToggle}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
            >
              <X className="h-5 w-5 text-zinc-500" />
            </Button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ height: "calc(100% - 60px)" }}
        >
          {figures.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No figures yet</p>
              <p className="text-xs mt-1">
                Click &quot;New&quot; to create a diagram
              </p>
            </div>
          ) : (
            figures.map((figure, index) => (
              <div
                key={figure.id}
                className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 space-y-2"
              >
                {/* Thumbnail */}
                {figure.thumbnail && (
                  <div className="bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={figure.thumbnail}
                      alt={figure.caption || figure.label || "Figure thumbnail"}
                      className="w-full h-24 object-contain"
                    />
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                      Figure {index + 1}: {figure.label}
                    </span>
                    {figure.caption && (
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                        {figure.caption}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 pt-1">
                  <button
                    onClick={() => onInsertFigure(figure.label)}
                    className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200"
                  >
                    Insert
                  </button>
                  <button
                    onClick={() => handleCopyRef(figure)}
                    className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                  <Button
                    variant="ghost"
                    onClick={() => handleEditFigure(figure)}
                    className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-400"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDeleteFigure(figure.id)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

// Dynamic import for Excalidraw (must be client-side only)
const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-[#121212]">
        <div className="text-zinc-400">Loading Excalidraw...</div>
      </div>
    ),
  }
);

interface ExcalidrawEditorProps {
  editingFigure: Figure | null;
  onSave: (figureData: Omit<Figure, "id" | "createdAt" | "updatedAt">) => void;
  onClose: () => void;
}

function ExcalidrawEditor({
  editingFigure,
  onSave,
  onClose,
}: ExcalidrawEditorProps) {
  const [caption, setCaption] = useState(editingFigure?.caption || "");
  const [label, setLabel] = useState(
    editingFigure?.label || generateFigureLabel()
  );
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return;

    const elements = excalidrawAPI.getSceneElements();
    const appState: Partial<AppState> = excalidrawAPI.getAppState();
    const files = excalidrawAPI.getFiles();

    // Generate thumbnail
    let thumbnail: string | undefined;
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: true,
          exportBackground: false,
          embedScene: true,
        },
        files,
        maxWidthOrHeight: 200,
      });
      thumbnail = await blobToBase64(blob);
    } catch (e) {
      console.error("Failed to generate thumbnail:", e);
    }

    onSave({
      label,
      caption,
      elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        gridSize: appState.gridSize,
      },
      files,
      thumbnail,
    });
  }, [excalidrawAPI, label, caption, onSave]);

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Button>
          <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-700" />
          <h1 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {editingFigure ? "Edit Figure" : "New Figure"}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">
              Label:
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="fig:diagram"
              className="px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">
              Caption:
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Figure description"
              className="px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 w-64"
            />
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-indigo-500 text-white rounded hover:bg-blue-700"
          >
            Save Figure
          </button>
        </div>
      </div>

      {/* Excalidraw Canvas */}
      <div className="flex-1 relative" style={{ height: "calc(100vh - 60px)" }}>
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={
            editingFigure
              ? {
                  elements: editingFigure.elements,
                  appState: editingFigure.appState,
                  files: editingFigure.files,
                }
              : undefined
          }
          theme="dark"
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveAsImage: false,
            },
          }}
        />
      </div>
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
