"use client";

import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { useConvexErrorHandler } from "./use-convex-error-handler";

export function useChats() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.chats.list,
    {},
    { initialNumItems: 20 }
  );
  const createChat = useMutation(api.chats.create);
  const updateTitle = useMutation(api.chats.updateTitle);
  const removeChat = useMutation(api.chats.remove);
  const forkChat = useMutation(api.chats.fork);
  const { executeWithErrorHandling } = useConvexErrorHandler();

  return {
    chats: results || [],
    isLoading: status === "LoadingFirstPage",
    isLoadingMore: status === "LoadingMore",
    canLoadMore: status === "CanLoadMore",
    isComplete: status === "Exhausted",
    loadMore: () => loadMore(20),
    status,
    createChat: async (title?: string) => {
      return executeWithErrorHandling(
        () => createChat({ title }),
        "create-chat"
      );
    },
    updateTitle: async (chatId: Id<"chats">, title: string) => {
      return executeWithErrorHandling(
        () => updateTitle({ chatId, title }),
        "update-title"
      );
    },
    removeChat: async (chatId: Id<"chats">) => {
      return executeWithErrorHandling(
        () => removeChat({ chatId }),
        "remove-chat"
      );
    },
    forkChat: async (chatId: Id<"chats">, messageIndex: number) => {
      return executeWithErrorHandling(
        () => forkChat({ chatId, messageIndex }),
        "fork-chat"
      );
    },
  };
}

export function useChatThread(chatId: Id<"chats"> | null) {
  const chat = useQuery(
    api.chats.get,
    chatId ? { chatId } : "skip"
  );
  const addMessageMutation = useMutation(api.messages.add);
  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.list,
    chatId ? { chatId } : "skip",
    { initialNumItems: 20 }
  );
  const { executeWithErrorHandling } = useConvexErrorHandler();

  console.log("New Chat Id", chatId, results?.some(
    (msg) => msg.role === "assistant" && msg.streamId && !msg.content
  ) ?? false,);
  return {
    chat,
    isLoading: results === undefined,
    addMessage: async (
      role: "user" | "assistant",
      content: string,
      chatIdForMessage?: Id<"chats">,
      attachments?: { name: string; type: string; url: string }[],
      editVersion?: number
    ) => {
      const targetChatId = chatIdForMessage ?? chatId;
      if (!targetChatId) {
        throw new Error("No chat selected");
      }
      return executeWithErrorHandling(
        () => addMessageMutation({ chatId: targetChatId, role, content, attachments, editVersion }),
        "add-message"
      );
    },
    messages: results || [],
    loadMore: () => loadMore(20),
    status,
    canLoadMore: status === "CanLoadMore",
    isComplete: status === "Exhausted",
    threadIsStreaming: results?.some(
      (msg) => msg.role === "assistant" && msg.streamId && !msg.content
    ) ?? false,
  };
}
