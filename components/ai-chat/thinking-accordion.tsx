"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Markdown } from "@/lib/markdown";
import type { ThinkingSession } from "./thinking-sidebar";

// Animated text with wave effect on each character
function AnimatedText({
  text,
  animate = true,
}: {
  text: string;
  animate?: boolean;
}) {
  return (
    <span className="inline-flex">
      {text.split("").map((char, i) => (
        <span
          key={i}
          className={animate ? "animate-char-wave" : ""}
          style={animate ? { animationDelay: `${i * 80}ms` } : undefined}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

interface ThinkingAccordionProps {
  sessions: ThinkingSession[];
  totalTime: number;
  isStreaming: boolean;
  onOpenSidebar: () => void;
}

export function ThinkingAccordion({
  sessions,
  totalTime,
  isStreaming,
  onOpenSidebar,
}: ThinkingAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (sessions.length === 0) return null;

  // Get the most recent session
  const latestSession = sessions[sessions.length - 1];
  const isThinking = isStreaming && !latestSession.isComplete;

  // Extract title from latest session
  const lines = latestSession.content.trim().split("\n");
  const title = extractTitle(lines[0]) || "Thinking...";

  const handleClick = () => {
    if (sessions.length > 1) {
      // Multiple sessions - open sidebar
      onOpenSidebar();
    } else {
      // Single session - toggle inline expansion
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="mb-4">
      {/* Accordion header */}
      <button
        onClick={handleClick}
        className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-secondary transition-colors"
      >
        <span className="font-medium">
          <AnimatedText
            text={
              isThinking
                ? title.endsWith("...")
                  ? title
                  : `${title}...`
                : `Thought for ${totalTime}s`
            }
            animate={isThinking}
          />
        </span>
        {sessions.length > 1 && (
          <span className="text-xs bg-background-secondary px-1.5 py-0.5 rounded">
            {sessions.length} steps
          </span>
        )}
        {isExpanded ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </button>

      {/* Expanded content - only show for single session */}
      {isExpanded && sessions.length === 1 && (
        <div className="mt-2 pl-6 text-sm text-foreground-muted leading-relaxed">
          {/* Title/summary */}
          {title && title !== "Thinking..." && (
            <p className="font-medium text-foreground-secondary mb-1">
              {title}
            </p>
          )}
          {/* Content - markdown rendered */}
          <Markdown
            content={lines.slice(1).join("\n").trim() || latestSession.content}
            className="[&_p]:mb-2 [&_p]:last:mb-0 [&_pre]:my-2 [&_ul]:my-2 [&_ol]:my-2"
          />
        </div>
      )}

      {/* For multiple sessions, show a preview */}
      {isExpanded && sessions.length > 1 && (
        <div className="mt-2 pl-6">
          <button
            onClick={onOpenSidebar}
            className="text-sm text-accent hover:text-accent-hover"
          >
            View all {sessions.length} thinking steps →
          </button>
        </div>
      )}
    </div>
  );
}

function extractTitle(line: string): string {
  if (!line) return "";
  let cleaned = line.replace(/\*\*/g, "").trim();
  if (cleaned.length > 60) {
    cleaned = cleaned.slice(0, 57) + "...";
  }
  return cleaned;
}
