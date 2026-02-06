"use client";

import { useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  Copy,
  Volume2,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  GitFork,
  Check,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import { StreamingMessage } from "./streaming-message";
import type { ThinkingSession } from "./thinking-sidebar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streamId?: string;
  editVersion?: number;
  attachments?: {
    name: string;
    type: string;
    url: string;
    size?: number;
  }[];
}

interface ChatMessageProps {
  message: Message;
  streamUrl?: URL | null;
  onFork?: () => void;
  onRegenerate?: () => void;
  onEdit?: (content: string) => void;
  onComment?: (selectedText: string) => void;
  onAskAI?: (selectedText: string) => void;
  showActions?: boolean;
  commentCount?: number;
  onOpenThinkingSidebar?: (
    sessions: ThinkingSession[],
    totalTime: number
  ) => void;
}

export function ChatMessage({
  message,
  streamUrl,
  onFork,
  onRegenerate,
  onEdit,
  onComment,
  onAskAI,
  showActions = true,
  commentCount = 0,
  onOpenThinkingSidebar,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(editContent);
    }
    setIsEditing(false);
  };

  const isUser = message.role === "user";
  // Message is streaming if it has a streamId but no content yet
  const isStreaming = !isUser && !!message.streamId && !message.content;
  const hasAttachments = (message.attachments?.length ?? 0) > 0;

  return (
    <div
      data-message-id={message.id}
      className={cn("group py-4", isUser ? "flex justify-end" : "")}
    >
      <div className={cn(isUser ? "max-w-[70%] ml-auto" : "")}>
        {/* Edit version indicator for user messages */}
        {isUser && message.editVersion && (
          <div className="flex justify-end mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-foreground-muted bg-background-secondary px-1.5 py-0.5 rounded">
              {message.editVersion}/{message.editVersion}
            </span>
          </div>
        )}
        {/* Message Content */}
        <div
          className={cn(
            isUser
              ? "rounded-[18px] px-4 py-1.5 bg-background-user-message border border-white/5 text-foreground whitespace-pre-wrap"
              : "px-4 py-1 text-foreground"
          )}
        >
          <div
            className={cn(
              "prose prose-invert max-w-none",
              isUser && "text-[15px]"
            )}
          >
            {/* Use StreamingMessage for streaming OR completed messages (handles thinking) */}
            {!isUser ? (
              <StreamingMessage
                streamId={message.streamId}
                streamUrl={streamUrl ?? undefined}
                initialContent={message.content}
                isStreaming={isStreaming}
                onOpenThinkingSidebar={onOpenThinkingSidebar}
                onComment={onComment}
                onAskAI={onAskAI}
              />
            ) : isEditing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  placeholder="add edited message"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="ring-0 min-h-[80px] bg-transparent border-none outline-none resize-none w-4xl"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-7 px-2 text-foreground-muted"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-7 px-3"
                  >
                    Send
                  </Button>
                </div>
              </div>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}

            {hasAttachments && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.attachments?.map((attachment) => {
                  const isImage = attachment.type.startsWith("image/");
                  return (
                    <a
                      key={`${message.id}-${attachment.url}`}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs hover:bg-black/30 transition-colors"
                    >
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="h-20 w-20 rounded object-cover mb-1"
                        />
                      ) : null}
                      <div className="max-w-40 truncate">{attachment.name}</div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && !isStreaming && message.content && (
          <div
            className={cn(
              "flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity",
              isUser && "justify-end"
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-foreground-muted hover:text-foreground"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>

            {isUser && onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-foreground-muted hover:text-foreground"
                    onClick={handleEdit}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            )}

            {!isUser && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-foreground-muted hover:text-foreground"
                    >
                      <Volume2 className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Read aloud</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-foreground-muted hover:text-foreground"
                    >
                      <ThumbsUp className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Good response</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-foreground-muted hover:text-foreground"
                    >
                      <ThumbsDown className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bad response</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-foreground-muted hover:text-foreground"
                      onClick={onRegenerate}
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Regenerate</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-foreground-muted hover:text-foreground"
                      onClick={onFork}
                    >
                      <GitFork className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fork from here</TooltipContent>
                </Tooltip>
              </>
            )}

            {/* Comment count indicator */}
            {commentCount > 0 && (
              <div className="flex items-center gap-1 ml-2 text-xs text-foreground-muted">
                <MessageSquare className="size-3" />
                {commentCount}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
