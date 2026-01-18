"use client";

import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ChevronDown, Share, X } from "lucide-react";
import { CodeThemeSelector } from "../utils/code-theme-selector";

interface HeaderProps {
  onClose?: () => void;
  modelName?: string;
}

export function Header({ onClose, modelName = "Chat" }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-3 border-b border-border">
      {/* Center - App Name & Model */}
      <div className="flex items-center gap-2">
        <span className="text-foreground font-semibold">Tennant Chat</span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-foreground-muted hover:bg-background-hover"
        >
          {modelName}
          <ChevronDown className="size-3" />
        </Button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Code Theme Selector */}
        <CodeThemeSelector />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-foreground-muted hover:text-foreground"
            >
              <Share className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Share</TooltipContent>
        </Tooltip>

        {onClose && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-foreground-muted hover:text-foreground"
                onClick={onClose}
              >
                <X className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close</TooltipContent>
          </Tooltip>
        )}

        <Button variant="ghost" size="icon" className="size-9">
          <div className="size-7 rounded-full bg-accent flex items-center justify-center text-sm font-medium text-background">
            M
          </div>
        </Button>
      </div>
    </header>
  );
}
