"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface MessageCheckpoint {
  id: string;
  preview: string;
}

interface ScrollCheckpointsProps {
  messages: MessageCheckpoint[];
  containerRef: React.RefObject<HTMLElement | null>;
  className?: string;
  maxVisible?: number;
}

export function ScrollCheckpoints({
  messages,
  containerRef,
  className,
  maxVisible = 10,
}: ScrollCheckpointsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Derive currentPage from activeIndex - no useState/useEffect needed
  const currentPage = Math.floor(activeIndex / maxVisible);
  const totalPages = Math.ceil(messages.length / maxVisible);

  const visibleMessages = useMemo(() => {
    const start = currentPage * maxVisible;
    return messages.slice(start, start + maxVisible);
  }, [messages, currentPage, maxVisible]);

  // Get the viewport element
  const getViewport = useCallback(() => {
    const root = containerRef.current;
    if (!root) return null;
    return (
      (root.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement) || root
    );
  }, [containerRef]);

  // Find the message element by id
  const getMessageElement = useCallback(
    (messageId: string) => {
      const viewport = getViewport();
      if (!viewport) return null;
      return viewport.querySelector(`[data-message-id="${messageId}"]`);
    },
    [getViewport]
  );

  // Scroll to a message
  const scrollToMessage = useCallback(
    (index: number) => {
      const message = messages[index];
      if (!message) {
        console.error(
          `ScrollCheckpoints: Cannot scroll to message - message at index ${index} not found`
        );
        return;
      }

      const element = getMessageElement(message.id);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    },
    [messages, getMessageElement]
  );

  // Track scroll position and update active message
  useEffect(() => {
    const root = containerRef.current;
    if (!root) {
      console.error(
        "ScrollCheckpoints: Cannot initialize observer - container ref is null"
      );
      return;
    }

    // Find the viewport element (Radix ScrollArea uses a viewport child)
    const container =
      (root.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement) || root;

    const handleScroll = () => {
      const containerHeight = container.clientHeight;

      // Find which message is most visible
      let closestIndex = 0;
      let closestDistance = Infinity;

      messages.forEach((message, index) => {
        const element = getMessageElement(message.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const relativeTop = rect.top - containerRect.top;
          const distance = Math.abs(relativeTop - containerHeight / 4);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        }
      });

      setActiveIndex(closestIndex);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages, containerRef, getMessageElement]);

  if (messages.length < 2) return null;

  // Navigate to previous page (click top dot when at top)
  const goToPrevPage = () => {
    if (currentPage > 0) {
      const prevPageLastIndex = currentPage * maxVisible - 1;
      scrollToMessage(prevPageLastIndex);
    }
  };

  // Navigate to next page (click bottom dot when at bottom)
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      const nextPageFirstIndex = (currentPage + 1) * maxVisible;
      scrollToMessage(nextPageFirstIndex);
    }
  };

  return (
    <div
      className={cn(
        "absolute right-4 top-0 bottom-0 flex flex-col items-center justify-center py-16 z-10",
        className
      )}
    >
      {/* Vertical line - spans full height */}
      <div
        className="absolute w-px bg-border/50"
        style={{
          top: "4rem",
          bottom: "4rem",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* Dots container - spreads across available height */}
      <div className="flex flex-col justify-between h-full max-h-[70vh]">
        {/* Previous page ellipsis indicator */}
        {currentPage > 0 && (
          <button
            onClick={goToPrevPage}
            className="flex flex-col gap-0.5 hover:opacity-100 opacity-40 transition-opacity z-10"
            aria-label="Go to previous messages"
          >
            <div className="size-1 rounded-full bg-foreground-muted" />
            <div className="size-1 rounded-full bg-foreground-muted" />
            <div className="size-1 rounded-full bg-foreground-muted" />
          </button>
        )}

        {/* Checkpoint dots */}
        {visibleMessages.map((message, localIndex) => {
          const globalIndex = currentPage * maxVisible + localIndex;
          const isActive = globalIndex === activeIndex;
          const isHovered = localIndex === hoveredIndex;

          // Fade effect - stronger at edges
          const total = visibleMessages.length;
          let opacity = 1;
          if (localIndex < 2) {
            opacity = 0.3 + localIndex * 0.35;
          } else if (localIndex > total - 3) {
            opacity = 0.3 + (total - 1 - localIndex) * 0.35;
          }

          return (
            <div
              key={message.id}
              className="relative flex items-center"
              style={{ opacity: isActive || isHovered ? 1 : opacity }}
            >
              {/* Dot */}
              <button
                onClick={() => scrollToMessage(globalIndex)}
                onMouseEnter={() => setHoveredIndex(localIndex)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  "h-4 w-2 rounded-sm transition-all duration-200 cursor-pointer z-10",
                  "hover:scale-150 focus:outline-none",
                  isActive
                    ? "bg-foreground scale-125"
                    : "bg-[#8e8e8e] hover:bg-[#b4b4b4]"
                )}
                aria-label={`Jump to message: ${message.preview}`}
              />

              {/* Tooltip on hover */}
              {isHovered && (
                <div
                  className={cn(
                    "absolute right-6 whitespace-nowrap max-w-[200px] truncate",
                    "bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg",
                    "pointer-events-none"
                  )}
                >
                  {message.preview}
                </div>
              )}
            </div>
          );
        })}

        {/* Next page ellipsis indicator */}
        {currentPage < totalPages - 1 && (
          <button
            onClick={goToNextPage}
            className="flex flex-col gap-0.5 hover:opacity-100 opacity-40 transition-opacity z-10"
            aria-label="Go to next messages"
          >
            <div className="size-1 rounded-full bg-foreground-muted" />
            <div className="size-1 rounded-full bg-foreground-muted" />
            <div className="size-1 rounded-full bg-foreground-muted" />
          </button>
        )}
      </div>
    </div>
  );
}

// Helper to create checkpoints from USER messages only
export function createMessageCheckpoints(
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>
): MessageCheckpoint[] {
  return messages
    .filter((msg) => msg.role === "user")
    .map((msg) => ({
      id: msg.id,
      preview:
        msg.content.slice(0, 40).replace(/\n/g, " ") +
        (msg.content.length > 40 ? "..." : ""),
    }));
}
