import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useDocument(documentId: Id<"documents"> | null, enabled = true) {
  const document = useQuery(
    api.documents.get,
    documentId && enabled ? { id: documentId } : "skip"
  );
  const updateMutation = useMutation(api.documents.update);
  const updateTitleMutation = useMutation(api.documents.updateTitle);

  const [localContent, setLocalContent] = useState("");
  const [localVersion, setLocalVersion] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savingRef = useRef(false); // Track if a save is in progress
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const pendingSaveRef = useRef<{ content: string; version: number } | null>(null);

  // Initialize local state from document
  useEffect(() => {
    if (document) {
      setLocalContent(document.content);
      setLocalVersion(document.version);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.content, document?.version]);

  // Auto-save - fire and forget for speed
  const saveContent = useCallback(
    (content: string, version: number) => {
      if (!documentId) return;

      // If already saving, queue this save
      if (savingRef.current) {
        pendingSaveRef.current = { content, version };
        return;
      }

      savingRef.current = true;
      setIsSaving(true);

      // Fire and forget - don't await
      updateMutation({
        id: documentId,
        content,
        version,
      })
        .then((result) => {
          setLocalVersion(result.version);
          setLastSavedAt(new Date());
          savingRef.current = false;
          setIsSaving(false);

          // If there's a pending save, process it
          if (pendingSaveRef.current) {
            const pending = pendingSaveRef.current;
            pendingSaveRef.current = null;
            saveContent(pending.content, result.version);
          }
        })
        .catch((error) => {
          console.error("Failed to save document:", error);
          savingRef.current = false;
          setIsSaving(false);
          // If version mismatch, reload from server
          if (error instanceof Error && error.message.includes("version mismatch")) {
            setLocalVersion(document?.version || 0);
            setLocalContent(document?.content || "");
          }
        });
    },
    [documentId, updateMutation, document?.version, document?.content]
  );

  // Update content with auto-save - consistent 2s delay, non-blocking save
  const updateContent = useCallback(
    (newContent: string) => {
      setLocalContent(newContent);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Consistent 2 second debounce - save runs async and won't block UI
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(newContent, localVersion);
      }, 2000);
    },
    [saveContent, localVersion]
  );

  // Update title
  const updateTitle = useCallback(
    async (title: string) => {
      if (!documentId) return;
      try {
        await updateTitleMutation({ id: documentId, title });
      } catch (error) {
        console.error("Failed to update title:", error);
      }
    },
    [documentId, updateTitleMutation]
  );

  // Manual save
  const save = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    saveContent(localContent, localVersion);
  }, [saveContent, localContent, localVersion]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    document,
    content: localContent,
    updateContent,
    updateTitle,
    save,
    isSaving,
    lastSavedAt,
    isSaved: !isSaving && document?.content === localContent,
  };
}
