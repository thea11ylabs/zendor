import katex from "katex";

export interface LatexError {
  from: number;
  to: number;
  message: string;
  fullMessage: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  fullError?: string;
}

// Clean up KaTeX error messages to be more readable
function simplifyError(message: string): { simple: string; full: string } {
  // Remove "KaTeX parse error: " prefix for full message
  const full = message.replace(/^KaTeX parse error:\s*/i, "");

  let simple = full;

  // Simplify common errors
  if (simple.includes("Undefined control sequence")) {
    const match = simple.match(/\\(\w+)/);
    simple = match ? `Unknown command: \\${match[1]}` : "Unknown command";
  } else if (simple.includes("Expected")) {
    const match = simple.match(/Expected '([^']+)'/);
    simple = match ? `Missing '${match[1]}'` : simple;
  } else if (simple.includes("Double superscript")) {
    simple = "Double superscript (use braces)";
  } else if (simple.includes("Double subscript")) {
    simple = "Double subscript (use braces)";
  } else if (simple.includes("Missing { inserted")) {
    simple = "Missing opening brace {";
  } else if (simple.includes("Extra")) {
    const match = simple.match(/Extra ([^\s]+)/);
    simple = match ? `Extra ${match[1]}` : "Extra character";
  } else if (simple.includes("Mismatched")) {
    simple = "Mismatched braces or delimiters";
  } else if (simple.length > 50) {
    // Truncate only the simple version if too long
    simple = simple.substring(0, 47) + "...";
  }

  return { simple, full };
}

// Validate a LaTeX string using KaTeX
export function validateLatex(latex: string): ValidationResult {
  try {
    katex.renderToString(latex, {
      throwOnError: true,
      strict: "error",
    });
    return { valid: true };
  } catch (e) {
    const rawMessage = e instanceof katex.ParseError ? e.message : String(e);
    const { simple, full } = simplifyError(rawMessage);
    return { valid: false, error: simple, fullError: full };
  }
}

// Find all LaTeX expressions in markdown and validate them
export function lintLatexInMarkdown(content: string): LatexError[] {
  const errors: LatexError[] = [];

  // Match display math: $$...$$
  const displayMathRegex = /\$\$([^$]+)\$\$/g;
  let match;

  while ((match = displayMathRegex.exec(content)) !== null) {
    const latex = match[1];
    const result = validateLatex(latex);
    if (!result.valid) {
      // For display math, the error position is relative to the $$ markers
      // Add 2 for the opening $$
      const latexStart = match.index + 2;
      errors.push({
        from: latexStart,
        to: latexStart + latex.length,
        message: result.error || "Invalid LaTeX",
        fullMessage: result.fullError || "Invalid LaTeX",
        severity: "error",
      });
    }
  }

  // Match inline math: $...$ (but not $$)
  const inlineMathRegex = /(?<!\$)\$([^$\n]+)\$(?!\$)/g;

  while ((match = inlineMathRegex.exec(content)) !== null) {
    const latex = match[1];
    const result = validateLatex(latex);
    if (!result.valid) {
      // For inline math, add 1 for the opening $
      const latexStart = match.index + 1;
      errors.push({
        from: latexStart,
        to: latexStart + latex.length,
        message: result.error || "Invalid LaTeX",
        fullMessage: result.fullError || "Invalid LaTeX",
        severity: "error",
      });
    }
  }

  return errors;
}
