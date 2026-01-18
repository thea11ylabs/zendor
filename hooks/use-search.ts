"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export interface SearchResult {
  _id: Id<"messages">;
  chatId: Id<"chats">;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  chatTitle: string;
  score?: number; // For RAG search relevance
}

export type SearchMode = "keyword" | "semantic";

export function useSearch(query: string, mode: SearchMode = "keyword") {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the search query
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const keywordResults = useQuery(
    api.messages.search,
    mode === "keyword" && debouncedQuery.trim()
      ? { query: debouncedQuery, limit: 20 }
      : "skip"
  );

  return {
    results: (keywordResults || []) as SearchResult[],
    isSearching: debouncedQuery.trim() !== "" && keywordResults === undefined,
  };
}

export function useRagSearch() {
  const ragSearch = useAction(api.messages.ragSearch);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(
    async (query: string, chatId?: Id<"chats">) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchResults = await ragSearch({
          query,
          limit: 10,
          chatId,
        });
        setResults(searchResults as SearchResult[]);
      } catch (error) {
        console.error("RAG search failed:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [ragSearch]
  );

  return {
    results,
    isSearching,
    search,
  };
}

export function useSearchInChat(chatId: Id<"chats"> | null, query: string) {
  const results = useQuery(
    api.messages.searchInChat,
    chatId && query.trim() ? { chatId, query, limit: 20 } : "skip"
  );

  return {
    results: results || [],
    isSearching: query.trim() !== "" && results === undefined,
  };
}
