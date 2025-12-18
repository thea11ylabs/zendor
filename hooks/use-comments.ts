"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

export function useComments(messageId: Id<"messages"> | null) {
  const comments = useQuery(
    api.comments.listByMessage,
    messageId ? { messageId } : "skip"
  );

  const createComment = useMutation(api.comments.create);
  const addReply = useMutation(api.comments.addReply);
  const toggleResolved = useMutation(api.comments.toggleResolved);
  const removeComment = useMutation(api.comments.remove);
  const updateComment = useMutation(api.comments.update);

  return {
    comments: comments || [],
    isLoading: messageId !== null && comments === undefined,

    createComment: async (
      selectionStart: number,
      selectionEnd: number,
      selectedText: string,
      content: string,
      author: string = "You"
    ) => {
      if (!messageId) throw new Error("No message selected");
      return createComment({
        messageId,
        selectionStart,
        selectionEnd,
        selectedText,
        content,
        author,
      });
    },

    addReply: async (
      commentId: Id<"comments">,
      content: string,
      author: string = "You"
    ) => {
      return addReply({ commentId, content, author });
    },

    toggleResolved: async (commentId: Id<"comments">) => {
      return toggleResolved({ commentId });
    },

    removeComment: async (commentId: Id<"comments">) => {
      return removeComment({ commentId });
    },

    updateComment: async (commentId: Id<"comments">, content: string) => {
      return updateComment({ commentId, content });
    },
  };
}

export function useChatComments(chatId: Id<"chats"> | null) {
  const comments = useQuery(
    api.comments.listByChat,
    chatId ? { chatId } : "skip"
  );

  return {
    comments: comments || [],
    isLoading: chatId !== null && comments === undefined,
    unresolvedCount: (comments || []).filter((c) => !c.resolved).length,
  };
}
