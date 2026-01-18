"use client";

import React, { useMemo, memo, useRef } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import ReactMarkdown from "react-markdown";
import type { ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { getCitations, parseCiteRefs } from "../../lib/citations";
import { MermaidRenderer } from "./media/MermaidRenderer";
import "katex/dist/katex.min.css";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  onEditFigure?: (figureId: string) => void;
  scrollPercent?: number;
}

type MarkdownCodeProps = React.ComponentProps<"code"> &
  ExtraProps & { inline?: boolean };

// Split content into renderable sections
function splitIntoSections(content: string): string[] {
  // Split by double newlines (paragraphs) or headings
  const sections: string[] = [];
  const lines = content.split("\n");
  let currentSection: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start new section on headings, code blocks, or after empty lines
    if (
      line.match(/^#{1,6}\s/) || // Heading
      line.match(/^```/) || // Code block start
      (line.trim() === "" &&
        currentSection.length > 0 &&
        currentSection.length < 50) // Empty line (but not if section is too big)
    ) {
      if (currentSection.length > 0) {
        sections.push(currentSection.join("\n"));
        currentSection = [];
      }
    }

    currentSection.push(line);

    // Force split every 50 lines to prevent massive sections
    if (currentSection.length >= 50) {
      sections.push(currentSection.join("\n"));
      currentSection = [];
    }
  }

  if (currentSection.length > 0) {
    sections.push(currentSection.join("\n"));
  }

  return sections.filter((s) => s.trim());
}

const MarkdownSection = memo(function MarkdownSection({
  content,
  isDark,
}: {
  content: string;
  isDark: boolean;
}) {
  const markdownComponents = useMemo(
    () => ({
      code({ inline, className, children, ...props }: MarkdownCodeProps) {
        const match = /language-(\w+)/.exec(className || "");
        const language = match ? match[1] : "";
        const code = String(children).replace(/\n$/, "");

        if (!inline && language === "mermaid") {
          return <MermaidRenderer chart={code} isDark={isDark} />;
        }

        // Simple code rendering without syntax highlighting for performance
        if (!inline) {
          return (
            <pre className={className}>
              <code>{children}</code>
            </pre>
          );
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    }),
    [isDark]
  );

  // Process citations
  const processedContent = useMemo(() => {
    const usedKeys = parseCiteRefs(content);
    let processed = content;

    usedKeys.forEach((key, index) => {
      const regex = new RegExp(`\\\\cite\\{${key}\\}`, "g");
      processed = processed.replace(
        regex,
        `<span class="cite-ref">[${index + 1}]</span>`
      );
    });

    return processed;
  }, [content]);

  return (
    <div className="mb-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

const MarkdownPreview = memo(function MarkdownPreview({
  content,
  className = "",
}: MarkdownPreviewProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const previewTheme = resolvedTheme === "dark" ? "dark" : "light";
  const togglePreviewTheme = () =>
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  const isDark = previewTheme === "dark";

  // Split content into sections for virtualization
  const sections = useMemo(() => splitIntoSections(content), [content]);

  // Get citations
  const usedCitations = useMemo(() => {
    const citations = getCitations();
    const usedKeys = parseCiteRefs(content);
    return usedKeys
      .map((key) => citations.find((c) => c.key === key))
      .filter(Boolean);
  }, [content]);

  // Sync scroll from editor (disabled for large docs for performance)
  // useEffect(() => {
  //   if (scrollPercent !== undefined && sections.length < 1000) {
  //     const index = Math.floor(scrollPercent * sections.length);
  //     virtuosoRef.current?.scrollToIndex({ index, behavior: "smooth" });
  //   }
  // }, [scrollPercent, sections.length]);

  return (
    <div
      className={`h-full w-full relative ${
        isDark ? "bg-zinc-900" : "bg-white"
      } ${className}`}
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

      <Virtuoso
        ref={virtuosoRef}
        data={sections}
        overscan={200}
        increaseViewportBy={{ top: 600, bottom: 600 }}
        itemContent={(index, section) => (
          <div
            className={`prose w-full max-w-none px-8 prose-headings:font-semibold prose-h1:text-3xl prose-h1:border-b prose-h1:pb-4 prose-h2:text-2xl prose-h2:mt-8 prose-h3:text-xl prose-p:leading-7 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-blockquote:not-italic prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-table:border-collapse prose-th:border prose-th:px-4 prose-th:py-2 prose-td:border prose-td:px-4 prose-td:py-2 ${
              isDark
                ? "prose-invert prose-h1:border-zinc-700 prose-code:bg-zinc-800 prose-pre:bg-zinc-800 prose-pre:border-zinc-700 prose-blockquote:border-l-zinc-600 prose-a:text-blue-400 prose-th:border-zinc-600 prose-th:bg-zinc-800 prose-td:border-zinc-600"
                : "prose-zinc prose-h1:border-zinc-200 prose-code:bg-zinc-100 prose-pre:bg-zinc-900 prose-pre:border-zinc-200 prose-blockquote:border-l-zinc-300 prose-a:text-blue-600 prose-th:border-zinc-300 prose-th:bg-zinc-100 prose-td:border-zinc-300"
            }`}
          >
            <MarkdownSection content={section} isDark={isDark} />

            {/* Show references at the end */}
            {index === sections.length - 1 && usedCitations.length > 0 && (
              <section className="mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                <h2 className="text-xl font-semibold mb-4">References</h2>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  {usedCitations.map((citation) => (
                    <li key={citation!.id}>
                      {citation!.author}, &ldquo;{citation!.title},&rdquo;{" "}
                      {citation!.journal && <em>{citation!.journal}, </em>}
                      {citation!.booktitle && (
                        <>
                          in <em>{citation!.booktitle}</em>,{" "}
                        </>
                      )}
                      {citation!.year}.
                      {citation!.doi && (
                        <a
                          href={`https://doi.org/${citation!.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          doi:{citation!.doi}
                        </a>
                      )}
                      {!citation!.doi && citation!.url && (
                        <a
                          href={citation!.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          [Link]
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}
      />
    </div>
  );
});

export default MarkdownPreview;
