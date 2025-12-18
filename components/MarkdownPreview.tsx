"use client";

import React, { useRef, useEffect, useMemo, useCallback, memo } from "react";
import ReactMarkdown from "react-markdown";
import type { ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { getCitations, parseCiteRefs } from "../lib/citations";
import { getFigures, findAllFigureRefs } from "../lib/figures";
import { MermaidRenderer } from "./MermaidRenderer";
import "katex/dist/katex.min.css";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  onEditFigure?: (figureId: string) => void;
  scrollPercent?: number;
}

type MarkdownCodeProps = React.ComponentProps<"code"> &
  ExtraProps & { inline?: boolean };

const MarkdownPreview = memo(function MarkdownPreview({
  content,
  className = "",
  onEditFigure,
  scrollPercent,
}: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { previewTheme, togglePreviewTheme } = useTheme();
  const isDark = previewTheme === "dark";

  // Sync scroll from editor
  useEffect(() => {
    if (scrollPercent !== undefined && containerRef.current) {
      const container = containerRef.current;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      container.scrollTop = scrollPercent * scrollHeight;
    }
  }, [scrollPercent]);

  // Memoize content processing for performance
  const { contentParts, usedCitations, figures } = useMemo(() => {
    const citations = getCitations();
    const usedKeys = parseCiteRefs(content);
    const usedCits = usedKeys
      .map((key) => citations.find((c) => c.key === key))
      .filter(Boolean);

    const figs = getFigures();
    const figureRefs = findAllFigureRefs(content);

    // Replace \cite{key} with styled [n]
    let processed = content;
    usedKeys.forEach((key, index) => {
      const regex = new RegExp(`\\\\cite\\{${key}\\}`, "g");
      processed = processed.replace(
        regex,
        `<span class="cite-ref">[${index + 1}]</span>`
      );
    });

    // Replace ![Caption](fig:label "dimensions") with a placeholder
    figureRefs.forEach(({ fullMatch, ref }) => {
      const escapedMatch = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedMatch, "g");
      const captionEncoded = ref.caption
        ? btoa(encodeURIComponent(ref.caption))
        : "";
      processed = processed.replace(
        regex,
        `<!--FIGURE:${ref.label}|${ref.width || ""}|${ref.height || ""}|${captionEncoded}-->`
      );
    });

    return {
      contentParts: processed.split(/<!--FIGURE:([^>]+)-->/),
      usedCitations: usedCits,
      figures: figs,
    };
  }, [content]);

  // Custom components for ReactMarkdown
  const markdownComponents = useMemo(
    () => ({
      code({ inline, className, children, ...props }: MarkdownCodeProps) {
        const match = /language-(\w+)/.exec(className || "");
        const language = match ? match[1] : "";
        const code = String(children).replace(/\n$/, "");

        if (!inline && language === "mermaid") {
          return <MermaidRenderer chart={code} isDark={isDark} />;
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

  const renderContent = useCallback(() => {
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < contentParts.length; i++) {
      if (i % 2 === 0) {
        // Regular markdown content
        if (contentParts[i].trim()) {
          elements.push(
            <ReactMarkdown
              key={`md-${i}`}
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
              components={markdownComponents}
            >
              {contentParts[i]}
            </ReactMarkdown>
          );
        }
      } else {
        // Figure placeholder - parse label, dimensions, and caption
        const parts = contentParts[i].split("|");
        const label = parts[0];
        const width = parts[1] || undefined;
        const height = parts[2] || undefined;
        const captionEncoded = parts[3] || "";
        // Decode caption from base64
        let inlineCaption: string | undefined;
        if (captionEncoded) {
          try {
            inlineCaption = decodeURIComponent(atob(captionEncoded));
          } catch {
            inlineCaption = undefined;
          }
        }

        const figure = figures.find((f) => f.label === label);
        const figureIndex = figures.findIndex((f) => f.label === label);

        if (figure) {
          // Parse dimensions - add 'px' if just a number
          const parseSize = (size?: string) => {
            if (!size) return undefined;
            if (/^\d+$/.test(size)) return `${size}px`;
            return size;
          };

          const imgStyle: React.CSSProperties = {
            width: parseSize(width),
            height: parseSize(height),
            maxWidth: "100%",
          };

          // Use inline caption if provided, otherwise fall back to figure's caption
          const displayCaption =
            inlineCaption || figure.caption || figure.label;

          elements.push(
            <figure
              key={`fig-${i}`}
              className="figure-block cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onEditFigure?.(figure.id)}
              title="Click to edit figure"
            >
              {figure.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={figure.thumbnail}
                  alt={displayCaption}
                  className="figure-image"
                  style={imgStyle}
                />
              ) : (
                <div
                  className="bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500"
                  style={{
                    width: parseSize(width) || "100%",
                    height: parseSize(height) || "12rem",
                  }}
                >
                  No preview available
                </div>
              )}
              <figcaption className="figure-caption">
                <strong>Figure {figureIndex + 1}:</strong> {displayCaption}
              </figcaption>
            </figure>
          );
        }
      }
    }

    return elements;
  }, [contentParts, figures, onEditFigure, markdownComponents]);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full overflow-auto relative ${
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
      <article
        className={`prose w-full max-w-none px-8 py-6 prose-headings:font-semibold prose-h1:text-3xl prose-h1:border-b prose-h1:pb-4 prose-h2:text-2xl prose-h2:mt-8 prose-h3:text-xl prose-p:leading-7 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-blockquote:not-italic prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-table:border-collapse prose-th:border prose-th:px-4 prose-th:py-2 prose-td:border prose-td:px-4 prose-td:py-2 ${
          isDark
            ? "prose-invert prose-h1:border-zinc-700 prose-code:bg-zinc-800 prose-pre:bg-zinc-800 prose-pre:border-zinc-700 prose-blockquote:border-l-zinc-600 prose-a:text-blue-400 prose-th:border-zinc-600 prose-th:bg-zinc-800 prose-td:border-zinc-600"
            : "prose-zinc prose-h1:border-zinc-200 prose-code:bg-zinc-100 prose-pre:bg-zinc-900 prose-pre:border-zinc-200 prose-blockquote:border-l-zinc-300 prose-a:text-blue-600 prose-th:border-zinc-300 prose-th:bg-zinc-100 prose-td:border-zinc-300"
        }`}
      >
        {renderContent()}

        {/* Bibliography */}
        {usedCitations.length > 0 && (
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
      </article>
    </div>
  );
});

export default MarkdownPreview;
