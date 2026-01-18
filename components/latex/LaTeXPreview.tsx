"use client";

import { useMemo, useEffect, useRef } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";
import { MermaidRenderer } from "../editor/media/MermaidRenderer";

interface LaTeXPreviewProps {
  content: string;
  scrollPercent?: number;
}

// Convert LaTeX to renderable HTML
function parseLatex(latex: string): {
  html: string;
  mermaidDiagrams: string[];
} {
  let html = latex;
  let equationCounter = 0;
  const mathBlocks: string[] = [];
  const mermaidDiagrams: string[] = [];

  // Helper to protect math from other transformations
  const protectMath = (content: string): string => {
    const placeholder = `%%MATH${mathBlocks.length}%%`;
    mathBlocks.push(content);
    return placeholder;
  };

  // Helper to protect mermaid diagrams
  const protectMermaid = (content: string): string => {
    const index = mermaidDiagrams.length;
    mermaidDiagrams.push(content.trim());
    return `%%MERMAID${index}%%`;
  };

  // Remove comments first
  html = html.replace(/(?<!\\)%.*$/gm, "");

  // PROTECT MERMAID DIAGRAMS FIRST
  // Handle \begin{mermaid}...\end{mermaid} environment
  html = html.replace(
    /\\begin\{mermaid\}([\s\S]*?)\\end\{mermaid\}/g,
    (_, content) => {
      return protectMermaid(content);
    }
  );

  // PROTECT ALL MATH FIRST (before any other processing)
  // Equation with numbering
  html = html.replace(
    /\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g,
    (_, math) => {
      equationCounter++;
      try {
        const rendered = katex.renderToString(math.trim(), {
          displayMode: true,
          throwOnError: false,
        });
        return protectMath(`<div class="my-6 flex items-center justify-center gap-4">
        <div class="overflow-x-auto">${rendered}</div>
        <div class="text-zinc-400 text-sm ml-4">(${equationCounter})</div>
      </div>`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        return protectMath(
          `<div class="my-4 p-2 bg-red-900/20 text-red-400 rounded">[Equation Error: ${msg}]<pre class="text-xs mt-1">${math.trim()}</pre></div>`
        );
      }
    }
  );

  // Equation* (no numbering)
  html = html.replace(
    /\\begin\{equation\*\}([\s\S]*?)\\end\{equation\*\}/g,
    (_, math) => {
      try {
        return protectMath(
          `<div class="my-4 text-center overflow-x-auto">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`
        );
      } catch {
        return protectMath(`<div class="my-4 text-red-400">[Math Error]</div>`);
      }
    }
  );

  // Align environments
  html = html.replace(
    /\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g,
    (_, math) => {
      try {
        // Convert align to aligned for KaTeX
        const aligned = `\\begin{aligned}${math}\\end{aligned}`;
        return protectMath(
          `<div class="my-4 text-center overflow-x-auto">${katex.renderToString(aligned.trim(), { displayMode: true, throwOnError: false })}</div>`
        );
      } catch {
        return protectMath(`<div class="my-4 text-red-400">[Math Error]</div>`);
      }
    }
  );

  // Gather/multline
  html = html.replace(
    /\\begin\{(gather|multline)\*?\}([\s\S]*?)\\end\{\1\*?\}/g,
    (_, _env, math) => {
      try {
        return protectMath(
          `<div class="my-4 text-center overflow-x-auto">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`
        );
      } catch {
        return protectMath(`<div class="my-4 text-red-400">[Math Error]</div>`);
      }
    }
  );

  // \[...\] display math
  html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try {
      return protectMath(
        `<div class="my-4 text-center overflow-x-auto">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`
      );
    } catch {
      return protectMath(`<div class="my-4 text-red-400">[Math Error]</div>`);
    }
  });

  // $$...$$ display math
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return protectMath(
        `<div class="my-4 text-center overflow-x-auto">${rendered}</div>`
      );
    } catch (e) {
      return protectMath(
        `<div class="my-4 text-red-400">[Math Error: ${e instanceof Error ? e.message : "Unknown"}]</div>`
      );
    }
  });

  // \(...\) inline math
  html = html.replace(/\\\(([^)]+)\\\)/g, (_, math) => {
    try {
      return protectMath(
        katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
        })
      );
    } catch {
      return protectMath(`<span class="text-red-400">[Math Error]</span>`);
    }
  });

  // $...$ inline math (careful not to match $$)
  html = html.replace(/(?<!\$)\$(?!\$)([^$\n]+)\$(?!\$)/g, (_, math) => {
    try {
      return protectMath(
        katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
        })
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown";
      return protectMath(
        `<span class="text-red-400" title="${msg}">[Math Error]</span>`
      );
    }
  });

  // Extract metadata
  const titleMatch = html.match(/\\title\{([^}]+)\}/);
  const authorMatch = html.match(/\\author\{([^}]+)\}/);
  const title = titleMatch ? titleMatch[1] : "";
  const author = authorMatch ? authorMatch[1] : "";

  // Remove preamble
  html = html.replace(/\\documentclass(\[[^\]]*\])?\{[^}]+\}/g, "");
  html = html.replace(/\\usepackage(\[[^\]]*\])?\{[^}]+\}/g, "");
  html = html.replace(/\\title\{[^}]+\}/g, "");
  html = html.replace(/\\author\{[^}]+\}/g, "");
  html = html.replace(/\\date\{[^}]+\}/g, "");
  html = html.replace(/\\begin\{document\}/g, "");
  html = html.replace(/\\end\{document\}/g, "");

  // Handle \maketitle
  if (title || author) {
    const titleHtml = `<div class="text-center mb-8"><h1 class="text-3xl font-bold mb-2">${title}</h1>${author ? `<p class="text-zinc-400">${author}</p>` : ""}</div>`;
    html = html.replace(/\\maketitle/g, titleHtml);
  } else {
    html = html.replace(/\\maketitle/g, "");
  }

  // Abstract
  html = html.replace(
    /\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g,
    '<div class="my-6 px-8 py-4 bg-zinc-800 rounded-lg italic text-zinc-300"><h3 class="font-bold not-italic mb-2">Abstract</h3>$1</div>'
  );

  // Quote environments
  html = html.replace(
    /\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g,
    '<blockquote class="border-l-4 border-zinc-600 pl-4 my-4 italic text-zinc-400">$1</blockquote>'
  );
  html = html.replace(
    /\\begin\{quotation\}([\s\S]*?)\\end\{quotation\}/g,
    '<blockquote class="border-l-4 border-zinc-600 pl-4 my-4 italic text-zinc-400">$1</blockquote>'
  );

  // Verbatim (code)
  html = html.replace(
    /\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g,
    '<pre class="bg-zinc-800 p-4 rounded-lg overflow-x-auto font-mono text-sm my-4">$1</pre>'
  );
  html = html.replace(
    /\\verb\|([^|]*)\|/g,
    '<code class="bg-zinc-800 px-1 rounded font-mono text-sm">$1</code>'
  );

  // Center environment
  html = html.replace(
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    '<div class="text-center my-4">$1</div>'
  );

  // Theorem environments
  html = html.replace(
    /\\begin\{theorem\}([\s\S]*?)\\end\{theorem\}/g,
    '<div class="my-4 p-4 border-l-4 border-blue-500 bg-zinc-800/50"><strong class="text-blue-400">Theorem.</strong>$1</div>'
  );
  html = html.replace(
    /\\begin\{lemma\}([\s\S]*?)\\end\{lemma\}/g,
    '<div class="my-4 p-4 border-l-4 border-green-500 bg-zinc-800/50"><strong class="text-green-400">Lemma.</strong>$1</div>'
  );
  html = html.replace(
    /\\begin\{proof\}([\s\S]*?)\\end\{proof\}/g,
    '<div class="my-4 p-4 border-l-4 border-zinc-500 bg-zinc-800/30 italic"><strong class="not-italic text-zinc-400">Proof.</strong>$1 <span class="float-right">∎</span></div>'
  );
  html = html.replace(
    /\\begin\{definition\}([\s\S]*?)\\end\{definition\}/g,
    '<div class="my-4 p-4 border-l-4 border-purple-500 bg-zinc-800/50"><strong class="text-purple-400">Definition.</strong>$1</div>'
  );
  html = html.replace(
    /\\begin\{corollary\}([\s\S]*?)\\end\{corollary\}/g,
    '<div class="my-4 p-4 border-l-4 border-yellow-500 bg-zinc-800/50"><strong class="text-yellow-400">Corollary.</strong>$1</div>'
  );
  html = html.replace(
    /\\begin\{remark\}([\s\S]*?)\\end\{remark\}/g,
    '<div class="my-4 p-4 border-l-4 border-zinc-600 bg-zinc-800/30"><strong class="text-zinc-400">Remark.</strong>$1</div>'
  );
  html = html.replace(
    /\\begin\{example\}([\s\S]*?)\\end\{example\}/g,
    '<div class="my-4 p-4 border-l-4 border-orange-500 bg-zinc-800/50"><strong class="text-orange-400">Example.</strong>$1</div>'
  );

  // Figure environment (basic support)
  html = html.replace(
    /\\begin\{figure\}(\[[^\]]*\])?([\s\S]*?)\\end\{figure\}/g,
    '<figure class="my-6 text-center">$2</figure>'
  );
  html = html.replace(
    /\\caption\{([^}]+)\}/g,
    '<figcaption class="text-sm text-zinc-400 mt-2 italic">$1</figcaption>'
  );
  html = html.replace(
    /\\includegraphics(\[[^\]]*\])?\{([^}]+)\}/g,
    '<div class="text-zinc-500 p-4 border border-dashed border-zinc-600 rounded">[Image: $2]</div>'
  );

  // Table environment (basic)
  html = html.replace(
    /\\begin\{table\}(\[[^\]]*\])?([\s\S]*?)\\end\{table\}/g,
    '<div class="my-6">$2</div>'
  );
  html = html.replace(
    /\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g,
    '<table class="border-collapse mx-auto">$1</table>'
  );
  html = html.replace(/\\hline/g, "");

  // Bibliography
  html = html.replace(
    /\\begin\{thebibliography\}\{[^}]*\}([\s\S]*?)\\end\{thebibliography\}/g,
    '<div class="mt-8"><h2 class="text-2xl font-bold mb-4 text-zinc-100">References</h2><ol class="list-decimal ml-6">$1</ol></div>'
  );
  html = html.replace(/\\bibitem\{([^}]+)\}/g, '<li id="ref-$1" class="mb-2">');

  // Convert sections (including starred variants)
  html = html.replace(
    /\\part\*?\{([^}]+)\}/g,
    '<h1 class="text-4xl font-black mt-12 mb-6 text-zinc-50 border-b border-zinc-700 pb-4">$1</h1>'
  );
  html = html.replace(
    /\\chapter\*?\{([^}]+)\}/g,
    '<h1 class="text-3xl font-bold mt-10 mb-6 text-zinc-50">$1</h1>'
  );
  html = html.replace(
    /\\section\*?\{([^}]+)\}/g,
    '<h2 class="text-2xl font-bold mt-8 mb-4 text-zinc-100">$1</h2>'
  );
  html = html.replace(
    /\\subsection\*?\{([^}]+)\}/g,
    '<h3 class="text-xl font-semibold mt-6 mb-3 text-zinc-200">$1</h3>'
  );
  html = html.replace(
    /\\subsubsection\*?\{([^}]+)\}/g,
    '<h4 class="text-lg font-medium mt-4 mb-2 text-zinc-300">$1</h4>'
  );
  html = html.replace(
    /\\paragraph\{([^}]+)\}/g,
    '<p class="font-semibold mt-4 mb-1 text-zinc-200">$1</p>'
  );
  html = html.replace(
    /\\subparagraph\{([^}]+)\}/g,
    '<p class="font-medium mt-2 mb-1 text-zinc-300 text-sm">$1</p>'
  );
  html = html.replace(
    /\\tableofcontents/g,
    '<div class="text-zinc-500 italic my-4">[Table of Contents]</div>'
  );
  html = html.replace(/\\noindent\s*/g, "");
  html = html.replace(/\\centering\s*/g, "");
  html = html.replace(/\\hspace\*?\{[^}]+\}/g, " ");
  html = html.replace(/\\vspace\*?\{[^}]+\}/g, "");
  html = html.replace(/\\hrule/g, '<hr class="border-zinc-700 my-4">');
  html = html.replace(
    /\\appendix/g,
    '<hr class="border-zinc-700 my-8"><h2 class="text-2xl font-bold mb-4 text-zinc-100">Appendix</h2>'
  );
  html = html.replace(
    /\\(newpage|clearpage|pagebreak)/g,
    '<hr class="border-zinc-700 my-8">'
  );
  html = html.replace(
    /\\today/g,
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

  // Convert text formatting
  html = html.replace(/\\textbf\{([^}]+)\}/g, "<strong>$1</strong>");
  html = html.replace(/\\textit\{([^}]+)\}/g, "<em>$1</em>");
  html = html.replace(
    /\\underline\{([^}]+)\}/g,
    '<span class="underline">$1</span>'
  );
  html = html.replace(/\\emph\{([^}]+)\}/g, "<em>$1</em>");
  html = html.replace(
    /\\texttt\{([^}]+)\}/g,
    '<code class="bg-zinc-800 px-1 rounded font-mono text-sm">$1</code>'
  );
  html = html.replace(
    /\\textsc\{([^}]+)\}/g,
    '<span class="uppercase text-sm tracking-wide">$1</span>'
  );
  html = html.replace(
    /\\textcolor\{([^}]+)\}\{([^}]+)\}/g,
    '<span style="color: $1">$2</span>'
  );
  html = html.replace(
    /\\colorbox\{([^}]+)\}\{([^}]+)\}/g,
    '<span style="background-color: $1; padding: 2px 4px;">$2</span>'
  );
  html = html.replace(/\\textsuperscript\{([^}]+)\}/g, "<sup>$1</sup>");
  html = html.replace(/\\textsubscript\{([^}]+)\}/g, "<sub>$1</sub>");

  // Font sizes (simplified - just remove the commands)
  html = html.replace(
    /\\(tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\b/g,
    ""
  );

  // Misc commands
  html = html.replace(
    /\\mbox\{([^}]+)\}/g,
    '<span class="whitespace-nowrap">$1</span>'
  );
  html = html.replace(/\\(sloppy|fussy|raggedright|raggedleft)\b/g, "");
  html = html.replace(/\\setlength\{[^}]+\}\{[^}]+\}/g, "");
  html = html.replace(
    /\\(textwidth|linewidth|columnwidth|paperwidth|paperheight)\b/g,
    "100%"
  );
  html = html.replace(/\\phantom\{[^}]+\}/g, "");
  html = html.replace(
    /\\(input|include)\{([^}]+)\}/g,
    '<div class="text-zinc-500 text-sm italic my-2">[Include: $2]</div>'
  );
  html = html.replace(
    /\\fbox\{([^}]+)\}/g,
    '<span class="border border-zinc-600 px-1">$1</span>'
  );
  html = html.replace(
    /\\framebox(\[[^\]]*\])?\{([^}]+)\}/g,
    '<span class="border border-zinc-600 px-2 py-1">$2</span>'
  );

  // Line breaks
  html = html.replace(/\\\\(?:\[.*?\])?/g, "<br>");
  html = html.replace(/\\newline/g, "<br>");

  // References and citations
  html = html.replace(
    /\\cite\{([^}]+)\}/g,
    '<span class="text-blue-400">[<span class="cursor-pointer hover:underline">$1</span>]</span>'
  );
  html = html.replace(
    /\\ref\{([^}]+)\}/g,
    '<span class="text-blue-400 cursor-pointer hover:underline">$1</span>'
  );
  html = html.replace(/\\label\{[^}]+\}/g, "");
  html = html.replace(
    /\\footnote\{([^}]+)\}/g,
    '<sup class="text-blue-400 cursor-help" title="$1">[*]</sup>'
  );
  html = html.replace(
    /\\href\{([^}]+)\}\{([^}]+)\}/g,
    '<a href="$1" class="text-blue-400 hover:underline" target="_blank" rel="noopener">$2</a>'
  );
  html = html.replace(
    /\\url\{([^}]+)\}/g,
    '<a href="$1" class="text-blue-400 hover:underline font-mono text-sm" target="_blank" rel="noopener">$1</a>'
  );
  html = html.replace(
    /\\thanks\{([^}]+)\}/g,
    '<sup class="text-zinc-400 text-xs" title="$1">*</sup>'
  );

  // Quotation marks
  html = html.replace(/``/g, '"');
  html = html.replace(/''/g, '"');

  // Special characters
  html = html.replace(/\\&/g, "&amp;");
  html = html.replace(/\\%/g, "%");
  html = html.replace(/\\#/g, "#");
  html = html.replace(/\\\$/g, "$");
  html = html.replace(/\\ldots/g, "…");
  html = html.replace(
    /\\LaTeX\b/g,
    '<span class="font-serif">L<sup class="text-xs">A</sup>T<sub class="text-xs">E</sub>X</span>'
  );
  html = html.replace(
    /\\TeX\b/g,
    '<span class="font-serif">T<sub class="text-xs">E</sub>X</span>'
  );
  html = html.replace(/\\textasciitilde/g, "~");
  html = html.replace(/\\textasciicircum/g, "^");
  html = html.replace(/\\textbackslash/g, "\\");
  html = html.replace(/\\_/g, "_");
  html = html.replace(/\\~/g, "&nbsp;");
  html = html.replace(/---/g, "—");
  html = html.replace(/--/g, "–");

  // Convert lists - handle items first, then wrap in list tags
  html = html.replace(
    /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
    (_, content) => {
      const items = content
        .replace(/\\item\s*/g, '</li><li class="mb-1">')
        .replace(/^<\/li>/, "");
      return `<ul class="list-disc ml-6 my-4 text-zinc-300">${items}</li></ul>`;
    }
  );
  html = html.replace(
    /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
    (_, content) => {
      const items = content
        .replace(/\\item\s*/g, '</li><li class="mb-1">')
        .replace(/^<\/li>/, "");
      return `<ol class="list-decimal ml-6 my-4 text-zinc-300">${items}</li></ol>`;
    }
  );
  html = html.replace(
    /\\begin\{description\}([\s\S]*?)\\end\{description\}/g,
    (_, content) => {
      const items = content
        .replace(
          /\\item\[([^\]]+)\]\s*/g,
          '</dd><dt class="font-bold text-zinc-200 mt-2">$1</dt><dd class="ml-4 text-zinc-300">'
        )
        .replace(/^<\/dd>/, "");
      return `<dl class="my-4">${items}</dd></dl>`;
    }
  );

  // Convert paragraphs (double newlines)
  html = html.replace(
    /\n\n+/g,
    '</p><p class="my-4 text-zinc-300 leading-relaxed">'
  );

  // Clean up extra whitespace
  html = html.replace(/\n/g, " ");
  html = html.trim();

  // Wrap in paragraph if not empty
  if (html && !html.startsWith("<")) {
    html = `<p class="my-4 text-zinc-300 leading-relaxed">${html}</p>`;
  }

  // Restore protected math blocks
  mathBlocks.forEach((block, i) => {
    html = html.replace(`%%MATH${i}%%`, block);
  });

  return { html, mermaidDiagrams };
}

export default function LaTeXPreview({
  content,
  scrollPercent,
}: LaTeXPreviewProps) {
  const { html, mermaidDiagrams } = useMemo(
    () => parseLatex(content),
    [content]
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync scroll from editor
  useEffect(() => {
    if (scrollPercent !== undefined && containerRef.current) {
      const container = containerRef.current;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      container.scrollTop = scrollPercent * scrollHeight;
    }
  }, [scrollPercent]);

  // Split HTML by mermaid placeholders and render
  const renderContent = useMemo(() => {
    const parts = html.split(/%%MERMAID(\d+)%%/);
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Regular HTML content
        if (parts[i]) {
          elements.push(
            <div
              key={`html-${i}`}
              dangerouslySetInnerHTML={{ __html: parts[i] }}
            />
          );
        }
      } else {
        // Mermaid diagram
        const index = parseInt(parts[i], 10);
        const diagram = mermaidDiagrams[index];
        if (diagram) {
          elements.push(
            <MermaidRenderer
              key={`mermaid-${i}`}
              chart={diagram}
              isDark={true}
            />
          );
        }
      }
    }

    return elements;
  }, [html, mermaidDiagrams]);

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto prose prose-invert">{renderContent}</div>
    </div>
  );
}
