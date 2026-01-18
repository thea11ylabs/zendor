"use client";

import { useDeferredValue, useEffect, useMemo } from "react";
import { useStream } from "@/lib/streaming/useStream";
import { api } from "@/convex/_generated/api";
import type { StreamId } from "@/convex/utils";
import { MarkdownRenderer } from "./markdown-renderer";
import { ThinkingIndicator } from "./thinking-indicator";
import { ThinkingAccordion } from "./thinking-accordion";
import {
  parseThinkingSessions,
  type ThinkingSession,
} from "./thinking-sidebar";
import { toast } from "sonner";

interface StreamingMessageProps {
  streamId?: string;
  streamUrl?: URL;
  initialContent?: string;
  isStreaming?: boolean;
  onOpenThinkingSidebar?: (
    sessions: ThinkingSession[],
    totalTime: number
  ) => void;
  onComment?: (selectedText: string) => void;
  onAskAI?: (selectedText: string) => void;
}

// Wrapper that decides between streaming and static rendering
export function StreamingMessage({
  streamId,
  streamUrl,
  initialContent,
  onOpenThinkingSidebar,
  onComment,
  onAskAI,
}: StreamingMessageProps) {
  // Track if this message started as streaming (on initial mount)
  // This prevents switching to StaticMessage mid-stream when DB updates
  const wasStreaming = !!(streamId && streamUrl && !initialContent);

  // Keep using ActiveStreamMessage if we started streaming
  if (wasStreaming && streamId && streamUrl) {
    return (
      <ActiveStreamMessage
        streamId={streamId}
        streamUrl={streamUrl}
        onOpenThinkingSidebar={onOpenThinkingSidebar}
        onComment={onComment}
        onAskAI={onAskAI}
      />
    );
  }

  // Only StaticMessage for messages loaded from DB on page load
  if (initialContent) {
    return (
      <StaticMessage
        content={initialContent}
        onOpenThinkingSidebar={onOpenThinkingSidebar}
        onComment={onComment}
        onAskAI={onAskAI}
      />
    );
  }

  // Fallback - should not happen
  return null;
}

// Static message with thinking parsing (for completed messages)
function StaticMessage({
  content,
  onOpenThinkingSidebar,
  onComment,
  onAskAI,
}: {
  content: string;
  onOpenThinkingSidebar?: (
    sessions: ThinkingSession[],
    totalTime: number
  ) => void;
  onComment?: (selectedText: string) => void;
  onAskAI?: (selectedText: string) => void;
}) {
  const { sessions, totalTime, cleanContent } = useMemo(() => {
    return parseThinkingSessions(content);
  }, [content]);

  const handleOpenSidebar = () => {
    onOpenThinkingSidebar?.(sessions, totalTime);
  };

  return (
    <div>
      {sessions.length > 0 && (
        <ThinkingAccordion
          sessions={sessions}
          totalTime={totalTime}
          isStreaming={false}
          onOpenSidebar={handleOpenSidebar}
        />
      )}
      <MarkdownRenderer
        content={cleanContent}
        isStreaming={false}
        onComment={onComment}
        onAskAI={onAskAI}
      />
    </div>
  );
}

// Active streaming message
function ActiveStreamMessage({
  streamId,
  streamUrl,
  onOpenThinkingSidebar,
  onComment,
  onAskAI,
}: {
  streamId: string;
  streamUrl: URL;
  onOpenThinkingSidebar?: (
    sessions: ThinkingSession[],
    totalTime: number
  ) => void;
  onComment?: (selectedText: string) => void;
  onAskAI?: (selectedText: string) => void;
}) {
  const { text, status } = useStream(
    api.chatThread.getStreamBody,
    streamUrl,
    true,
    streamId as StreamId
  );

  const { sessions, totalTime, cleanContent } = useMemo(() => {
    if (!text) return { sessions: [], totalTime: 0, cleanContent: "" };
    return parseThinkingSessions(text);
  }, [text]);
  const deferredContent = useDeferredValue(cleanContent);

  useEffect(() => {
    if (status === "error") {
      toast.error("Failed to load response", {
        description: "Please try sending your message again.",
      });
    }
  }, [status]);

  // Show thinking indicator when pending/streaming with no content yet
  if ((status === "pending" || status === "streaming") && !text) {
    return <ThinkingIndicator title="Thinking" isThinking={true} />;
  }

  if (status === "error") {
    return null;
  }

  const isStreaming = status === "pending" || status === "streaming";

  const handleOpenSidebar = () => {
    onOpenThinkingSidebar?.(sessions, totalTime);
  };

  return (
    <div>
      {sessions.length > 0 && (
        <ThinkingAccordion
          sessions={sessions}
          totalTime={totalTime}
          isStreaming={isStreaming}
          onOpenSidebar={handleOpenSidebar}
        />
      )}
      <MarkdownRenderer
        content={deferredContent}
        isStreaming={isStreaming}
        onComment={onComment}
        onAskAI={onAskAI}
      />
    </div>
  );
}
