"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChatContainer } from "./chat-container";
import { ThinkingSidebar, type ThinkingSession } from "./thinking-sidebar";
import { useStreamChat } from "../../hooks/use-stream-chat";
import { useAtom } from "jotai";
import { useMutation } from "convex/react";
import type { FunctionReference } from "convex/server";
import {
  selectedModelAtom,
  reasoningEffortAtom,
  webSearchAtom,
  chatIdAtom,
  sessionIdAtom,
  sessionChatThreadsAtom,
} from "../../stores/atoms";
import type { Id } from "@/convex/_generated/dataModel";
import type { AttachedFile } from "./chat-input";

interface SimpleChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documentContent?: string;
}

export function SimpleChatPanel({
  isOpen,
  onClose,
  documentContent,
}: SimpleChatPanelProps) {
  const generateUploadUrlRef = "fileUploads:generateUploadUrl" as unknown as FunctionReference<
    "mutation",
    "public",
    Record<string, never>,
    string
  >;
  const getFileUrlRef = "fileUploads:getFileUrl" as unknown as FunctionReference<
    "mutation",
    "public",
    { storageId: Id<"_storage"> },
    string | null
  >;
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [reasoningEffort, setReasoningEffort] = useAtom(reasoningEffortAtom);
  const [webSearch, setWebSearch] = useAtom(webSearchAtom);
  const [chatId, setChatId] = useAtom(chatIdAtom);
  const [sessionId] = useAtom(sessionIdAtom);
  const [sessionThreads, setSessionThreads] = useAtom(sessionChatThreadsAtom);
  const [inputValue, setInputValue] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [thinkingSidebarOpen, setThinkingSidebarOpen] = useState(false);
  const [thinkingSessions, setThinkingSessions] = useState<ThinkingSession[]>(
    []
  );
  const [thinkingTotalTime, setThinkingTotalTime] = useState(0);
  const [showMacroDropdown, setShowMacroDropdown] = useState(false);

  // Resize functionality
  const [panelWidth, setPanelWidth] = useState(66.67); // Default 2/3 = ~66.67%
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    streamUrl,
    sendMessage,
    createChatAndSend,
    stop,
    threadIsStreaming: isStreaming,
    isLoadingChatHistory,
  } = useStreamChat({
    chatId: chatId,
    model: selectedModel,
    reasoningEffort:
      selectedModel.id === "gpt-5.1" ? reasoningEffort : undefined,
    webSearch,
  });
  const generateUploadUrl = useMutation(generateUploadUrlRef);
  const getFileUrl = useMutation(getFileUrlRef);

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      for (const file of prev) {
        if (file.preview) URL.revokeObjectURL(file.preview);
      }
      return [];
    });
  }, []);

  const uploadFiles = useCallback(async (pendingFiles: AttachedFile[]) => {
    if (pendingFiles.length === 0) return [];

    const uploaded = await Promise.all(
      pendingFiles.map(async (pendingFile) => {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": pendingFile.file.type || "application/octet-stream",
          },
          body: pendingFile.file,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${pendingFile.file.name}`);
        }

        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        const fileUrl = await getFileUrl({ storageId });

        return {
          name: pendingFile.file.name,
          type: pendingFile.file.type || "application/octet-stream",
          size: pendingFile.file.size,
          storageId,
          url: fileUrl ?? "",
        };
      })
    );

    return uploaded;
  }, [generateUploadUrl, getFileUrl]);

  // Handle opening thinking sidebar
  const handleOpenThinkingSidebar = useCallback(
    (sessions: ThinkingSession[], totalTime: number) => {
      setThinkingSessions(sessions);
      setThinkingTotalTime(totalTime);
      setThinkingSidebarOpen(true);
    },
    []
  );

  // Handle input change and detect @ commands
  const handleInputChange = useCallback(
    (value: string) => {
      // Keep marker in sync when user types
      const hasMarker = inputValue.includes("<Document></Document>");
      if (hasMarker && !value.includes("@document")) {
        // User is typing after inserting doc, preserve marker
        setInputValue(inputValue);
        setDisplayValue(value);
      } else {
        setInputValue(value);
        setDisplayValue(value);
      }

      // Check for @document command
      const lastWord = value.split(/\s/).pop() || "";
      if (lastWord.toLowerCase().startsWith("@document")) {
        setShowMacroDropdown(true);
      } else {
        setShowMacroDropdown(false);
      }
    },
    [inputValue]
  );

  // Handle macro selection
  const handleMacroSelect = useCallback(() => {
    if (!documentContent) return;

    // Replace @document with marker and hide it from display
    const beforeDoc = inputValue.substring(
      0,
      inputValue.toLowerCase().lastIndexOf("@document")
    );
    const afterDoc = inputValue.substring(
      inputValue.toLowerCase().lastIndexOf("@document") + 9
    ); // "@document".length

    setInputValue(beforeDoc + "<Document></Document>" + afterDoc);
    setDisplayValue(beforeDoc + afterDoc);
    setShowMacroDropdown(false);
  }, [inputValue, documentContent]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if ((!inputValue.trim() && files.length === 0) || isStreaming) {
      return;
    }

    // If @document is in the input and macro dropdown is open, insert document first
    if (showMacroDropdown && inputValue.includes("@document")) {
      handleMacroSelect();
      return;
    }

    let userMessage = inputValue.trim();

    // Replace <Document></Document> marker with actual document content before sending
    if (userMessage.includes("<Document></Document>") && documentContent) {
      userMessage = userMessage.replace(
        /<Document><\/Document>/g,
        `Context from document:\n\n${documentContent}\n\n---\n\n`
      );
    }

    try {
      let attachments: Array<{
        name: string;
        type: string;
        url: string;
        size?: number;
        storageId?: Id<"_storage">;
      }> = [];

      if (files.length > 0) {
        attachments = await uploadFiles(files);
      }

      if (!userMessage && attachments.length > 0) {
        userMessage = "Uploaded files";
      }

      setInputValue("");
      setDisplayValue("");
      clearFiles();

      // If no active chat, create a new one and send message
      if (!chatId) {
        const newChatId = await createChatAndSend(userMessage, attachments);
        if (newChatId && sessionId) {
          // Associate the new chat with the current session
          setSessionThreads((prev) => ({
            ...prev,
            [sessionId]: newChatId,
          }));
        }
      } else {
        // Use existing chat
        await sendMessage(userMessage, undefined, attachments);
      }
    } catch (error) {
      console.error("Failed to send message with attachments", error);
    }
  }, [
    inputValue,
    files,
    isStreaming,
    chatId,
    sessionId,
    sendMessage,
    createChatAndSend,
    showMacroDropdown,
    handleMacroSelect,
    documentContent,
    setSessionThreads,
    uploadFiles,
    clearFiles,
  ]);

  // Initialize chatId from session on mount and handle expiry
  useEffect(() => {
    if (!chatId && sessionId && sessionThreads[sessionId]) {
      // Check if session expired (8 hours)
      const sessionData = sessionStorage.getItem(`chat-session-id`);
      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          if (
            parsed.timestamp &&
            Date.now() - parsed.timestamp > 8 * 60 * 60 * 1000
          ) {
            // Session expired, clear session data
            sessionStorage.removeItem(`chat-session-id`);
            sessionStorage.removeItem(`session-chat-threads`);
            setSessionThreads({});
            return;
          }
        } catch {
          // If parsing fails, continue with existing data
        }
      }

      // Restore chatId from session
      setChatId(sessionThreads[sessionId]);
    }
  }, [chatId, sessionId, sessionThreads, setChatId, setSessionThreads]);

  // Handle resize start
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    // Add cursor style to body during resize
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;
      const newWidth = ((windowWidth - e.clientX) / windowWidth) * 100;

      // Clamp between 30% and 90%
      const clampedWidth = Math.min(Math.max(newWidth, 30), 90);
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  if (!isOpen) return null;

  return (
    <>
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full bg-background border-l border-border shadow-xl z-30 flex flex-col"
        style={{ width: `${panelWidth}%` }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-accent/50 transition-colors z-50"
        />

        <ChatContainer
          messages={messages.map((msg) => ({
            ...msg,
            content: msg.content.replace(
              /Context from document:\n\n[\s\S]*?\n\n---\n\n/g,
              ""
            ),
          }))}
          streamUrl={streamUrl}
          input={displayValue}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onStop={stop}
          isStreaming={isStreaming}
          isLoadingHistory={isLoadingChatHistory}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          reasoningEffort={reasoningEffort}
          onReasoningEffortChange={setReasoningEffort}
          files={files}
          onFilesChange={setFiles}
          webSearch={webSearch}
          onWebSearchChange={setWebSearch}
          onOpenThinkingSidebar={handleOpenThinkingSidebar}
          onClose={onClose}
        />

        {/* Macro dropdown - positioned above input */}
        {showMacroDropdown && documentContent && (
          <div className="absolute bottom-32 left-8 z-50">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl w-56">
              <button
                onClick={handleMacroSelect}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors rounded-lg"
              >
                <span className="text-base">📄</span>
                <span>Current Editor Docs</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <ThinkingSidebar
        sessions={thinkingSessions}
        totalTime={thinkingTotalTime}
        isOpen={thinkingSidebarOpen}
        onClose={() => setThinkingSidebarOpen(false)}
      />
    </>
  );
}
