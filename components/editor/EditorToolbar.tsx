"use client";

import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  Link,
  Image as ImageIcon,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  ChevronDown,
  RemoveFormatting,
  Check,
} from "lucide-react";
import DictateButton from "../DictateButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EditorToolbarProps {
  editor: Editor;
  onSetLink: () => void;
  onAddImage: () => void;
  onAddTable: () => void;
  onDictation?: (text: string) => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={`p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${
            isActive
              ? "bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400"
              : "text-zinc-700 dark:text-zinc-300"
          }`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={5}>
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

function ToolbarDivider() {
  return (
    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1 flex-shrink-0" />
  );
}

export default function EditorToolbar({
  editor,
  onSetLink,
  onAddImage,
  onAddTable,
  onDictation,
}: EditorToolbarProps) {
  const getCurrentHeading = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    if (editor.isActive("heading", { level: 4 })) return "Heading 4";
    if (editor.isActive("heading", { level: 5 })) return "Heading 5";
    if (editor.isActive("heading", { level: 6 })) return "Heading 6";
    return "Normal";
  };

  const getCurrentAlign = () => {
    if (editor.isActive({ textAlign: "center" }))
      return <AlignCenter className="h-4 w-4" />;
    if (editor.isActive({ textAlign: "right" }))
      return <AlignRight className="h-4 w-4" />;
    if (editor.isActive({ textAlign: "justify" }))
      return <AlignJustify className="h-4 w-4" />;
    return <AlignLeft className="h-4 w-4" />;
  };

  return (
    <div className="flex-shrink-0 relative border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2 py-1.5">
      <div className="flex items-center gap-0.5 flex-wrap">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Heading Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm whitespace-nowrap">
            <span className="w-20 text-left">{getCurrentHeading()}</span>
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={
                editor.isActive("paragraph") && !editor.isActive("heading")
                  ? "bg-zinc-100 dark:bg-zinc-700 text-blue-600 dark:text-blue-400"
                  : ""
              }
            >
              <Pilcrow className="h-4 w-4" />
              Normal text
              {editor.isActive("paragraph") && !editor.isActive("heading") && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={
                editor.isActive("heading", { level: 1 })
                  ? "bg-zinc-100 dark:bg-zinc-700 text-blue-600 dark:text-blue-400"
                  : ""
              }
            >
              <Heading1 className="h-4 w-4" />
              Heading 1
              {editor.isActive("heading", { level: 1 }) && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={
                editor.isActive("heading", { level: 2 })
                  ? "bg-zinc-100 dark:bg-zinc-700 text-blue-600 dark:text-blue-400"
                  : ""
              }
            >
              <Heading2 className="h-4 w-4" />
              Heading 2
              {editor.isActive("heading", { level: 2 }) && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={
                editor.isActive("heading", { level: 3 })
                  ? "bg-zinc-100 dark:bg-zinc-700 text-blue-600 dark:text-blue-400"
                  : ""
              }
            >
              <Heading3 className="h-4 w-4" />
              Heading 3
              {editor.isActive("heading", { level: 3 }) && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarDivider />

        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive("highlight")}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          title="Clear formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text Alignment */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {getCurrentAlign()}
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className={
                editor.isActive({ textAlign: "left" })
                  ? "bg-zinc-100 dark:bg-zinc-700 text-blue-600 dark:text-blue-400"
                  : ""
              }
            >
              <AlignLeft className="h-4 w-4" />
              Align left
              {editor.isActive({ textAlign: "left" }) && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              className={
                editor.isActive({ textAlign: "center" })
                  ? "bg-zinc-100 dark:bg-zinc-700 text-blue-600 dark:text-blue-400"
                  : ""
              }
            >
              <AlignCenter className="h-4 w-4" />
              Align center
              {editor.isActive({ textAlign: "center" }) && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className={
                editor.isActive({ textAlign: "right" })
                  ? "bg-zinc-100 dark:bg-zinc-700 text-blue-600 dark:text-blue-400"
                  : ""
              }
            >
              <AlignRight className="h-4 w-4" />
              Align right
              {editor.isActive({ textAlign: "right" }) && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              className={
                editor.isActive({ textAlign: "justify" })
                  ? "bg-zinc-100 dark:bg-zinc-700 text-blue-600 dark:text-blue-400"
                  : ""
              }
            >
              <AlignJustify className="h-4 w-4" />
              Justify
              {editor.isActive({ textAlign: "justify" }) && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
          title="Task List"
        >
          <CheckSquare className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Insert Elements */}
        <ToolbarButton
          onClick={onSetLink}
          isActive={editor.isActive("link")}
          title="Insert Link"
        >
          <Link className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onAddImage} title="Insert Image">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onAddTable} title="Insert Table">
          <Table className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Block Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <Type className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        {onDictation && (
          <>
            <ToolbarDivider />
            <DictateButton onTranscription={onDictation} />
          </>
        )}
      </div>
    </div>
  );
}
