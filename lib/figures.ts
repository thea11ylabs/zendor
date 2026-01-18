// Figure management utilities for Excalidraw diagrams

import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

export interface Figure {
  id: string;
  label: string; // e.g., "fig:architecture"
  caption: string;
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  thumbnail?: string; // Base64 PNG thumbnail
  createdAt: string;
  updatedAt: string;
}

const FIGURES_KEY = "zendor-figures";

export function getFigures(): Figure[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FIGURES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveFigures(figures: Figure[]): void {
  localStorage.setItem(FIGURES_KEY, JSON.stringify(figures));
}

export function addFigure(figure: Omit<Figure, "id" | "createdAt" | "updatedAt">): Figure {
  const figures = getFigures();
  const now = new Date().toISOString();
  const newFigure: Figure = {
    ...figure,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  figures.push(newFigure);
  saveFigures(figures);
  return newFigure;
}

export function updateFigure(id: string, updates: Partial<Omit<Figure, "id" | "createdAt">>): Figure | null {
  const figures = getFigures();
  const index = figures.findIndex((f) => f.id === id);
  if (index !== -1) {
    figures[index] = {
      ...figures[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveFigures(figures);
    return figures[index];
  }
  return null;
}

export function deleteFigure(id: string): void {
  const figures = getFigures().filter((f) => f.id !== id);
  saveFigures(figures);
}

export function getFigureByLabel(label: string): Figure | undefined {
  return getFigures().find((f) => f.label === label);
}

export function getFigureById(id: string): Figure | undefined {
  return getFigures().find((f) => f.id === id);
}

// Generate a unique label for a figure
export function generateFigureLabel(baseName: string = "diagram"): string {
  const figures = getFigures();
  const existingLabels = new Set(figures.map((f) => f.label));

  let counter = 1;
  let label = `fig:${baseName}`;
  while (existingLabels.has(label)) {
    label = `fig:${baseName}-${counter}`;
    counter++;
  }
  return label;
}

export interface FigureRef {
  label: string;
  caption?: string;
  width?: string;
  height?: string;
}

// Parse ![Caption](fig:label) or ![Caption](fig:label "width=300,height=200") references
// Similar to markdown image syntax: ![alt](src "title")
export function parseFigureRefs(content: string): string[] {
  // Match ![...](fig:...) with optional "..." for dimensions
  const regex = /!\[[^\]]*\]\((fig:[^)\s"]+)(?:\s*"[^"]*")?\)/g;
  const refs: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    refs.push(match[1]);
  }
  return [...new Set(refs)];
}

// Find all figure refs with their dimensions
// Syntax: ![Caption](fig:label) or ![Caption](fig:label "width=400,height=300")
export function findAllFigureRefs(content: string): { fullMatch: string; ref: FigureRef }[] {
  // Match ![Caption](fig:label "dimensions")
  const regex = /!\[([^\]]*)\]\((fig:[^)\s"]+)(?:\s*"([^"]*)")?\)/g;
  const refs: { fullMatch: string; ref: FigureRef }[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const caption = match[1] || undefined;
    const label = match[2];
    const dimensionsStr = match[3];
    let width: string | undefined;
    let height: string | undefined;

    if (dimensionsStr) {
      const params = dimensionsStr.split(",");
      for (const param of params) {
        const [key, value] = param.split("=").map(s => s.trim());
        if (key === "width") width = value;
        if (key === "height") height = value;
      }
    }

    refs.push({
      fullMatch: match[0],
      ref: { label, caption, width, height }
    });
  }

  return refs;
}

// Get figure number based on order in document
export function getFigureNumber(label: string): number {
  const figures = getFigures();
  const index = figures.findIndex((f) => f.label === label);
  return index + 1;
}
