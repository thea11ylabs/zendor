"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Markdown } from "tiptap-markdown";
import { all, createLowlight } from "lowlight";
import { useCallback, useEffect, useRef } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import EditorToolbar from "./EditorToolbar";
import { MathExtensions } from "./extensions/MathExtension";
import "katex/dist/katex.min.css";

const lowlight = createLowlight(all);

// Preprocess markdown to convert $...$ and $$...$$ to HTML that math nodes can parse
function preprocessMathInMarkdown(markdown: string): string {
  // Convert display math $$...$$ to div elements
  let processed = markdown.replace(
    /\$\$([^$]+)\$\$/g,
    (_, latex) => `<div data-type="math-block" data-latex="${escapeHtml(latex.trim())}">${escapeHtml(latex.trim())}</div>`
  );

  // Convert inline math $...$ to span elements (but not $$)
  processed = processed.replace(
    /(?<!\$)\$([^$\n]+)\$(?!\$)/g,
    (_, latex) => `<span data-type="math-inline" data-latex="${escapeHtml(latex.trim())}">${escapeHtml(latex.trim())}</span>`
  );

  return processed;
}

// Convert HTML math tags back to markdown $...$ syntax
function postprocessMathToMarkdown(content: string): string {
  // Convert math-block divs back to $$...$$
  let processed = content.replace(
    /<div[^>]*data-type="math-block"[^>]*data-latex="([^"]*)"[^>]*>[^<]*<\/div>/g,
    (_, latex) => `$$${unescapeHtml(latex)}$$`
  );

  // Convert math-inline spans back to $...$
  processed = processed.replace(
    /<span[^>]*data-type="math-inline"[^>]*data-latex="([^"]*)"[^>]*>[^<]*<\/span>/g,
    (_, latex) => `$${unescapeHtml(latex)}$`
  );

  return processed;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

interface VisualEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function VisualEditor({ content, onChange }: VisualEditorProps) {
  const isInternalUpdate = useRef(false);
  const { previewTheme, togglePreviewTheme } = useTheme();
  const isDark = previewTheme === "dark";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      ...MathExtensions,
      Placeholder.configure({
        placeholder: "Start typing your document...",
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 dark:text-blue-400 no-underline hover:underline cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList.configure({
        HTMLAttributes: {
          class: "list-none pl-0",
        },
      }),
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "javascript",
        HTMLAttributes: {
          class: "hljs",
        },
      }),
      TextStyle,
      Color,
    ],
    content: preprocessMathInMarkdown(content),
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-full",
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      const storage = editor.storage as { markdown?: { getMarkdown: () => string } };
      let markdown = storage.markdown?.getMarkdown() ?? editor.getHTML();
      // Convert math HTML back to $...$ syntax
      markdown = postprocessMathToMarkdown(markdown);
      onChange(markdown);
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;

    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const storage = editor.storage as { markdown?: { getMarkdown: () => string } };
    const currentMarkdown = storage.markdown?.getMarkdown() || "";

    if (content !== currentMarkdown) {
      editor.commands.setContent(preprocessMathInMarkdown(content));
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;

    const url = window.prompt("Enter image URL:");

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  const handleDictation = useCallback((text: string) => {
    if (!editor) return;

    // Insert the transcribed text at the current cursor position
    editor.chain().focus().insertContent(text + " ").run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        Loading editor...
      </div>
    );
  }

  return (
    <div className={`h-full w-full flex flex-col ${isDark ? "bg-zinc-900" : "bg-white"}`}>
      <EditorToolbar
        editor={editor}
        onSetLink={setLink}
        onAddImage={addImage}
        onAddTable={addTable}
        onDictation={handleDictation}
      />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative">
        <button
          onClick={togglePreviewTheme}
          className={`absolute top-3 right-3 z-10 p-2 rounded-lg transition-colors ${
            isDark
              ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
          }`}
          title={previewTheme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
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
          <EditorContent editor={editor} />
        </article>
      </div>
    </div>
  );
}
