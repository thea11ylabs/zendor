"use client";

import { useRef, useMemo } from "react";
import { ChatMessage } from "./message";
import { ChatInput, type AttachedFile } from "./chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type ModelOption, type ReasoningEffort } from "@/stores/atoms";
import { Header } from "./header";
import type { ThinkingSession } from "./thinking-sidebar";
import {
  ScrollCheckpoints,
  createMessageCheckpoints,
} from "@/components/ui/scroll-checkpoints";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streamId?: string;
  editVersion?: number;
}

interface ChatContainerProps {
  messages: Message[];
  streamUrl: URL | null;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  onClose?: () => void;
  isStreaming?: boolean;
  isLoadingHistory?: boolean;
  selectedModel: ModelOption;
  onModelChange: (modelId: ModelOption) => void;
  reasoningEffort?: ReasoningEffort;
  onReasoningEffortChange?: (effort: ReasoningEffort) => void;
  files?: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
  webSearch?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  onOpenThinkingSidebar?: (
    sessions: ThinkingSession[],
    totalTime: number
  ) => void;
}

export function ChatContainer({
  messages,
  streamUrl,
  input,
  onInputChange,
  onSubmit,
  onStop,
  onClose,
  isStreaming = false,
  isLoadingHistory = false,
  selectedModel,
  onModelChange,
  reasoningEffort,
  onReasoningEffortChange,
  files,
  onFilesChange,
  webSearch,
  onWebSearchChange,
  onOpenThinkingSidebar,
}: ChatContainerProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isEmpty = messages.length === 0 && !isLoadingHistory;

  // Create message checkpoints for scroll navigation
  const messageCheckpoints = useMemo(
    () => createMessageCheckpoints(messages),
    [messages]
  );

  return (
    <div className="flex flex-col h-full w-full flex-1">
      <Header modelName={selectedModel.id} onClose={onClose} />
      {/* Messages area */}
      <div className="flex-1 overflow-hidden relative">
        {isLoadingHistory ? (
          <LoadingState />
        ) : isEmpty ? (
          <NoMessagesSent />
        ) : (
          <>
            {/* Message scroll checkpoints */}
            <ScrollCheckpoints
              messages={messageCheckpoints}
              containerRef={scrollAreaRef}
            />
            <ScrollArea ref={scrollAreaRef} className="h-full">
              <div className="max-w-5xl mx-auto px-4 py-6">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    streamUrl={streamUrl}
                    onOpenThinkingSidebar={onOpenThinkingSidebar}
                  />
                ))}
                {/* Show thinking indicator when loading with no assistant response yet */}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        value={input}
        onChange={onInputChange}
        onSubmit={onSubmit}
        onStop={onStop}
        isLoading={isStreaming}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        reasoningEffort={reasoningEffort}
        onReasoningEffortChange={onReasoningEffortChange}
        files={files}
        onFilesChange={onFilesChange}
        webSearch={webSearch}
        onWebSearchChange={onWebSearchChange}
      />
    </div>
  );
}

function NoMessagesSent() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <h1 className="text-3xl font-medium text-foreground">
        What&apos;s on your mind today?
      </h1>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-foreground-muted rounded-full animate-pulse" />
        <div className="w-2 h-2 bg-foreground-muted rounded-full animate-pulse [animation-delay:150ms]" />
        <div className="w-2 h-2 bg-foreground-muted rounded-full animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  );
}
