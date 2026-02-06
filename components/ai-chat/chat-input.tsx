"use client";

import { useRef, KeyboardEvent, ChangeEvent, ClipboardEvent, DragEvent } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ModelOption, AVAILABLE_MODELS, ReasoningEffort } from "@/stores/atoms";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Plus,
  Globe,
  Sparkles,
  AtSign,
  ArrowUp,
  Square,
  ChevronDown,
  Zap,
  Brain,
  Cpu,
  X,
  FileText,
} from "lucide-react";

export interface AttachedFile {
  id: string;
  file: File;
  preview?: string;
  textPreview?: string;
}

const MAX_ATTACHMENTS = 10;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "txt", "md", "json", "csv"]);
const TEXT_PREVIEW_EXTENSIONS = new Set(["txt", "md", "json", "csv"]);
const TEXT_PREVIEW_MAX_CHARS = 180;

function getFileExtension(name: string): string {
  const parts = name.split(".");
  if (parts.length <= 1) return "";
  return (parts.pop() || "").toLowerCase();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canPreviewText(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  const extension = getFileExtension(file.name);
  return TEXT_PREVIEW_EXTENSIONS.has(extension);
}

async function readTextPreview(file: File): Promise<string | undefined> {
  if (!canPreviewText(file)) return undefined;
  try {
    const raw = await file.text();
    const compact = raw.replace(/\s+/g, " ").trim();
    if (!compact) return undefined;
    return compact.slice(0, TEXT_PREVIEW_MAX_CHARS);
  } catch {
    return undefined;
  }
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  selectedModel?: ModelOption;
  onModelChange?: (modelId: ModelOption) => void;
  reasoningEffort?: ReasoningEffort;
  onReasoningEffortChange?: (effort: ReasoningEffort) => void;
  files?: AttachedFile[];
  onFilesChange?: (files: AttachedFile[]) => void;
  webSearch?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading = false,
  placeholder = "Ask anything",
  selectedModel = AVAILABLE_MODELS[0],
  onModelChange,
  reasoningEffort = "auto",
  onReasoningEffortChange,
  files = [],
  onFilesChange,
  webSearch = false,
  onWebSearchChange,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSubmit = value.trim().length > 0 || files.length > 0;

  const getModelIcon = (iconType: "zap" | "brain" | "cpu") => {
    switch (iconType) {
      case "zap":
        return <Zap className="size-3" />;
      case "brain":
        return <Brain className="size-3" />;
      case "cpu":
        return <Cpu className="size-3" />;
    }
  };

  const appendFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    const existingCount = files.length;
    if (existingCount >= MAX_ATTACHMENTS) return;

    const remainingSlots = MAX_ATTACHMENTS - existingCount;
    const validFiles = selectedFiles
      .filter((file) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          console.error(`File too large: ${file.name}`);
          return false;
        }

        if (file.type.startsWith("image/")) return true;

        const extension = getFileExtension(file.name);
        const isAllowed = extension ? ALLOWED_EXTENSIONS.has(extension) : false;
        if (!isAllowed) {
          console.error(`Unsupported file type: ${file.name}`);
        }
        return isAllowed;
      })
      .slice(0, remainingSlots);

    const newFiles: AttachedFile[] = await Promise.all(
      validFiles.map(async (file) => ({
        id: Math.random().toString(36).slice(2),
        file,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
        textPreview: await readTextPreview(file),
      }))
    );
    onFilesChange?.([...files, ...newFiles]);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    void appendFiles(selectedFiles);
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) {
      console.error(
        `ChatInput: Cannot remove file - file with ID ${id} not found`
      );
      return;
    }
    if (file?.preview) URL.revokeObjectURL(file.preview);
    onFilesChange?.(files.filter((f) => f.id !== id));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && canSubmit) {
        onSubmit();
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = Array.from(e.clipboardData.files || []);
    if (pastedFiles.length > 0) {
      void appendFiles(pastedFiles);
      e.preventDefault();
    }
  };

  const handleDrop = (e: DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    void appendFiles(droppedFiles);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-4">
      <div className="relative bg-background-secondary rounded-2xl border border-border-input">
        {/* Hidden file input */}
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.json,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* File previews */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {files.map((f) => (
              <div
                key={f.id}
                className="relative group border border-border rounded-lg bg-background-tertiary/40 p-2 min-w-[220px] max-w-[280px]"
              >
                {f.preview ? (
                  <div className="flex gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.preview}
                      alt={f.file.name}
                      className="h-16 w-16 object-cover rounded-lg border border-border shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs text-foreground truncate">
                        {f.file.name}
                      </div>
                      <div className="text-[10px] text-foreground-muted">
                        {formatFileSize(f.file.size)} · image
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="h-16 w-16 flex flex-col items-center justify-center bg-background-tertiary rounded-lg border border-border shrink-0">
                      <FileText className="size-5 text-foreground-muted" />
                      <span className="text-[10px] text-foreground-muted mt-1 truncate max-w-14 px-1 uppercase">
                        {getFileExtension(f.file.name) || "file"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-foreground truncate">
                        {f.file.name}
                      </div>
                      <div className="text-[10px] text-foreground-muted mb-1">
                        {formatFileSize(f.file.size)} ·{" "}
                        {f.file.type || "application/octet-stream"}
                      </div>
                      <div className="text-[11px] text-foreground-muted line-clamp-2">
                        {f.textPreview || "Preview available after upload."}
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  onClick={() => removeFile(f.id)}
                  className="absolute -top-1 -right-1 size-5 bg-background rounded-full border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          placeholder={placeholder}
          rows={1}
          className={cn(
            "w-full resize-none bg-transparent px-4 pt-4 text-foreground placeholder:text-foreground-placeholder focus:outline-none",
            "min-h-[56px] max-h-[200px]",
            files.length > 0 && "pt-2"
          )}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-2">
          {/* Left side tools */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-8",
                    files.length > 0
                      ? "text-accent"
                      : "text-foreground-muted hover:text-foreground"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach files</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-8",
                    webSearch
                      ? "text-accent bg-accent/10"
                      : "text-foreground-muted hover:text-foreground"
                  )}
                  onClick={() => onWebSearchChange?.(!webSearch)}
                >
                  <Globe className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {webSearch ? "Web search enabled" : "Enable web search"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-foreground-muted hover:text-foreground"
                >
                  <Sparkles className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enhance</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-foreground-muted hover:text-foreground"
                >
                  <AtSign className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mention</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-6 px-2 text-xs text-foreground-muted hover:text-foreground gap-1"
                >
                  {getModelIcon(selectedModel.icon)}
                  {selectedModel.name}
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {AVAILABLE_MODELS.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => onModelChange?.(model)}
                    className={cn(
                      "flex items-start gap-3 py-2",
                      model.id === selectedModel.id && "bg-background-hover"
                    )}
                  >
                    <div className="mt-0.5">{getModelIcon(model.icon)}</div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-foreground-muted">
                        {model.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reasoning Effort Selector - for gpt-5.1 */}
            {selectedModel.id === "gpt-5.1" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-foreground-muted hover:text-foreground gap-1"
                  >
                    <Brain className="size-3" />
                    {reasoningEffort}
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  {(["auto", "deepthink"] as const).map((effort) => (
                    <DropdownMenuItem
                      key={effort}
                      onClick={() => onReasoningEffortChange?.(effort)}
                      className={cn(
                        "capitalize",
                        effort === reasoningEffort && "bg-background-hover"
                      )}
                    >
                      {effort}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Right side - Send/Stop */}
          <div className="flex items-center gap-1">
            {isLoading ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 bg-foreground text-background rounded-full hover:bg-foreground/90"
                onClick={onStop}
              >
                <Square className="size-4 fill-current" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-8 rounded-full transition-colors",
                  canSubmit
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-background-tertiary text-foreground-muted"
                )}
                onClick={onSubmit}
                disabled={!canSubmit}
              >
                <ArrowUp className="size-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
