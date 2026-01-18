"use client";

import { useCallback, useRef, useState } from "react";
import { Markdown } from "../../lib/markdown";
import { Button } from "../ui/button";
import { MessageSquare, Sparkles } from "lucide-react";

interface Selection {
  text: string;
  rect: DOMRect;
}

interface Props {
  content: string;
  isStreaming?: boolean;
  onComment?: (selectedText: string) => void;
  onAskAI?: (selectedText: string) => void;
}

export function MarkdownRenderer({ content, isStreaming, onComment, onAskAI }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const handleMouseUp = useCallback(() => {
    // Don't show popup if no handlers
    if (!onComment && !onAskAI) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const container = containerRef.current;

    // Check if selection is within our container
    if (!container.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text || text.length < 3) {
      setSelection(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setSelection({
      text,
      rect: new DOMRect(
        rect.left - containerRect.left,
        rect.top - containerRect.top,
        rect.width,
        rect.height
      ),
    });
  }, [onComment, onAskAI]);

  const handleMouseDown = useCallback(() => {
    setSelection(null);
  }, []);

  const handleComment = () => {
    if (!selection || !onComment) return;
    onComment(selection.text);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleAskAI = () => {
    if (!selection || !onAskAI) return;
    onAskAI(selection.text);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  // Calculate safe popup position
  const getPopupStyle = () => {
    if (!selection) return {};

    const left = Math.max(0, selection.rect.left + selection.rect.width / 2 - 90);
    const top = selection.rect.top - 48;

    return {
      left,
      top: top < 0 ? selection.rect.bottom + 8 : top,
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
    >
      <Markdown content={content} isStreaming={isStreaming} />

      {/* Selection popup */}
      {selection && (onComment || onAskAI) && (
        <div
          className="absolute z-50 flex gap-1 animate-in fade-in-0 zoom-in-95 duration-150"
          style={getPopupStyle()}
        >
          {onComment && (
            <Button
              size="sm"
              variant="secondary"
              className="shadow-lg h-9 px-3 bg-background-secondary hover:bg-background-hover"
              onClick={handleComment}
            >
              <MessageSquare className="size-4 mr-1.5" />
              Comment
            </Button>
          )}
          {onAskAI && (
            <Button
              size="sm"
              className="shadow-lg h-9 px-3 bg-accent hover:bg-accent-hover"
              onClick={handleAskAI}
            >
              <Sparkles className="size-4 mr-1.5" />
              Ask AI
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
