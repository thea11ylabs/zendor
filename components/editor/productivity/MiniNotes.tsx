"use client";

import { useMemo, useState } from "react";
import { X, Plus, Trash2, StickyNote } from "lucide-react";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { Button } from "../../ui/button";

interface Note {
  id: string;
  content: string;
  createdAt: number;
}

interface MiniNotesProps {
  isOpen: boolean;
  onToggle: () => void;
  documentKey: string;
}

export default function MiniNotes({
  isOpen,
  onToggle,
  documentKey,
}: MiniNotesProps) {
  const storageKey = `zendor-notes-${documentKey}`;

  const notesAtom = useMemo(() => {
    const storage =
      typeof window === "undefined"
        ? undefined
        : createJSONStorage<Note[]>(() => localStorage);

    return atomWithStorage<Note[]>(storageKey, [], storage, {
      getOnInit: true,
    });
  }, [storageKey]);

  const [notes, setNotes] = useAtom(notesAtom);
  const [newNote, setNewNote] = useState("");

  const addNote = () => {
    if (!newNote.trim()) return;

    const note: Note = {
      id: crypto.randomUUID(),
      content: newNote.trim(),
      createdAt: Date.now(),
    };

    setNotes([...notes, note]);
    setNewNote("");
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      addNote();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-zinc-900 border-l border-zinc-800 shadow-xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Notes</h2>
          <span className="text-xs text-zinc-500">{notes.length}</span>
        </div>
        <Button
          onClick={onToggle}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </Button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No notes yet. Add one below!
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-zinc-800 rounded-lg p-3 group hover:bg-zinc-700/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-zinc-200 flex-1 whitespace-pre-wrap break-words">
                  {note.content}
                </p>
                <Button
                  onClick={() => deleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                {new Date(note.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add note input */}
      <div className="border-t border-zinc-800 p-3">
        <div className="flex flex-col gap-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a note... (Cmd+Enter to save)"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
            rows={3}
          />
          <button
            onClick={addNote}
            disabled={!newNote.trim()}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
}
