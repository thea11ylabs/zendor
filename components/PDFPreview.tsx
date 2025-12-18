"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Download, ZoomIn, ZoomOut } from "lucide-react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { getCitations, parseCiteRefs } from "../lib/citations";

const styles = StyleSheet.create({
  page: {
    padding: 72, // 1 inch margins
    fontFamily: "Times-Roman",
    fontSize: 11,
    lineHeight: 1.5,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  author: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
  date: {
    fontSize: 10,
    textAlign: "center",
    marginBottom: 24,
    color: "#666",
  },
  abstract: {
    marginBottom: 20,
    paddingHorizontal: 36,
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
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
  },
  h1: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  h2: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
  },
  h3: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 4,
  },
  h4: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
  },
  paragraph: {
    textAlign: "justify",
    marginBottom: 10,
    textIndent: 24,
  },
  code: {
    fontFamily: "Courier",
    fontSize: 9,
    backgroundColor: "#f5f5f5",
    padding: 8,
    marginVertical: 8,
  },
  blockquote: {
    marginLeft: 24,
    marginRight: 24,
    fontStyle: "italic",
    marginVertical: 8,
  },
  list: {
    marginLeft: 24,
    marginBottom: 10,
  },
  listItem: {
    marginBottom: 4,
  },
  table: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    backgroundColor: "#f0f0f0",
  },
  tableCell: {
    flex: 1,
    padding: 4,
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: "#333",
  },
  tableCellLast: {
    flex: 1,
    padding: 4,
    fontSize: 9,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 4,
    fontSize: 9,
    fontWeight: "bold",
    borderRightWidth: 1,
    borderRightColor: "#333",
  },
  tableHeaderCellLast: {
    flex: 1,
    padding: 4,
    fontSize: 9,
    fontWeight: "bold",
  },
  references: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  refTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 12,
  },
  refItem: {
    fontSize: 10,
    marginBottom: 6,
    paddingLeft: 20,
    textIndent: -20,
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

interface PDFPreviewProps {
  content: string;
  title: string;
  author?: string;
  onClose: () => void;
  inline?: boolean;
}

// Strip inline markdown formatting for clean PDF text
function stripInlineMarkdown(text: string): string {
  return text
    // Remove bold **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    // Remove italic *text* or _text_
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Remove inline code `code`
    .replace(/`([^`]+)`/g, "$1")
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove images ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    // Remove strikethrough ~~text~~
    .replace(/~~(.+?)~~/g, "$1")
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, "")
    // Remove task list markers
    .replace(/\[[ x]\]/gi, "")
    // Replace Unicode arrows with ASCII (Times-Roman doesn't support →)
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/↔/g, "<->")
    .replace(/⇒/g, "=>")
    .replace(/⇐/g, "<=")
    // Clean up multiple spaces
    .replace(/\s+/g, " ")
    .trim();
}

// Parse a table row into cells
function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1) // Remove empty first/last from leading/trailing |
    .map((cell) => stripInlineMarkdown(cell.trim()));
}

// Check if line is a table separator (|---|---|)
function isTableSeparator(line: string): boolean {
  return /^\|[\s:-]+\|/.test(line) && /^[\s|:-]+$/.test(line);
}

// Check if line is a table row
function isTableRow(line: string): boolean {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

type ParsedElement =
  | { type: "h1" | "h2" | "h3" | "h4" | "paragraph" | "code" | "blockquote" | "listItem"; content: string }
  | { type: "table"; headers: string[]; rows: string[][] };

// Simple markdown parser for PDF
function parseMarkdown(content: string): ParsedElement[] {
  const lines = content.split("\n");
  const elements: ParsedElement[] = [];
  let inCodeBlock = false;
  let codeContent = "";
  let paragraphBuffer = "";
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  const flushParagraph = () => {
    if (paragraphBuffer.trim()) {
      elements.push({ type: "paragraph", content: stripInlineMarkdown(paragraphBuffer.trim()) });
      paragraphBuffer = "";
    }
  };

  const flushTable = () => {
    if (inTable && tableHeaders.length > 0) {
      elements.push({ type: "table", headers: tableHeaders, rows: tableRows });
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      flushParagraph();
      flushTable();
      if (inCodeBlock) {
        elements.push({ type: "code", content: codeContent.trim() });
        codeContent = "";
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + "\n";
      continue;
    }

    // Handle tables
    if (isTableRow(line)) {
      flushParagraph();
      if (!inTable) {
        // Check if next line is separator
        const nextLine = lines[i + 1];
        if (nextLine && isTableSeparator(nextLine)) {
          tableHeaders = parseTableRow(line);
          inTable = true;
          i++; // Skip separator line
          continue;
        }
      }
      if (inTable) {
        tableRows.push(parseTableRow(line));
        continue;
      }
    } else if (inTable) {
      flushTable();
    }

    // Skip horizontal rules
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushParagraph();
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      elements.push({ type: "h1", content: stripInlineMarkdown(line.slice(2)) });
    } else if (line.startsWith("## ")) {
      flushParagraph();
      elements.push({ type: "h2", content: stripInlineMarkdown(line.slice(3)) });
    } else if (line.startsWith("### ")) {
      flushParagraph();
      elements.push({ type: "h3", content: stripInlineMarkdown(line.slice(4)) });
    } else if (line.startsWith("#### ")) {
      flushParagraph();
      elements.push({ type: "h4", content: stripInlineMarkdown(line.slice(5)) });
    } else if (line.startsWith("> ")) {
      flushParagraph();
      elements.push({ type: "blockquote", content: stripInlineMarkdown(line.slice(2)) });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      elements.push({ type: "listItem", content: stripInlineMarkdown(line.slice(2)) });
    } else if (line.match(/^\d+\. /)) {
      flushParagraph();
      elements.push({ type: "listItem", content: stripInlineMarkdown(line.replace(/^\d+\. /, "")) });
    } else if (line.trim() === "") {
      flushParagraph();
    } else {
      // Accumulate paragraph lines
      paragraphBuffer += (paragraphBuffer ? " " : "") + line;
    }
  }

  flushParagraph();
  flushTable();
  return elements;
}

// PDF Document component
function ResearchPaperPDF({ content, title, author, citations }: {
  content: string;
  title: string;
  author?: string;
  citations: { author: string; title: string; journal?: string; year: string; doi?: string }[];
}) {
  const elements = parseMarkdown(content);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {author && <Text style={styles.author}>{author}</Text>}
        <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>

        {elements.map((el, i) => {
          switch (el.type) {
            case "h1":
              return <Text key={i} style={styles.h1}>{el.content}</Text>;
            case "h2":
              return <Text key={i} style={styles.h2}>{el.content}</Text>;
            case "h3":
              return <Text key={i} style={styles.h3}>{el.content}</Text>;
            case "h4":
              return <Text key={i} style={styles.h4}>{el.content}</Text>;
            case "paragraph":
              return <Text key={i} style={styles.paragraph}>{el.content}</Text>;
            case "code":
              return <Text key={i} style={styles.code}>{el.content}</Text>;
            case "blockquote":
              return <Text key={i} style={styles.blockquote}>{el.content}</Text>;
            case "listItem":
              return <Text key={i} style={styles.listItem}>• {el.content}</Text>;
            case "table":
              return (
                <View key={i} style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    {el.headers.map((header, hi) => (
                      <Text
                        key={hi}
                        style={hi === el.headers.length - 1 ? styles.tableHeaderCellLast : styles.tableHeaderCell}
                      >
                        {header}
                      </Text>
                    ))}
                  </View>
                  {el.rows.map((row, ri) => (
                    <View key={ri} style={styles.tableRow}>
                      {row.map((cell, ci) => (
                        <Text
                          key={ci}
                          style={ci === row.length - 1 ? styles.tableCellLast : styles.tableCell}
                        >
                          {cell}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              );
            default:
              return null;
          }
        })}

        {citations.length > 0 && (
          <View style={styles.references}>
            <Text style={styles.refTitle}>References</Text>
            {citations.map((c, i) => (
              <Text key={i} style={styles.refItem}>
                [{i + 1}] {c.author}, &quot;{c.title},&quot; {c.journal && `${c.journal}, `}{c.year}.{c.doi && ` doi:${c.doi}`}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export default function PDFPreview({ content, title, author, onClose, inline = false }: PDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(inline ? 80 : 100);

  // Memoize citations to avoid new array on each render
  const citations = useMemo(() => getCitations(), []);

  // Memoize usedKeys based on content
  const usedKeys = useMemo(() => parseCiteRefs(content), [content]);

  // Process used citations
  const usedCitations = useMemo(() =>
    usedKeys
      .map((key) => citations.find((c) => c.key === key))
      .filter((c): c is NonNullable<typeof c> => c !== undefined),
    [usedKeys, citations]
  );

  // Replace \cite{key} with [n]
  const processedContent = useMemo(() => {
    let result = content;
    usedKeys.forEach((key, index) => {
      const regex = new RegExp(`\\\\cite\\{${key}\\}`, "g");
      result = result.replace(regex, `[${index + 1}]`);
    });
    return result;
  }, [content, usedKeys]);

  // Stringify for stable dependency
  const citationsKey = useMemo(() => JSON.stringify(usedCitations), [usedCitations]);

  useEffect(() => {
    // Debounce PDF generation to avoid too many re-renders
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const parsedCitations = JSON.parse(citationsKey);
        const blob = await pdf(
          <ResearchPaperPDF
            content={processedContent}
            title={title}
            author={author}
            citations={parsedCitations}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (err) {
        console.error("PDF generation error:", err);
      } finally {
        setLoading(false);
      }
    }, 800); // 800ms debounce

    return () => {
      clearTimeout(timeoutId);
    };
  }, [processedContent, title, author, citationsKey]);

  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      a.click();
    }
  };

  // Inline mode - just the PDF content, no UI
  if (inline) {
    return (
      <div className="h-full w-full bg-zinc-800">
        {loading ? (
          <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
            Generating PDF...
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="PDF Preview"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-red-400 text-sm">
            Failed to generate PDF
          </div>
        )}
      </div>
    );
  }

  // Full-screen overlay mode
  return (
    <div className="fixed inset-0 z-50 bg-zinc-900 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-zinc-700 rounded">
            <X className="h-5 w-5 text-white" />
          </button>
          <span className="text-white font-medium">{title}.pdf</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="p-2 hover:bg-zinc-700 rounded">
            <ZoomOut className="h-4 w-4 text-white" />
          </button>
          <span className="text-white text-sm w-16 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-2 hover:bg-zinc-700 rounded">
            <ZoomIn className="h-4 w-4 text-white" />
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 ml-4">
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-8 bg-zinc-700">
        {loading ? (
          <div className="text-white">Generating PDF...</div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="bg-white shadow-2xl"
            style={{
              width: `${8.5 * zoom}px`,
              height: `${11 * zoom}px`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
            }}
            title="PDF Preview"
          />
        ) : (
          <div className="text-red-400">Failed to generate PDF</div>
        )}
      </div>
    </div>
  );
}
