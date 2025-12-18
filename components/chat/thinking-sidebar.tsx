"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/lib/markdown";
import { Button } from "@/components/ui/button";
export interface ThinkingSession {
  id: number;
  duration: number;
  content: string;
  isComplete: boolean;
}

interface ThinkingSidebarProps {
  sessions: ThinkingSession[];
  totalTime: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ThinkingSidebar({
  sessions,
  totalTime,
  isOpen,
  onClose,
}: ThinkingSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-border bg-background h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Thinking</span>
          <span className="text-xs text-foreground-muted">{totalTime}s</span>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          className="p-1 rounded hover:bg-background-hover text-foreground-muted hover:text-foreground"
        >
          <X className="size-5" />
        </Button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto">
        {sessions.map((session, index) => (
          <ThinkingSessionItem
            key={session.id}
            session={session}
            index={index}
            isLast={index === sessions.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function ThinkingSessionItem({
  session,
  index,
  isLast,
}: {
  session: ThinkingSession;
  index: number;
  isLast: boolean;
}) {
  // Extract first line as title (usually a summary of what the model is thinking about)
  const lines = session.content.trim().split("\n");
  const title = extractTitle(lines[0]) || `Thinking step ${index + 1}`;
  const body = lines.slice(1).join("\n").trim();

  return (
    <div className={cn("px-4 py-3", !isLast && "border-b border-border/50")}>
      {/* Session header */}
      <div className="flex items-start gap-3">
        {/* Simple bullet dot */}
        <div className="mt-2">
          <div className={cn("size-2 rounded-full", "bg-white")} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">{title}</span>
          {/* Session content - markdown rendered */}
          {body && (
            <div className="text-sm text-foreground-muted leading-relaxed mt-1">
              <Markdown
                content={body}
                className="[&_p]:mb-2 [&_p]:last:mb-0 [&_pre]:my-2 [&_ul]:my-2 [&_ol]:my-2"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Extract a meaningful title from the first line of thinking content
function extractTitle(line: string): string {
  if (!line) return "";

  // Remove markdown bold markers
  let cleaned = line.replace(/\*\*/g, "").trim();

  // Truncate if too long
  if (cleaned.length > 50) {
    cleaned = cleaned.slice(0, 47) + "...";
  }

  return cleaned;
}

// Parse thinking sessions from streamed content
export function parseThinkingSessions(content: string): {
  sessions: ThinkingSession[];
  totalTime: number;
  cleanContent: string;
} {
  const sessions: ThinkingSession[] = [];
  let totalTime = 0;

  // Find all thinking markers
  const startRegex = /<!--THINKING_START:(\d+):(\d+)-->/g;
  const endRegex = /<!--THINKING_END:(\d+):(\d+):(\d+)-->/g;

  // Get all start positions
  const starts: { index: number; id: number; timestamp: number }[] = [];
  let match;
  while ((match = startRegex.exec(content)) !== null) {
    starts.push({
      index: match.index,
      id: parseInt(match[1]),
      timestamp: parseInt(match[2]),
    });
  }

  // Get all end positions
  const ends: {
    index: number;
    id: number;
    duration: number;
    totalTime: number;
    endIndex: number;
  }[] = [];
  while ((match = endRegex.exec(content)) !== null) {
    ends.push({
      index: match.index,
      id: parseInt(match[1]),
      duration: parseInt(match[2]),
      totalTime: parseInt(match[3]),
      endIndex: match.index + match[0].length,
    });
  }

  // Build ranges to remove (start marker + content + end marker)
  const rangesToRemove: { start: number; end: number }[] = [];

  // Extract sessions
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = ends.find((e) => e.id === start.id);
    if (!end) {
      console.error(
        `ThinkingSidebar: Cannot find end marker for thinking session ${start.id}`
      );
      continue;
    }

    // Find the content between start and end (or end of string if still thinking)
    const startMarker = `<!--THINKING_START:${start.id}:${start.timestamp}-->`;
    const contentStart = start.index + startMarker.length;
    const contentEnd = end ? end.index : content.length;
    const sessionContent = content.slice(contentStart, contentEnd);

    sessions.push({
      id: start.id,
      duration: end?.duration || 0,
      content: sessionContent,
      isComplete: !!end,
    });

    if (end) {
      totalTime = end.totalTime;
      // Remove from start of THINKING_START to end of THINKING_END
      rangesToRemove.push({ start: start.index, end: end.endIndex });
    } else {
      // Still thinking - remove from start to end of current content
      rangesToRemove.push({ start: start.index, end: content.length });
    }
  }

  // Sort ranges in reverse order and remove from content
  rangesToRemove.sort((a, b) => b.start - a.start);
  let cleanContent = content;
  for (const range of rangesToRemove) {
    cleanContent =
      cleanContent.slice(0, range.start) + cleanContent.slice(range.end);
  }

  // Trim any leading/trailing whitespace from clean content
  cleanContent = cleanContent.trim();

  return { sessions, totalTime, cleanContent };
}
