"use client";

import { useState, useRef, useCallback } from "react";
import { Type, Square, Circle, Trash2 } from "lucide-react";
import { Textarea } from "../ui/textarea";

export interface SlideElement {
  id: string;
  type: "text" | "shape" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: number;
    shapeType?: "rectangle" | "circle" | "rounded";
  };
}

interface SlideCanvasProps {
  elements: SlideElement[];
  onChange: (elements: SlideElement[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function SlideCanvas({
  elements,
  onChange,
  selectedId,
  onSelect,
}: SlideCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [_isResizing, setIsResizing] = useState(false);
  void _isResizing; // TODO: implement resize feature
  const [editingId, setEditingId] = useState<string | null>(null);

  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelect(null);
      setEditingId(null);
    }
  };

  const handleElementMouseDown = (
    e: React.MouseEvent,
    element: SlideElement
  ) => {
    e.stopPropagation();
    onSelect(element.id);

    const coords = getCanvasCoords(e);
    setDragOffset({
      x: coords.x - element.x,
      y: coords.y - element.y,
    });
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !selectedId) return;

      const coords = getCanvasCoords(e);
      const newX = Math.max(0, Math.min(100 - 20, coords.x - dragOffset.x));
      const newY = Math.max(0, Math.min(100 - 10, coords.y - dragOffset.y));

      onChange(
        elements.map((el) =>
          el.id === selectedId ? { ...el, x: newX, y: newY } : el
        )
      );
    },
    [isDragging, selectedId, dragOffset, elements, onChange, getCanvasCoords]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleDoubleClick = (e: React.MouseEvent, element: SlideElement) => {
    e.stopPropagation();
    if (element.type === "text") {
      setEditingId(element.id);
    }
  };

  const handleTextChange = (id: string, content: string) => {
    onChange(elements.map((el) => (el.id === id ? { ...el, content } : el)));
  };

  const handleResizeMouseDown = (
    e: React.MouseEvent,
    element: SlideElement,
    _corner: string
  ) => {
    e.stopPropagation();
    onSelect(element.id);
    setIsResizing(true);
    void _corner; // TODO: implement corner-based resizing
  };

  const _selectedElement = elements.find((el) => el.id === selectedId);
  void _selectedElement; // TODO: use for resize handles

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-zinc-900 overflow-hidden cursor-default"
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {elements.map((element) => (
        <div
          key={element.id}
          className={`absolute cursor-move select-none ${
            selectedId === element.id ? "ring-2 ring-blue-500" : ""
          }`}
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.width}%`,
            height: `${element.height}%`,
          }}
          onMouseDown={(e) => handleElementMouseDown(e, element)}
          onDoubleClick={(e) => handleDoubleClick(e, element)}
        >
          {element.type === "text" &&
            (editingId === element.id ? (
              <Textarea
                autoFocus
                value={element.content}
                onChange={(e) => handleTextChange(element.id, e.target.value)}
                onBlur={() => setEditingId(null)}
                className="w-full h-full bg-transparent text-zinc-100 resize-none outline-none p-2"
                style={{
                  fontSize: `${element.style.fontSize || 24}px`,
                  fontWeight: element.style.fontWeight || "normal",
                  color: element.style.color || "#f4f4f5",
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                className="w-full h-full p-2 overflow-hidden"
                style={{
                  fontSize: `${element.style.fontSize || 24}px`,
                  fontWeight: element.style.fontWeight || "normal",
                  color: element.style.color || "#f4f4f5",
                }}
              >
                {element.content || "Double-click to edit"}
              </div>
            ))}

          {element.type === "shape" && (
            <div
              className="w-full h-full"
              style={{
                backgroundColor: element.style.backgroundColor || "#3b82f6",
                borderRadius:
                  element.style.shapeType === "circle"
                    ? "50%"
                    : element.style.shapeType === "rounded"
                      ? "12px"
                      : "0",
              }}
            />
          )}

          {/* Resize handles for selected element */}
          {selectedId === element.id && (
            <>
              <div
                className="absolute -right-1 -bottom-1 w-3 h-3 bg-blue-500 cursor-se-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, element, "se")}
              />
              <div
                className="absolute -left-1 -bottom-1 w-3 h-3 bg-blue-500 cursor-sw-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, element, "sw")}
              />
              <div
                className="absolute -right-1 -top-1 w-3 h-3 bg-blue-500 cursor-ne-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, element, "ne")}
              />
              <div
                className="absolute -left-1 -top-1 w-3 h-3 bg-blue-500 cursor-nw-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, element, "nw")}
              />
            </>
          )}
        </div>
      ))}

      {/* Empty state */}
      {elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-600 pointer-events-none">
          Use the toolbar to add elements
        </div>
      )}
    </div>
  );
}

// Toolbar for adding elements
interface SlideToolbarProps {
  onAddElement: (
    type: "text" | "shape",
    shapeType?: "rectangle" | "circle" | "rounded"
  ) => void;
  onDelete: () => void;
  hasSelection: boolean;
}

export function SlideToolbar({
  onAddElement,
  onDelete,
  hasSelection,
}: SlideToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-800 border-b border-zinc-700">
      <button
        onClick={() => onAddElement("text")}
        className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
        title="Add Text"
      >
        <Type className="h-4 w-4" />
      </button>
      <button
        onClick={() => onAddElement("shape", "rectangle")}
        className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
        title="Add Rectangle"
      >
        <Square className="h-4 w-4" />
      </button>
      <button
        onClick={() => onAddElement("shape", "circle")}
        className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
        title="Add Circle"
      >
        <Circle className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-zinc-700 mx-1" />
      <button
        onClick={onDelete}
        disabled={!hasSelection}
        className="p-2 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400 disabled:opacity-50 disabled:hover:text-zinc-400"
        title="Delete Selected"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
