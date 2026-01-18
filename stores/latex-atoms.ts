import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

export const pdfContentAtom = atom<string>("");

// Atom for LaTeX compilation with caching
// Handles server-side and client-side LaTeX compilation with automatic fallback
export const latexCompilationAtom = atomWithQuery((get) => {
    const content = get(pdfContentAtom);
    return {
        queryKey: ["latex-compilation", content],
        queryFn: async () => {
            if (!content) {
                throw new Error("No content provided");
            }

            const startTime = Date.now();

            try {
                // Try server-side compilation first
                const response = await fetch("/api/compile-latex", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ content }),
                });

                if (response.ok) {
                    // Server-side compilation successful
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const compilationTime = Date.now() - startTime;

                    console.log(`✓ LaTeX compiled server-side in ${compilationTime}ms`);
                    return { url, source: "server" as const, compilationTime };
                } else {
                    // Server-side failed, try client-side SwiftLaTeX WASM
                    console.log(
                        "Server-side compilation unavailable, falling back to client-side WASM...",
                    );

                    const { compileLaTeX } = await import("@/lib/tex-compiler");
                    const pdfData = await compileLaTeX(content);
                    // Convert Uint8Array to ArrayBuffer by creating a new Uint8Array with a regular ArrayBuffer
                    const arrayBuffer = new Uint8Array(pdfData).buffer;
                    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
                    const url = URL.createObjectURL(blob);
                    const compilationTime = Date.now() - startTime;

                    console.log(
                        `✓ LaTeX compiled client-side (WASM) in ${compilationTime}ms`,
                    );
                    return { url, source: "client" as const, compilationTime };
                }
            } catch (err) {
                console.error("LaTeX compilation error:", err);
                const errorMsg =
                    err instanceof Error ? err.message : "Failed to compile LaTeX";

                // Check if error is due to missing format file (SwiftLaTeX servers down)
                if (
                    errorMsg.includes("format file") ||
                    errorMsg.includes("swiftlatexpdftex.fmt")
                ) {
                    throw new Error(
                        "LaTeX compilation unavailable: SwiftLaTeX servers are down. Install pdflatex locally: brew install basictex",
                    );
                }
                throw new Error(errorMsg);
            }
        },
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        enabled: !!content, // Only enable when content is provided
    };
});

// Type for compilation result
export type CompilationResult = {
    url: string;
    source: "server" | "client";
    compilationTime: number;
};

// Editor state atoms
export const editorContentAtom = atom<string>("");
export const editorCursorPositionAtom = atom<{ line: number; column: number }>({ line: 0, column: 0 });
export const editorSelectionAtom = atom<{ start: number; end: number } | null>(null);

// Editor preferences (persisted in localStorage)
export const editorPreferencesAtom = atomWithStorage<{
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    theme: string;
    autoSave: boolean;
}>("editor-preferences", {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    theme: "vs-dark",
    autoSave: true,
});

// Document management atoms
export const currentDocumentIdAtom = atom<string | null>(null);
export const isDocumentDirtyAtom = atom<boolean>(false);
export const documentTitleAtom = atom<string>("Untitled Document");

// UI state atoms
export const isPreviewVisibleAtom = atom<boolean>(true);
export const previewModeAtom = atom<"inline" | "side-by-side" | "full">("side-by-side");
export const isCompilingAtom = atom<boolean>(false);

// LaTeX template atoms
export const latexTemplatesAtom = atom<Array<{
    id: string;
    name: string;
    content: string;
    description: string;
}>>([
    {
        id: "article",
        name: "Article",
        content: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\begin{document}

\\title{Your Title}
\\author{Your Name}
\\date{\\today}

\\maketitle

\\begin{abstract}
Your abstract here.
\\end{abstract}

\\section{Introduction}
Your introduction here.

\\end{document}`,
        description: "Standard article template",
    },
    {
        id: "beamer",
        name: "Presentation",
        content: `\\documentclass{beamer}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{Your Presentation Title}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\frame{\\titlepage}

\\begin{frame}
\\frametitle{Outline}
\\tableofcontents
\\end{frame}

\\section{Introduction}
\\begin{frame}
\\frametitle{Introduction}
Your introduction here.
\\end{frame}

\\end{document}`,
        description: "Beamer presentation template",
    },
]);


export const DEFAULT_LATEX = String.raw`\documentclass{article}
\usepackage{amsmath}

\title{LaTeX Demo}
\author{Author Name}

\begin{document}

\maketitle

\begin{abstract}
This is a test document for the LaTeX preview.
\end{abstract}

\section{Basic Math}

Inline math: $x^2 + y^2 = z^2$

Display math with equation:

\begin{equation}
E = mc^2
\end{equation}

Display math with brackets:

\[
a^2 + b^2 = c^2
\]

Display math with double dollars:

$$\frac{a}{b} = \frac{c}{d}$$

\section{More Math}

Greek letters: $\alpha, \beta, \gamma$

Fractions: $\frac{1}{2}$

Square root: $\sqrt{2}$

\section{Text Formatting}

You can use \textbf{bold text}, \textit{italic text}, and \texttt{monospace}.

\section{Lists}

\begin{itemize}
\item First item
\item Second item
\end{itemize}

\begin{enumerate}
\item One
\item Two
\end{enumerate}

\end{document}
`;
const STORAGE_KEY = "zendor-latex-document";
const NAME_KEY = "zendor-latex-document-name";
const latexStorage =
    typeof window === "undefined"
        ? undefined
        : createJSONStorage<string>(() => localStorage);

export const latexContentAtom = atomWithStorage<string>(
    STORAGE_KEY,
    DEFAULT_LATEX,
    latexStorage,
    { getOnInit: true }
);

export const latexNameAtom = atomWithStorage<string>(
    NAME_KEY,
    "Untitled LaTeX Document",
    latexStorage,
    { getOnInit: true }
);