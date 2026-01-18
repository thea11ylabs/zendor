"use client";

import { memo, useState, useEffect, useMemo, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import { ChevronRight } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { CodeBlock } from "./code-block";

// Sanitize schema - allow standard HTML + KaTeX elements
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    // KaTeX elements
    "math", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "mroot", "msqrt", "mtext", "mspace", "mover", "munder", "munderover", "mtable", "mtr", "mtd", "annotation",
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] || []), "className", "class", "style"],
    span: [...(defaultSchema.attributes?.span || []), "aria-hidden"],
    div: [...(defaultSchema.attributes?.div || [])],
    // Details/summary for thinking blocks
    details: ["className", "class", "open"],
    summary: ["className", "class", "data-thinking", "data-start", "data-thought-duration"],
  },
};

// Render LaTeX math expressions using KaTeX (skip code blocks, avoid false positives)
function renderMath(content: string): string {
  // Extract code blocks and inline code to protect them
  const protected_: string[] = [];
  const PLACEHOLDER = '\x00PROTECTED_';

  // Protect fenced code blocks (```...```)
  let result = content.replace(/```[\s\S]*?```/g, (match) => {
    protected_.push(match);
    return `${PLACEHOLDER}${protected_.length - 1}\x00`;
  });

  // Protect inline code (`...`)
  result = result.replace(/`[^`]+`/g, (match) => {
    protected_.push(match);
    return `${PLACEHOLDER}${protected_.length - 1}\x00`;
  });

  // Protect shell/programming patterns: $(...), ${...}, $VAR, $1, $_, $#, $@, $?, $!
  result = result.replace(/\$[({]|\$[A-Z_][A-Z0-9_]*|\$[0-9_#@?!]/gi, (match) => {
    protected_.push(match);
    return `${PLACEHOLDER}${protected_.length - 1}\x00`;
  });

  // Protect currency: $100, $50.00
  result = result.replace(/\$\d+(?:\.\d+)?/g, (match) => {
    protected_.push(match);
    return `${PLACEHOLDER}${protected_.length - 1}\x00`;
  });

  // Render display math: \[...\] or $$...$$
  result = result.replace(/\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g, (_, g1, g2) => {
    const math = g1 || g2;
    if (!math) return _;
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<span class="text-red-500">[Math Error]</span>`;
    }
  });

  // Render inline math: \(...\) - always safe
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="text-red-500">[Math Error]</span>`;
    }
  });

  // Render inline math $...$ only if it looks like math (contains operators/greek/etc)
  // Skip if content starts with (, {, or looks like shell/code
  result = result.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
    // Skip if looks like code/shell pattern
    if (/^[({]/.test(math) || /^[A-Z_][A-Z0-9_]*$/i.test(math)) {
      return match;
    }
    // Only render if contains math-like characters
    if (/[\\^_{}+=<>]|\\[a-z]+/i.test(math) || /[α-ωΑ-Ω∑∫∏√∞≠≤≥±×÷]/.test(math)) {
      try {
        return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return match; // Return original if KaTeX fails
      }
    }
    return match;
  });

  // Restore protected content
  result = result.replace(/\x00PROTECTED_(\d+)\x00/g, (_, index) => {
    return protected_[parseInt(index)];
  });

  return result;
}

// Animated text with wave effect on each character
function AnimatedText({ text }: { text: string }) {
  return (
    <span className="inline-flex">
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="animate-char-wave"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

// Thinking/Thought summary component with live timer
function ThinkingSummary({ startTime, isComplete, duration }: {
  startTime?: number;
  isComplete: boolean;
  duration?: number;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isComplete || !startTime) return;

    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isComplete]);

  const displayTime = isComplete ? (duration || elapsed) : elapsed;

  return (
    <span className="flex items-center gap-2">
      <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
      {isComplete ? `Thought for ${displayTime}s` : <AnimatedText text="Thinking..." />}
    </span>
  );
}

interface MarkdownProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

// Parse thinking metadata from content
function parseThinkingMeta(content: string): { startTime?: number; duration?: number; isComplete: boolean } {
  const startMatch = content.match(/data-start="(\d+)"/);
  const durationMatch = content.match(/data-thought-duration="(\d+)"/);

  return {
    startTime: startMatch ? parseInt(startMatch[1]) : undefined,
    duration: durationMatch ? parseInt(durationMatch[1]) : undefined,
    isComplete: !!durationMatch,
  };
}

// Extract text content from children
function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const nodeProps = node.props as { children?: ReactNode };
    return extractText(nodeProps.children);
  }
  return "";
}

// Static components - defined once, never recreated
const markdownComponents: Partial<Components> = {
  // Headings
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="text-2xl font-semibold mt-6 mb-4">{children}</h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="text-xl font-semibold mt-6 mb-3">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="text-lg font-semibold mt-5 mb-2">{children}</h3>
  ),
  h4: ({ children }: { children?: ReactNode }) => (
    <h4 className="text-base font-semibold mt-4 mb-2">{children}</h4>
  ),

  // Paragraphs
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-4 last:mb-0">{children}</p>
  ),

  // Lists
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mb-4 ml-6 space-y-2 list-disc">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mb-4 ml-6 space-y-2 list-decimal">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="pl-1">{children}</li>
  ),

  // Code blocks and inline code
  code: ({ className, children, ...props }: { className?: string; children?: ReactNode }) => {
    const isBlock = className?.includes("language-");
    const language = className?.replace("language-", "") || "";
    const codeString = extractText(children).replace(/\n$/, "");

    if (isBlock) {
      return <CodeBlock code={codeString} lang={language} />;
    }

    return (
      <code
        className="px-1.5 py-0.5 rounded bg-zinc-800 text-[13px] font-mono text-[#e6edf3]"
        {...props}
      >
        {children}
      </code>
    );
  },

  // Pre - let code handle it
  pre: ({ children }: { children?: ReactNode }) => <>{children}</>,

  // Collapsible details
  details: ({ children, className, ...props }: { children?: ReactNode; className?: string }) => (
    <details
      className={`mb-4 group ${className === "reasoning" ? "[&>*:not(summary)]:text-foreground-muted [&>*:not(summary)]:text-sm [&>*:not(summary)]:mt-2 [&>*:not(summary)]:pl-6" : ""}`}
      {...props}
    >
      {children}
    </details>
  ),

  // Blockquote
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="mb-4 pl-4 border-l-2 border-border italic text-foreground-secondary">
      {children}
    </blockquote>
  ),

  // Links
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {children}
    </a>
  ),

  // Tables
  table: ({ children }: { children?: ReactNode }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="bg-zinc-100 dark:bg-zinc-800">{children}</thead>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="px-4 py-2 text-left font-semibold border border-zinc-300 dark:border-zinc-600">
      {children}
    </th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="px-4 py-2 border border-zinc-300 dark:border-zinc-600">
      {children}
    </td>
  ),

  // Horizontal rule
  hr: () => <hr className="my-6 border-zinc-200 dark:border-zinc-700" />,

  // Strong/Bold
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),

  // Images
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt || ""} className="rounded-lg max-w-full my-4" />
  ),
};

export const Markdown = memo(function Markdown({ content, className = "", isStreaming = false }: MarkdownProps) {
  const thinkingMeta = parseThinkingMeta(content);

  // Only the summary component needs dynamic props - create it with useMemo
  const components = useMemo(() => ({
    ...markdownComponents,
    summary: ({ children, ...props }: { children?: ReactNode }) => {
      const isThinking = (props as Record<string, unknown>)["data-thinking"] === "true";

      if (isThinking && thinkingMeta.startTime) {
        return (
          <summary className="cursor-pointer text-sm font-medium text-foreground-muted hover:text-foreground-secondary select-none list-none [&::-webkit-details-marker]:hidden">
            <ThinkingSummary
              startTime={thinkingMeta.startTime}
              isComplete={thinkingMeta.isComplete || !isStreaming}
              duration={thinkingMeta.duration}
            />
          </summary>
        );
      }

      return (
        <summary className="cursor-pointer text-sm font-medium text-foreground-muted hover:text-foreground-secondary select-none flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          {children}
        </summary>
      );
    },
  }), [thinkingMeta.startTime, thinkingMeta.isComplete, thinkingMeta.duration, isStreaming]);

  return (
    <div className={`text-base leading-7 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeKatex]}
        components={components}
      >
        {renderMath(content)}
      </ReactMarkdown>
    </div>
  );
});

export { Markdown as default };
