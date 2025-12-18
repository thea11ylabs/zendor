"use client";

import {
  useState,
  useCallback,
  useMemo,
  memo,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { linter, Diagnostic } from "@codemirror/lint";
import { autocompletion, CompletionContext } from "@codemirror/autocomplete";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { lintLatexInMarkdown } from "../lib/latex-linter";

// LaTeX autocomplete - static, never changes
const latexCompletions = [
  {
    label: "\\frac{}{}",
    displayLabel: "\\frac",
    detail: "fraction",
    type: "function",
  },
  {
    label: "\\sqrt{}",
    displayLabel: "\\sqrt",
    detail: "square root",
    type: "function",
  },
  {
    label: "\\sum_{}",
    displayLabel: "\\sum",
    detail: "summation",
    type: "function",
  },
  {
    label: "\\int_{}",
    displayLabel: "\\int",
    detail: "integral",
    type: "function",
  },
  {
    label: "\\prod_{}",
    displayLabel: "\\prod",
    detail: "product",
    type: "function",
  },
  {
    label: "\\lim_{}",
    displayLabel: "\\lim",
    detail: "limit",
    type: "function",
  },
  { label: "\\alpha", detail: "Greek letter", type: "constant" },
  { label: "\\beta", detail: "Greek letter", type: "constant" },
  { label: "\\gamma", detail: "Greek letter", type: "constant" },
  { label: "\\delta", detail: "Greek letter", type: "constant" },
  { label: "\\epsilon", detail: "Greek letter", type: "constant" },
  { label: "\\theta", detail: "Greek letter", type: "constant" },
  { label: "\\lambda", detail: "Greek letter", type: "constant" },
  { label: "\\mu", detail: "Greek letter", type: "constant" },
  { label: "\\pi", detail: "Greek letter", type: "constant" },
  { label: "\\sigma", detail: "Greek letter", type: "constant" },
  { label: "\\omega", detail: "Greek letter", type: "constant" },
  { label: "\\infty", detail: "infinity", type: "constant" },
  { label: "\\partial", detail: "partial derivative", type: "constant" },
  { label: "\\nabla", detail: "nabla/del", type: "constant" },
  { label: "\\times", detail: "multiplication", type: "constant" },
  { label: "\\div", detail: "division", type: "constant" },
  { label: "\\pm", detail: "plus-minus", type: "constant" },
  { label: "\\leq", detail: "less than or equal", type: "constant" },
  { label: "\\geq", detail: "greater than or equal", type: "constant" },
  { label: "\\neq", detail: "not equal", type: "constant" },
  { label: "\\approx", detail: "approximately", type: "constant" },
  { label: "\\rightarrow", detail: "right arrow", type: "constant" },
  { label: "\\leftarrow", detail: "left arrow", type: "constant" },
  { label: "\\Rightarrow", detail: "implies", type: "constant" },
  {
    label: "\\mathbf{}",
    displayLabel: "\\mathbf",
    detail: "bold math",
    type: "function",
  },
  {
    label: "\\mathit{}",
    displayLabel: "\\mathit",
    detail: "italic math",
    type: "function",
  },
  {
    label: "\\mathrm{}",
    displayLabel: "\\mathrm",
    detail: "roman math",
    type: "function",
  },
  {
    label: "\\text{}",
    displayLabel: "\\text",
    detail: "text in math",
    type: "function",
  },
  { label: "\\begin{equation}", detail: "equation env", type: "keyword" },
  { label: "\\begin{align}", detail: "align env", type: "keyword" },
  { label: "\\begin{matrix}", detail: "matrix env", type: "keyword" },
];

function latexAutocomplete(context: CompletionContext) {
  const before = context.matchBefore(/\\[a-zA-Z]*/);
  if (!before || (before.from === before.to && !context.explicit)) return null;
  return {
    from: before.from,
    options: latexCompletions,
    validFor: /^\\[a-zA-Z]*$/,
  };
}

interface MarkdownEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  className?: string;
  mode?: "markdown" | "latex";
  onScrollPositionChange?: (scrollPercent: number) => void;
}

// Expose methods via ref for programmatic control
export interface MarkdownEditorHandle {
  getValue: () => string;
  setValue: (value: string) => void;
}

// Static theme extension - never recreated
const baseTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "15px",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-geist-mono), monospace",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "16px 0",
  },
  ".cm-line": {
    padding: "0 24px",
    lineHeight: "1.7",
  },
  // Code block styling
  ".cm-line.cm-codeblock": {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  "&.cm-focused .cm-line.cm-codeblock": {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  // LaTeX error styling
  ".cm-lintRange-error": {
    backgroundImage: "none",
    textDecoration: "wavy underline #ef4444",
    textDecorationSkipInk: "none",
  },
});

// Dark theme overrides for code blocks
const darkCodeBlockTheme = EditorView.theme(
  {
    ".cm-line.cm-codeblock": {
      backgroundColor: "rgba(255, 255, 255, 0.05)",
    },
    "&.cm-focused .cm-line.cm-codeblock": {
      backgroundColor: "rgba(255, 255, 255, 0.05)",
    },
  },
  { dark: true }
);

// LaTeX linter - debounced at 1500ms for performance
const latexLinter = linter(
  (view: EditorView) => {
    const content = view.state.doc.toString();
    // Skip linting for very large documents
    if (content.length > 100000) return [];

    const errors = lintLatexInMarkdown(content);
    return errors.map(
      (error): Diagnostic => ({
        from: error.from,
        to: error.to,
        severity: error.severity,
        message: error.message,
      })
    );
  },
  { delay: 1500 }
);

// Static markdown extension with code language support
const markdownExtension = markdown({
  base: markdownLanguage,
  codeLanguages: languages,
  addKeymap: true,
});
const latexExtension = StreamLanguage.define(stex);
const autocompleteExtension = autocompletion({ override: [latexAutocomplete] });

// Uncontrolled editor - only re-renders for mode/theme changes, not content
const MarkdownEditor = memo(
  forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(function MarkdownEditor(
    {
      initialValue,
      onChange,
      className = "",
      mode = "markdown",
      onScrollPositionChange,
    },
    ref
  ) {
    const { editorTheme, toggleEditorTheme } = useTheme();
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
    const editorRef = useRef<ReactCodeMirrorRef>(null);
    const onChangeRef = useRef(onChange);
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Expose getValue/setValue via ref for programmatic control
    useImperativeHandle(
      ref,
      () => ({
        getValue: () => editorRef.current?.view?.state.doc.toString() ?? "",
        setValue: (value: string) => {
          const view = editorRef.current?.view;
          if (view) {
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: value },
            });
          }
        },
      }),
      []
    );

    // Stable language extension based on mode
    const languageExtension = useMemo(
      () => (mode === "latex" ? latexExtension : markdownExtension),
      [mode]
    );

    // Stable extensions array - changes when mode or theme changes
    const extensions = useMemo(
      () =>
        [
          languageExtension,
          EditorView.lineWrapping,
          baseTheme,
          editorTheme === "dark" ? darkCodeBlockTheme : [],
          autocompleteExtension,
          latexLinter,
        ].flat(),
      [languageExtension, editorTheme]
    );

    // Direct onChange - no debounce here, let parent handle it
    const handleChange = useCallback((newValue: string) => {
      onChangeRef.current(newValue);
    }, []);

    // Handle scroll - called directly by CodeMirror's onCreateEditor
    const handleEditorCreated = useCallback(
      (view: EditorView) => {
        if (!onScrollPositionChange) return;
        const scroller = view.scrollDOM;
        scroller.addEventListener(
          "scroll",
          () => {
            const scrollTop = scroller.scrollTop;
            const scrollHeight = scroller.scrollHeight - scroller.clientHeight;
            const percent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
            onScrollPositionChange(percent);
          },
          { passive: true }
        );
      },
      [onScrollPositionChange]
    );

    // Cursor position update - only when selection changes
    const handleUpdate = useCallback(
      (viewUpdate: {
        selectionSet: boolean;
        state: {
          selection: { main: { head: number } };
          doc: { lineAt: (pos: number) => { number: number; from: number } };
        };
      }) => {
        if (viewUpdate.selectionSet) {
          const pos = viewUpdate.state.selection.main.head;
          const line = viewUpdate.state.doc.lineAt(pos);
          setCursorPos({ line: line.number, col: pos - line.from + 1 });
        }
      },
      []
    );

    // Theme selection
    const theme = useMemo(
      () => (editorTheme === "dark" ? githubDark : githubLight),
      [editorTheme]
    );

    // Basic setup config - static
    const basicSetup = useMemo(
      () => ({
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightActiveLine: true,
        foldGutter: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: false,
        highlightSelectionMatches: true,
        lintKeymap: false,
      }),
      []
    );

    return (
      <div
        className={`h-full overflow-hidden relative flex flex-col ${className}`}
      >
        <div className="flex-1 relative overflow-hidden">
          <button
            onClick={toggleEditorTheme}
            className={`absolute top-3 right-3 z-10 p-2 rounded-lg transition-colors ${
              editorTheme === "dark"
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
            }`}
            title={
              editorTheme === "light"
                ? "Switch to Dark Mode"
                : "Switch to Light Mode"
            }
          >
            {editorTheme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
          <CodeMirror
            ref={editorRef}
            value={initialValue}
            height="100%"
            theme={theme}
            extensions={extensions}
            onChange={handleChange}
            onUpdate={handleUpdate}
            onCreateEditor={handleEditorCreated}
            className="h-full"
            basicSetup={basicSetup}
          />
        </div>
        {/* Status bar */}
        <div
          className={`flex items-center justify-end px-4 py-1 text-xs font-mono border-t ${
            editorTheme === "dark"
              ? "bg-zinc-900 border-zinc-800 text-zinc-400"
              : "bg-zinc-50 border-zinc-200 text-zinc-500"
          }`}
        >
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
        </div>
      </div>
    );
  })
);

export default MarkdownEditor;
