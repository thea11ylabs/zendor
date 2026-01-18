import type { LaTeXCompletion } from "./latex-completions";

// Package-specific completions that can be dynamically loaded
// when the user has those packages in their document

export const packageCompletions: Record<string, LaTeXCompletion[]> = {
  // amsmath package
  amsmath: [
    { label: "\\boldsymbol", displayLabel: "\\boldsymbol", detail: "Bold symbol (amsmath)", type: "function", category: "Math", snippet: "\\boldsymbol{#{}}" },
    { label: "\\text", displayLabel: "\\text", detail: "Text in math mode", type: "function", category: "Math", snippet: "\\text{#{}}" },
    { label: "\\intertext", displayLabel: "\\intertext", detail: "Text between equations", type: "function", category: "Math", snippet: "\\intertext{#{}}" },
    { label: "\\DeclareMathOperator", displayLabel: "\\DeclareMathOperator", detail: "Declare math operator", type: "function", category: "Math", snippet: "\\DeclareMathOperator{#{}}{{#{}}}" },
  ],

  // geometry package
  geometry: [
    { label: "\\geometry", displayLabel: "\\geometry", detail: "Set page geometry", type: "function", category: "Layout", snippet: "\\geometry{#{}}" },
  ],

  // hyperref package
  hyperref: [
    { label: "\\hypersetup", displayLabel: "\\hypersetup", detail: "Configure hyperref", type: "function", category: "Hyperlinks", snippet: "\\hypersetup{#{}}" },
    { label: "\\href", displayLabel: "\\href", detail: "Hyperlink", type: "function", category: "Hyperlinks", snippet: "\\href{#{}}{{#{}}}" },
    { label: "\\url", displayLabel: "\\url", detail: "URL", type: "function", category: "Hyperlinks", snippet: "\\url{#{}}" },
    { label: "\\autoref", displayLabel: "\\autoref", detail: "Automatic reference", type: "function", category: "Hyperlinks", snippet: "\\autoref{#{}}" },
  ],

  // graphicx package
  graphicx: [
    { label: "\\includegraphics", displayLabel: "\\includegraphics", detail: "Include graphics", type: "function", category: "Graphics", snippet: "\\includegraphics[width=#{0.8\\textwidth}]{#{}}" },
    { label: "\\scalebox", displayLabel: "\\scalebox", detail: "Scale content", type: "function", category: "Graphics", snippet: "\\scalebox{#{}}{{#{}}}" },
    { label: "\\rotatebox", displayLabel: "\\rotatebox", detail: "Rotate content", type: "function", category: "Graphics", snippet: "\\rotatebox{#{}}{{#{}}}" },
  ],

  // xcolor package
  xcolor: [
    { label: "\\textcolor", displayLabel: "\\textcolor", detail: "Colored text", type: "function", category: "Color", snippet: "\\textcolor{#{}}{{#{}}}" },
    { label: "\\colorbox", displayLabel: "\\colorbox", detail: "Colored box", type: "function", category: "Color", snippet: "\\colorbox{#{}}{{#{}}}" },
    { label: "\\definecolor", displayLabel: "\\definecolor", detail: "Define color", type: "function", category: "Color", snippet: "\\definecolor{#{}}{RGB}{#{}}" },
  ],

  // tikz package
  tikz: [
    { label: "\\tikz", displayLabel: "\\tikz", detail: "Inline TikZ", type: "function", category: "Graphics", snippet: "\\tikz{#{}}" },
    { label: "\\node", displayLabel: "\\node", detail: "TikZ node", type: "function", category: "Graphics", snippet: "\\node[#{}] at (#{}) {#{}};" },
    { label: "\\draw", displayLabel: "\\draw", detail: "TikZ draw", type: "function", category: "Graphics", snippet: "\\draw[#{}] (#{}) -- (#{})" },
  ],

  // listings package
  listings: [
    { label: "\\lstset", displayLabel: "\\lstset", detail: "Configure listings", type: "function", category: "Code", snippet: "\\lstset{#{}}" },
    { label: "\\lstinline", displayLabel: "\\lstinline", detail: "Inline code", type: "function", category: "Code", snippet: "\\lstinline{#{}}" },
  ],

  // algorithm/algorithmic packages
  algorithm: [
    { label: "\\REQUIRE", detail: "Algorithm requirements", type: "keyword", category: "Algorithm" },
    { label: "\\ENSURE", detail: "Algorithm guarantees", type: "keyword", category: "Algorithm" },
    { label: "\\STATE", detail: "Algorithm state", type: "keyword", category: "Algorithm" },
    { label: "\\IF", displayLabel: "\\IF", detail: "Algorithm if", type: "function", category: "Algorithm", snippet: "\\IF{#{}}" },
    { label: "\\ENDIF", detail: "Algorithm endif", type: "keyword", category: "Algorithm" },
    { label: "\\FOR", displayLabel: "\\FOR", detail: "Algorithm for loop", type: "function", category: "Algorithm", snippet: "\\FOR{#{}}" },
    { label: "\\ENDFOR", detail: "Algorithm endfor", type: "keyword", category: "Algorithm" },
    { label: "\\WHILE", displayLabel: "\\WHILE", detail: "Algorithm while loop", type: "function", category: "Algorithm", snippet: "\\WHILE{#{}}" },
    { label: "\\ENDWHILE", detail: "Algorithm endwhile", type: "keyword", category: "Algorithm" },
  ],

  // biblatex package
  biblatex: [
    { label: "\\addbibresource", displayLabel: "\\addbibresource", detail: "Add bibliography resource", type: "function", category: "Bibliography", snippet: "\\addbibresource{#{}}" },
    { label: "\\printbibliography", detail: "Print bibliography", type: "keyword", category: "Bibliography" },
    { label: "\\cite", displayLabel: "\\cite", detail: "Citation", type: "function", category: "Bibliography", snippet: "\\cite{#{}}" },
    { label: "\\textcite", displayLabel: "\\textcite", detail: "Text citation", type: "function", category: "Bibliography", snippet: "\\textcite{#{}}" },
    { label: "\\parencite", displayLabel: "\\parencite", detail: "Parenthetical citation", type: "function", category: "Bibliography", snippet: "\\parencite{#{}}" },
  ],
};

// Get completions for a specific package
export function getPackageCompletions(packageName: string): LaTeXCompletion[] {
  return packageCompletions[packageName] || [];
}

// Get all completions for an array of packages
export function getCompletionsForPackages(packages: string[]): LaTeXCompletion[] {
  const allCompletions: LaTeXCompletion[] = [];
  for (const pkg of packages) {
    allCompletions.push(...getPackageCompletions(pkg));
  }
  return allCompletions;
}
