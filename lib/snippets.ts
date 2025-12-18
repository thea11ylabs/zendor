// Snippets/Sticky notes management utilities

export interface Snippet {
  id: string;
  content: string;
  color: "yellow" | "blue" | "green" | "pink" | "purple";
  createdAt: string;
  updatedAt: string;
}

const SNIPPETS_KEY = "zendor-snippets";

export function getSnippets(): Snippet[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(SNIPPETS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveSnippets(snippets: Snippet[]): void {
  localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets));
}

export function addSnippet(snippet: Omit<Snippet, "id" | "createdAt" | "updatedAt">): Snippet {
  const snippets = getSnippets();
  const now = new Date().toISOString();
  const newSnippet: Snippet = {
    ...snippet,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  snippets.push(newSnippet);
  saveSnippets(snippets);
  return newSnippet;
}

export function updateSnippet(id: string, updates: Partial<Omit<Snippet, "id" | "createdAt">>): Snippet | null {
  const snippets = getSnippets();
  const index = snippets.findIndex((s) => s.id === id);
  if (index !== -1) {
    snippets[index] = {
      ...snippets[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveSnippets(snippets);
    return snippets[index];
  }
  return null;
}

export function deleteSnippet(id: string): void {
  const snippets = getSnippets().filter((s) => s.id !== id);
  saveSnippets(snippets);
}

export const SNIPPET_COLORS = {
  yellow: { bg: "bg-yellow-100 dark:bg-yellow-900/30", border: "border-yellow-300 dark:border-yellow-700" },
  blue: { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700" },
  green: { bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-300 dark:border-green-700" },
  pink: { bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-300 dark:border-pink-700" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-300 dark:border-purple-700" },
} as const;
