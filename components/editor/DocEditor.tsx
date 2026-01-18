"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import "katex/dist/katex.min.css";
import { Textarea } from "../ui/textarea";

interface DocEditorProps {
  content: string;
  onChange: (content: string) => void;
}

interface MathBlockProps {
  value: string;
  display: boolean;
  onEdit: (newValue: string) => void;
}

function MathBlock({ value, display, onEdit }: MathBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onEdit(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    } else if (e.key === "Enter" && !e.shiftKey && !display) {
      e.preventDefault();
      handleBlur();
    }
  };

  if (isEditing) {
    return (
      <div className={display ? "my-4" : "inline"}>
        <Textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`font-mono text-sm bg-zinc-100 dark:bg-zinc-800 border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            display ? "w-full min-h-[60px]" : "inline min-w-[100px]"
          }`}
          style={display ? {} : { verticalAlign: "middle" }}
        />
      </div>
    );
  }

  // Render the math with KaTeX
  const mathContent = display ? `$$${value}$$` : `$${value}$`;

  return (
    <span
      onDoubleClick={handleDoubleClick}
      className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
      title="Double-click to edit"
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <>{children}</>,
        }}
      >
        {mathContent}
      </ReactMarkdown>
    </span>
  );
}

// Parse markdown and extract math blocks for special handling
function parseContentWithMath(
  content: string
): Array<{ type: "text" | "math-inline" | "math-display"; value: string }> {
  const parts: Array<{
    type: "text" | "math-inline" | "math-display";
    value: string;
  }> = [];

  // Match display math ($$...$$) and inline math ($...$)
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }

    const mathStr = match[0];
    if (mathStr.startsWith("$$")) {
      parts.push({ type: "math-display", value: mathStr.slice(2, -2).trim() });
    } else {
      parts.push({ type: "math-inline", value: mathStr.slice(1, -1) });
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts;
}

export default function DocEditor({ content, onChange }: DocEditorProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const previewTheme = resolvedTheme === "dark" ? "dark" : "light";
  const togglePreviewTheme = () =>
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  const isDark = previewTheme === "dark";
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Split content into blocks (by double newline)
  const blocks = content.split(/\n\n+/).filter(Boolean);

  const handleBlockClick = (index: number) => {
    setEditingBlock(index);
    setEditValue(blocks[index]);
  };

  const handleBlockBlur = () => {
    if (editingBlock !== null && editValue !== blocks[editingBlock]) {
      const newBlocks = [...blocks];
      newBlocks[editingBlock] = editValue;
      onChange(newBlocks.join("\n\n"));
    }
    setEditingBlock(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditingBlock(null);
    }
  };

  useEffect(() => {
    if (editingBlock !== null && editorRef.current) {
      editorRef.current.focus();
      // Move cursor to end
      const len = editorRef.current.value.length;
      editorRef.current.setSelectionRange(len, len);
    }
  }, [editingBlock]);

  // Handle math edits within a block
  const handleMathEdit = useCallback(
    (
      blockIndex: number,
      oldMath: string,
      newMath: string,
      isDisplay: boolean
    ) => {
      const block = blocks[blockIndex];
      const wrapper = isDisplay ? "$$" : "$";
      const oldFull = `${wrapper}${oldMath}${wrapper}`;
      const newFull = `${wrapper}${newMath}${wrapper}`;
      const newBlock = block.replace(oldFull, newFull);

      const newBlocks = [...blocks];
      newBlocks[blockIndex] = newBlock;
      onChange(newBlocks.join("\n\n"));
    },
    [blocks, onChange]
  );

  // Render a block with math support
  const renderBlockWithMath = (block: string, blockIndex: number) => {
    const parts = parseContentWithMath(block);

    // If it's a pure display math block
    if (parts.length === 1 && parts[0].type === "math-display") {
      return (
        <MathBlock
          key={blockIndex}
          value={parts[0].value}
          display={true}
          onEdit={(newValue) =>
            handleMathEdit(blockIndex, parts[0].value, newValue, true)
          }
        />
      );
    }

    // Check if block contains any math
    const hasMath = parts.some((p) => p.type !== "text");

    if (!hasMath) {
      // No math - render normally with ReactMarkdown
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {block}
        </ReactMarkdown>
      );
    }

    // Has inline math - need to handle specially
    return (
      <div>
        {parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <ReactMarkdown
                key={i}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  p: ({ children }) => <span>{children}</span>,
                }}
              >
                {part.value}
              </ReactMarkdown>
            );
          } else if (part.type === "math-inline") {
            return (
              <MathBlock
                key={i}
                value={part.value}
                display={false}
                onEdit={(newValue) =>
                  handleMathEdit(blockIndex, part.value, newValue, false)
                }
              />
            );
          } else {
            return (
              <MathBlock
                key={i}
                value={part.value}
                display={true}
                onEdit={(newValue) =>
                  handleMathEdit(blockIndex, part.value, newValue, true)
                }
              />
            );
          }
        })}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`h-full overflow-auto relative ${
        isDark ? "bg-zinc-900" : "bg-white"
      }`}
    >
      <button
        onClick={togglePreviewTheme}
        className={`absolute top-3 right-3 z-10 p-2 rounded-lg transition-colors ${
          isDark
            ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
        }`}
        title={
          previewTheme === "light"
            ? "Switch to Dark Mode"
            : "Switch to Light Mode"
        }
      >
        {previewTheme === "light" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </button>

      <article
        className={`prose max-w-none px-8 py-6 prose-headings:font-semibold prose-h1:text-3xl prose-h1:border-b prose-h1:pb-4 prose-h2:text-2xl prose-h2:mt-8 prose-h3:text-xl prose-p:leading-7 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-blockquote:not-italic prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-table:border-collapse prose-th:border prose-th:px-4 prose-th:py-2 prose-td:border prose-td:px-4 prose-td:py-2 ${
          isDark
            ? "prose-invert prose-h1:border-zinc-700 prose-code:bg-zinc-800 prose-pre:bg-zinc-800 prose-pre:border-zinc-700 prose-blockquote:border-l-zinc-600 prose-a:text-blue-400 prose-th:border-zinc-600 prose-th:bg-zinc-800 prose-td:border-zinc-600"
            : "prose-zinc prose-h1:border-zinc-200 prose-code:bg-zinc-100 prose-pre:bg-zinc-900 prose-pre:border-zinc-200 prose-blockquote:border-l-zinc-300 prose-a:text-blue-600 prose-th:border-zinc-300 prose-th:bg-zinc-100 prose-td:border-zinc-300"
        }`}
      >
        {blocks.map((block, index) => (
          <div
            key={index}
            onClick={() => editingBlock !== index && handleBlockClick(index)}
            className={`relative group cursor-text rounded-sm transition-colors ${
              editingBlock === index
                ? ""
                : "hover:bg-blue-50 dark:hover:bg-blue-900/10"
            }`}
          >
            {editingBlock === index ? (
              <Textarea
                ref={editorRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlockBlur}
                onKeyDown={handleKeyDown}
                className={`w-full min-h-[80px] p-3 font-mono text-sm border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
                  isDark
                    ? "bg-zinc-800 text-zinc-100"
                    : "bg-white text-zinc-900"
                }`}
                style={{
                  height: Math.max(80, editValue.split("\n").length * 24),
                }}
              />
            ) : (
              renderBlockWithMath(block, index)
            )}
          </div>
        ))}

        {/* Add new block area */}
        <div
          onClick={() => {
            onChange(content + "\n\n");
            setTimeout(() => {
              setEditingBlock(blocks.length);
              setEditValue("");
            }, 0);
          }}
          className={`min-h-[100px] cursor-text rounded transition-colors ${
            isDark ? "hover:bg-zinc-800/50" : "hover:bg-zinc-50"
          }`}
        />
      </article>
    </div>
  );
}
