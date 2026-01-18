"use client";

import {
  useState,
  useCallback,
  useMemo,
  memo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { linter, Diagnostic } from "@codemirror/lint";
import { autocompletion, CompletionContext, snippet } from "@codemirror/autocomplete";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { lintLatexInMarkdown } from "../../lib/latex-linter";
import { latexCompletions } from "../../lib/latex-completions";
import { overleafCompletions } from "../../lib/latex-completions-overleaf";

// Merge completions from our curated list and Overleaf's top commands
const allCompletions = (() => {
  const seen = new Set<string>();
  const merged = [];

  // Add our completions first (they have better categorization and snippets)
  for (const comp of latexCompletions) {
    seen.add(comp.label);
    merged.push(comp);
  }

  // Add Overleaf completions that we don't have yet
  for (const comp of overleafCompletions) {
    if (!seen.has(comp.label)) {
      seen.add(comp.label);
      merged.push(comp);
    }
  }

  return merged;
})();

function latexAutocomplete(context: CompletionContext) {
  const word = context.matchBefore(/\\[a-zA-Z]*/);

  if (!word) return null;

  // Don't show completions for just backslash unless explicit (Ctrl+Space)
  if (word.from === word.to && !context.explicit) return null;

  const options = allCompletions.map(completion => ({
    label: completion.label,
    detail: completion.detail,
    type: completion.type,
    apply: completion.snippet ? snippet(completion.snippet) : completion.label,
  }));

  return {
    from: word.from,
    options,
  };
}

interface MarkdownEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  className?: string;
  mode?: "markdown" | "latex";
  onScrollPositionChange?: (scrollPercent: number) => void;
  onLineClick?: (lineNumber: number, linePercent: number) => void;
}

// Expose methods via ref for programmatic control
export interface MarkdownEditorHandle {
  getValue: () => string;
  setValue: (value: string) => void;
  scrollToPercent: (percent: number) => void;
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
const autocompleteExtension = autocompletion({
  override: [latexAutocomplete],
  activateOnTyping: true,
  closeOnBlur: true,
});

// Uncontrolled editor - only re-renders for mode/theme changes, not content
const MarkdownEditor = memo(
  forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(function MarkdownEditor(
    {
      initialValue,
      onChange,
      className = "",
      mode = "markdown",
      onScrollPositionChange,
      onLineClick,
    },
    ref
  ) {
    const { resolvedTheme, setTheme } = useTheme();
    const editorTheme = resolvedTheme === "dark" ? "dark" : "light";
    const toggleEditorTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
    const editorRef = useRef<ReactCodeMirrorRef>(null);

    // Expose getValue/setValue/scrollToPercent via ref for programmatic control
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
        scrollToPercent: (percent: number) => {
          const view = editorRef.current?.view;
          if (view) {
            const totalLines = view.state.doc.lines;
            const targetLine = Math.floor(percent * (totalLines - 1)) + 1;
            const lineInfo = view.state.doc.line(Math.max(1, Math.min(totalLines, targetLine)));

            view.dispatch({
              selection: { anchor: lineInfo.from, head: lineInfo.from },
              scrollIntoView: true,
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
      onChange(newValue);
    }, [onChange]);

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
          doc: { lineAt: (pos: number) => { number: number; from: number; text: string }; lines: number };
        };
      }) => {
        if (viewUpdate.selectionSet) {
          const pos = viewUpdate.state.selection.main.head;
          const line = viewUpdate.state.doc.lineAt(pos);
          setCursorPos({ line: line.number, col: pos - line.from + 1 });

          // Call onLineClick if provided - calculate line position percentage
          if (onLineClick) {
            const totalLines = viewUpdate.state.doc.lines;
            const linePercent = totalLines > 1 ? (line.number - 1) / (totalLines - 1) : 0;
            onLineClick(line.number, linePercent);
          }
        }
      },
      [onLineClick]
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
        autocompletion: false, // Using custom autocomplete extension instead
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
            type="button"
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
