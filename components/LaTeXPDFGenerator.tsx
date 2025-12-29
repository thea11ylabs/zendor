"use client";

/**
 * LaTeX PDF Generator
 * Generates professional LaTeX-style PDFs in the browser
 * Uses @react-pdf/renderer with Computer Modern fonts and LaTeX typography
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";

// Register Computer Modern fonts (LaTeX's actual font)
// Using a working CDN that provides proper font files
Font.register({
  family: "Computer Modern",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts/CMUSerif-Roman.ttf",
    },
    {
      src: "https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts/CMUSerif-Bold.ttf",
      fontWeight: "bold",
    },
    {
      src: "https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts/CMUSerif-Italic.ttf",
      fontStyle: "italic",
    },
  ],
});

Font.register({
  family: "Computer Modern Mono",
  src: "https://cdn.jsdelivr.net/gh/dreampulse/computer-modern-web-font@master/fonts/CMUTypewriter-Regular.ttf",
});

// Convert LaTeX math to Unicode for PDF display
function latexToUnicode(latex: string): string {
  let result = latex;

  // Greek letters
  const greekMap: Record<string, string> = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
    '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
    '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
    '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
    '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
    '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
    '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ',
    '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Phi': 'Φ',
    '\\Psi': 'Ψ', '\\Omega': 'Ω'
  };

  // Superscripts
  const superscriptMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    'n': 'ⁿ'
  };

  // Apply Greek letters
  for (const [latex, unicode] of Object.entries(greekMap)) {
    result = result.replace(new RegExp(latex.replace('\\', '\\\\'), 'g'), unicode);
  }

  // Handle fractions \frac{a}{b} -> a/b
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');

  // Handle superscripts x^2 -> x²
  result = result.replace(/([a-zA-Z])(\^)(\d)/g, (_match, base, _caret, exp) => {
    return base + (superscriptMap[exp] || `^${exp}`);
  });

  // Handle sqrt
  result = result.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

  // Math operators
  result = result.replace(/\\times/g, '×');
  result = result.replace(/\\div/g, '÷');
  result = result.replace(/\\pm/g, '±');
  result = result.replace(/\\infty/g, '∞');
  result = result.replace(/\\leq/g, '≤');
  result = result.replace(/\\geq/g, '≥');
  result = result.replace(/\\neq/g, '≠');
  result = result.replace(/\\approx/g, '≈');
  result = result.replace(/\\sum/g, '∑');
  result = result.replace(/\\prod/g, '∏');
  result = result.replace(/\\int/g, '∫');

  // Remove remaining backslashes from commands
  result = result.replace(/\\([a-zA-Z]+)/g, '$1');

  // Clean up extra spaces and braces
  result = result.replace(/\{|\}/g, '');
  result = result.replace(/\s+/g, ' ');

  return result.trim();
}

// LaTeX-inspired styles matching typical LaTeX document output
const latexStyles = StyleSheet.create({
  page: {
    padding: "1in", // Standard LaTeX margins
    fontFamily: "Computer Modern",
    fontSize: 11,
    lineHeight: 1.6,
    color: "#000000",
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    marginTop: 24,
  },
  author: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
  },
  date: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 32,
  },
  abstract: {
    marginBottom: 24,
    marginHorizontal: 48,
  },
  abstractTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  abstractText: {
    fontSize: 10,
    textAlign: "justify",
    lineHeight: 1.4,
  },
  section: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  subsection: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
  },
  subsubsection: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    textAlign: "justify",
    marginBottom: 10,
    textIndent: 20, // LaTeX paragraph indentation
    lineHeight: 1.6,
  },
  firstParagraph: {
    textAlign: "justify",
    marginBottom: 10,
    textIndent: 0, // First paragraph after heading has no indent
    lineHeight: 1.6,
  },
  displayMath: {
    textAlign: "center",
    marginVertical: 12,
    fontSize: 11,
  },
  equation: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 12,
  },
  equationNumber: {
    position: "absolute",
    right: 0,
    fontSize: 11,
  },
  code: {
    fontFamily: "Computer Modern Mono",
    fontSize: 9,
    backgroundColor: "#f5f5f5",
    padding: 8,
    marginVertical: 8,
    lineHeight: 1.4,
  },
  theorem: {
    marginVertical: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#0066cc",
  },
  theoremTitle: {
    fontWeight: "bold",
    fontStyle: "italic",
    fontSize: 11,
  },
  proof: {
    marginVertical: 10,
    fontStyle: "italic",
  },
  proofLabel: {
    fontStyle: "italic",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
    marginLeft: 24,
  },
  listBullet: {
    width: 16,
  },
  listContent: {
    flex: 1,
  },
  references: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 0,
  },
  refTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
  },
  refItem: {
    fontSize: 10,
    marginBottom: 6,
    marginLeft: 24,
    textIndent: -24,
    lineHeight: 1.4,
  },
  pageNumber: {
    position: "absolute",
    fontSize: 10,
    bottom: 36,
    left: 0,
    right: 0,
    textAlign: "center",
  },
});

interface ParsedLatexElement {
  type:
    | "title"
    | "author"
    | "date"
    | "abstract"
    | "section"
    | "subsection"
    | "subsubsection"
    | "paragraph"
    | "displayMath"
    | "equation"
    | "code"
    | "theorem"
    | "proof"
    | "listItem"
    | "text";
  content: string;
  number?: number;
}

/**
 * Parse LaTeX content into structured elements for PDF rendering
 */
function parseLatexContent(latex: string): {
  title: string;
  author: string;
  date: string;
  elements: ParsedLatexElement[];
} {
  let title = "";
  let author = "";
  let date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Extract metadata
  const titleMatch = latex.match(/\\title\{([^}]+)\}/);
  const authorMatch = latex.match(/\\author\{([^}]+)\}/);
  const dateMatch = latex.match(/\\date\{([^}]+)\}/);

  if (titleMatch) title = titleMatch[1];
  if (authorMatch) author = authorMatch[1];
  if (dateMatch) date = dateMatch[1] === "\\today" ? date : dateMatch[1];

  // Remove comments first
  let content = latex.replace(/(?<!\\)%.*$/gm, "");

  // Remove preamble and metadata
  content = content
    .replace(/\\documentclass(\[[^\]]*\])?\{[^}]+\}/g, "")
    .replace(/\\usepackage(\[[^\]]*\])?\{[^}]+\}/g, "")
    .replace(/\\title\{[^}]+\}/g, "")
    .replace(/\\author\{[^}]+\}/g, "")
    .replace(/\\date\{[^}]+\}/g, "")
    .replace(/\\begin\{document\}/g, "")
    .replace(/\\end\{document\}/g, "")
    .replace(/\\maketitle/g, "");

  const elements: ParsedLatexElement[] = [];
  let equationCounter = 0;

  // Handle abstract environment before splitting into lines
  const abstractMatch = content.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
  let abstractContent = "";
  if (abstractMatch) {
    abstractContent = abstractMatch[1].trim();
    content = content.replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/, "%%ABSTRACT%%");
  }

  // Split into lines and parse
  const lines = content.split("\n");
  let currentParagraph = "";

  const flushParagraph = () => {
    if (currentParagraph.trim()) {
      let text = currentParagraph;

      // Handle inline math $...$ before other replacements
      text = text.replace(/\$([^$]+)\$/g, (_match, math) => {
        return latexToUnicode(math);
      });

      // Remove other LaTeX commands
      text = text
        .replace(/\\textbf\{([^}]+)\}/g, "$1")
        .replace(/\\textit\{([^}]+)\}/g, "$1")
        .replace(/\\emph\{([^}]+)\}/g, "$1")
        .replace(/\\texttt\{([^}]+)\}/g, "$1")
        .replace(/\\cite\{([^}]+)\}/g, "[$1]")
        .replace(/\\\\/g, "\n")
        .replace(/``/g, '"')
        .replace(/''/g, '"')
        .replace(/---/g, "—")
        .replace(/--/g, "–")
        .trim();

      if (text !== "%%ABSTRACT%%") {
        elements.push({ type: "paragraph", content: text });
      }
      currentParagraph = "";
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    // Check for abstract placeholder
    if (line === "%%ABSTRACT%%") {
      flushParagraph();
      elements.push({ type: "abstract", content: abstractContent });
      continue;
    }

    // Sections
    if (line.match(/\\section\*?\{([^}]+)\}/)) {
      flushParagraph();
      const match = line.match(/\\section\*?\{([^}]+)\}/);
      if (match) elements.push({ type: "section", content: match[1] });
    } else if (line.match(/\\subsection\*?\{([^}]+)\}/)) {
      flushParagraph();
      const match = line.match(/\\subsection\*?\{([^}]+)\}/);
      if (match) elements.push({ type: "subsection", content: match[1] });
    } else if (line.match(/\\subsubsection\*?\{([^}]+)\}/)) {
      flushParagraph();
      const match = line.match(/\\subsubsection\*?\{([^}]+)\}/);
      if (match) elements.push({ type: "subsubsection", content: match[1] });
    }
    // Equations
    else if (line.includes("\\begin{equation}")) {
      flushParagraph();
      equationCounter++;
      let mathContent = "";
      i++;
      while (i < lines.length && !lines[i].includes("\\end{equation}")) {
        mathContent += lines[i] + " ";
        i++;
      }
      elements.push({
        type: "equation",
        content: latexToUnicode(mathContent.trim()),
        number: equationCounter,
      });
    }
    // Display math with \[ \]
    else if (line.includes("\\[") || line.includes("\\]")) {
      flushParagraph();
      let mathContent = line.replace(/\\\[|\\\]/g, "").trim();
      // Handle multi-line display math
      while (!line.includes("\\]") && i < lines.length - 1) {
        i++;
        line = lines[i];
        mathContent += " " + line.replace(/\\\]/g, "").trim();
      }
      if (mathContent) {
        elements.push({ type: "displayMath", content: latexToUnicode(mathContent) });
      }
    }
    // Display math with $$
    else if (line.includes("$$")) {
      flushParagraph();
      const mathContent = line.replace(/\$\$/g, "").trim();
      if (mathContent) {
        elements.push({ type: "displayMath", content: latexToUnicode(mathContent) });
      }
    }
    // Items
    else if (line.startsWith("\\item")) {
      flushParagraph();
      elements.push({
        type: "listItem",
        content: line.replace(/\\item\s*/, ""),
      });
    }
    // Regular text
    else {
      currentParagraph += (currentParagraph ? " " : "") + line;
    }
  }

  flushParagraph();

  return { title, author, date, elements };
}

/**
 * LaTeX PDF Document Component
 */
function LaTeXPDFDocument({ latex }: { latex: string }) {
  const { title, author, date, elements } = parseLatexContent(latex);

  return (
    <Document>
      <Page size="LETTER" style={latexStyles.page}>
        {/* Title, Author, Date */}
        {title && <Text style={latexStyles.title}>{title}</Text>}
        {author && <Text style={latexStyles.author}>{author}</Text>}
        {date && <Text style={latexStyles.date}>{date}</Text>}

        {/* Content */}
        {elements.map((el, i) => {
          switch (el.type) {
            case "abstract":
              return (
                <View key={i} style={latexStyles.abstract}>
                  <Text style={latexStyles.abstractTitle}>Abstract</Text>
                  <Text style={latexStyles.abstractText}>{el.content}</Text>
                </View>
              );
            case "section":
              return (
                <Text key={i} style={latexStyles.section}>
                  {el.content}
                </Text>
              );
            case "subsection":
              return (
                <Text key={i} style={latexStyles.subsection}>
                  {el.content}
                </Text>
              );
            case "subsubsection":
              return (
                <Text key={i} style={latexStyles.subsubsection}>
                  {el.content}
                </Text>
              );
            case "paragraph":
              return (
                <Text key={i} style={latexStyles.paragraph}>
                  {el.content}
                </Text>
              );
            case "displayMath":
              return (
                <View key={i} style={latexStyles.displayMath}>
                  <Text>{el.content}</Text>
                </View>
              );
            case "equation":
              return (
                <View key={i} style={latexStyles.equation}>
                  <Text>{el.content}</Text>
                  <Text style={latexStyles.equationNumber}>({el.number})</Text>
                </View>
              );
            case "listItem":
              return (
                <View key={i} style={latexStyles.listItem}>
                  <Text style={latexStyles.listBullet}>•</Text>
                  <Text style={latexStyles.listContent}>{el.content}</Text>
                </View>
              );
            default:
              return null;
          }
        })}

        {/* Page numbers */}
        <Text
          style={latexStyles.pageNumber}
          render={({ pageNumber }) => `${pageNumber}`}
          fixed
        />
      </Page>
    </Document>
  );
}

/**
 * Generate PDF from LaTeX content
 */
export async function generateLatexPDF(latex: string): Promise<Blob> {
  const doc = <LaTeXPDFDocument latex={latex} />;
  const blob = await pdf(doc).toBlob();
  return blob;
}

export { LaTeXPDFDocument };
