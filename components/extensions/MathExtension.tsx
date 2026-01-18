"use client";

import { Node, mergeAttributes, InputRule, ExtendedRegExpMatchArray } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect, useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { validateLatex } from "../../lib/latex-linter";

// KaTeX options with extended macros
const katexOptions = {
  throwOnError: false,
  output: "html" as const,
  trust: true,
  strict: false,
  macros: {
    "\\R": "\\mathbb{R}",
    "\\N": "\\mathbb{N}",
    "\\Z": "\\mathbb{Z}",
    "\\Q": "\\mathbb{Q}",
    "\\C": "\\mathbb{C}",
    "\\vec": "\\mathbf{#1}",
    "\\norm": "\\left\\|#1\\right\\|",
    "\\abs": "\\left|#1\\right|",
    "\\set": "\\left\\{#1\\right\\}",
    "\\inner": "\\langle#1,#2\\rangle",
    "\\floor": "\\lfloor#1\\rfloor",
    "\\ceil": "\\lceil#1\\rceil",
  },
};

function MathNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const latex = node.attrs.latex as string;
  const display = node.attrs.display as boolean;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(latex);
  const [showFullError, setShowFullError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Validate LaTeX while editing
  const validation = useMemo(() => {
    if (!editValue.trim()) return { valid: true };
    return validateLatex(editValue);
  }, [editValue]);

  useEffect(() => {
    setEditValue(latex);
  }, [latex]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== latex) {
      updateAttributes({ latex: editValue.trim() });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditValue(latex);
      setIsEditing(false);
    } else if (e.key === "Enter" && !e.shiftKey && !display) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleBlur();
    }
  };

  if (isEditing) {
    return (
      <NodeViewWrapper className={display ? "my-4" : "inline"} as={display ? "div" : "span"}>
        <div className={display ? "w-full" : "inline-block"}>
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`font-mono text-sm bg-zinc-50 dark:bg-zinc-800 border rounded px-2 py-1 focus:outline-none focus:ring-2 text-zinc-900 dark:text-zinc-100 ${
              display ? "w-full min-h-[60px] block" : "inline-block min-w-[100px] align-middle"
            } ${
              !validation.valid
                ? "border-red-400 focus:ring-red-400"
                : "border-zinc-300 dark:border-zinc-600 focus:ring-blue-500"
            }`}
            placeholder="Enter LaTeX (e.g., E=mc^2)..."
          />
          {!validation.valid && validation.error && (
            <div className="mt-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-500 font-mono">
                  {showFullError ? validation.fullError : validation.error}
                </span>
                {validation.fullError && validation.fullError !== validation.error && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowFullError(!showFullError);
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
                  >
                    {showFullError ? "less" : "more"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  // Render with KaTeX
  let html = "";
  try {
    html = katex.renderToString(latex || "", {
      ...katexOptions,
      displayMode: display,
    });
  } catch {
    html = `<span class="text-red-500 font-mono text-sm">Invalid LaTeX: ${latex}</span>`;
  }

  return (
    <NodeViewWrapper
      className={`${display ? "my-4 block text-center" : "inline"} cursor-pointer rounded transition-colors ${
        selected ? "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-400" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
      as={display ? "div" : "span"}
      onClick={handleClick}
      title="Click to edit LaTeX"
    >
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </NodeViewWrapper>
  );
}

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
      },
      display: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-inline"]',
        getAttrs: (node) => {
          if (typeof node === "string") return {};
          const element = node as HTMLElement;
          return { latex: element.getAttribute("data-latex") || element.textContent };
        },
      },
      {
        tag: "span.math-inline",
        getAttrs: (node) => {
          if (typeof node === "string") return {};
          const element = node as HTMLElement;
          return { latex: element.textContent };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ["span", mergeAttributes(HTMLAttributes, {
      "data-type": "math-inline",
      "data-latex": node.attrs.latex,
    }), node.attrs.latex];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },

  addInputRules() {
    return [
      new InputRule({
        // Match $...$ for inline math (not $$)
        find: /(?<!\$)\$([^$\n]+)\$$/,
        handler: ({ state, range, match }: { state: EditorState; range: { from: number; to: number }; match: ExtendedRegExpMatchArray }) => {
          const latex = match[1];
          const { tr } = state;

          if (latex) {
            tr.replaceWith(range.from, range.to, this.type.create({ latex, display: false }));
          }
        },
      }),
    ];
  },
});

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
      },
      display: {
        default: true,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
        getAttrs: (node) => {
          if (typeof node === "string") return {};
          const element = node as HTMLElement;
          return { latex: element.getAttribute("data-latex") || element.textContent };
        },
      },
      {
        tag: "div.math-display",
        getAttrs: (node) => {
          if (typeof node === "string") return {};
          const element = node as HTMLElement;
          return { latex: element.textContent };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ["div", mergeAttributes(HTMLAttributes, {
      "data-type": "math-block",
      "data-latex": node.attrs.latex,
    }), node.attrs.latex];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },

  addInputRules() {
    return [
      new InputRule({
        // Match $$...$$ for display math
        find: /^\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }: { state: EditorState; range: { from: number; to: number }; match: ExtendedRegExpMatchArray }) => {
          const latex = match[1];
          const { tr } = state;

          if (latex) {
            tr.replaceWith(range.from, range.to, this.type.create({ latex, display: true }));
          }
        },
      }),
    ];
  },
});

export const MathExtensions = [MathInline, MathBlock];
