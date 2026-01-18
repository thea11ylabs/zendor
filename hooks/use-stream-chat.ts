"use client";

import { useCallback, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { useSetAtom } from "jotai";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { shouldStreamAtom } from "@/stores/atoms";
import { AVAILABLE_MODELS, ModelOption } from "@/stores/atoms";
import { useConvexErrorHandler } from "./use-convex-error-handler";
import { useChatThread } from "./use-chats";
import { chatIdAtom } from "@/stores/atoms";

interface UseStreamChatOptions {
  chatId: Id<"chats"> | null;
  model: ModelOption;
  reasoningEffort?: "auto" | "deepthink";
  webSearch?: boolean;
}

export function useStreamChat({ chatId, model = AVAILABLE_MODELS[0], reasoningEffort, webSearch }: UseStreamChatOptions) {
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  const setShouldStream = useSetAtom(shouldStreamAtom);
  const [error, setError] = useState<string | null>(null);
  const setChatId = useSetAtom(chatIdAtom);
  const { executeWithErrorHandling } = useConvexErrorHandler();

  console.log("chatId in use-stream-cat is:", chatId);

  const {
    messages: convexMessages,
    isLoading: isLoadingConvexMessages,
    addMessage,
    threadIsStreaming,
  } = useChatThread(chatId);
  if (!convexSiteUrl) {
    const errorMsg = "Convex site URL is not defined";
    setError(errorMsg);
    console.error(errorMsg);
  }
  const streamUrl = convexSiteUrl
    ? new URL(`${convexSiteUrl}/chat-stream`)
    : null;

  const createStreamMutation = useMutation(api.chatThread.createStream);
  const cancelStreamMutation = useMutation(api.chatThread.cancelStream);
  const createChatMutation = useMutation(api.chats.create);
  const updateTitleMutation = useMutation(api.chats.updateTitle);
  const generateTitleAction = useAction(api.messages.generateTitle);

  const sendMessage = useCallback(async (content: string, editVersion?: number) => {
    if (!chatId || threadIsStreaming) return;

    setShouldStream(true); // Optimistic update
    setError(null); // Clear previous errors

    // Add user message
    const addMessageStatus = await addMessage("user", content, chatId, undefined, editVersion);

    if (!addMessageStatus) return; // Error handled by executeWithErrorHandling

    // Create stream
    const streamResult = await executeWithErrorHandling(
      () => createStreamMutation({ chatId, model: model.id, reasoningEffort, webSearch }),
      "create-stream"
    );

    if (!streamResult) {
      // Rollback optimistic update if stream creation failed
      setShouldStream(false);
      console.log("Failed to create stream", streamResult);
    }
  }, [chatId, threadIsStreaming, setShouldStream, addMessage, createStreamMutation, model, reasoningEffort, webSearch, executeWithErrorHandling]);

  const createChatAndSend = useCallback(async (content: string): Promise<Id<"chats"> | null> => {

    const tempTitle = content.slice(0, 50) + (content.length > 50 ? "..." : "");

    // Create new chat
    const newChatResult = await executeWithErrorHandling(
      () => createChatMutation({ title: tempTitle }),
      "create-chat"
    );

    if (!newChatResult) {
      setShouldStream(false);

      console.log("Failed to create chat");
      return null;
    }

    const newChatId = newChatResult;

    // Add user message
    const addMessageStatus = await addMessage("user", content, newChatId);

    if (!addMessageStatus) {
      setShouldStream(false);

      console.log("Failed to add message");
      return newChatId; // Return chat ID even if message failed
    }

    // Generate title (fire and forget with error handling)
    executeWithErrorHandling(
      () => generateTitleAction({ message: content, model: model.id }),
      "generate-title"
    ).then((titleResult) => {
      if (titleResult) {
        executeWithErrorHandling(
          () => updateTitleMutation({ chatId: newChatId, title: titleResult }),
          "update-title"
        );
      }
    });

    // Create stream
    const streamResult = await executeWithErrorHandling(
      () => createStreamMutation({ chatId: newChatId, model: model.id, reasoningEffort, webSearch }),
      "create-stream"
    );

    if (!streamResult) {
      setShouldStream(false);
      console.log("Failed to create stream for new chat", streamResult);
    }
    console.log("New chat created", newChatId);
    setChatId(newChatId);
    return newChatId;
  }, [setChatId, setShouldStream, createChatMutation, addMessage, createStreamMutation, updateTitleMutation, generateTitleAction, model, reasoningEffort, webSearch, executeWithErrorHandling]);

  // Return raw messages - streaming handled by StreamingMessage component
  const messages = (convexMessages ?? []).map((msg) => ({
    id: msg._id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    streamId: msg.streamId,
    editVersion: msg.editVersion,
  }));

  const stop = useCallback(async () => {
    if (!chatId) return;

    setShouldStream(false); // Immediate local update

    console.log("Stopping stream...");
    setError(null); // Clear previous errors

    await executeWithErrorHandling(
      () => cancelStreamMutation({ chatId }),
      "cancel-stream"
    );
  }, [chatId, setShouldStream, cancelStreamMutation, executeWithErrorHandling]);

  return {
    messages,
    streamUrl,
    sendMessage,
    createChatAndSend,
    stop,
    threadIsStreaming,
    isLoadingChatHistory: isLoadingConvexMessages,
    error,
    clearError: () => setError(null),
  };
}
