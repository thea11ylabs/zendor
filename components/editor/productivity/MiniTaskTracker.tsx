"use client";

import { useMemo, useState } from "react";
import { X, Plus, Trash2, CheckSquare, Square, ListTodo } from "lucide-react";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { tw } from "@/lib/utils";
interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

interface MiniTaskTrackerProps {
  isOpen: boolean;
  onToggle: () => void;
  documentKey: string;
}

export default function MiniTaskTracker({
  isOpen,
  onToggle,
  documentKey,
}: MiniTaskTrackerProps) {
  const storageKey = `zendor-tasks-${documentKey}`;

  const tasksAtom = useMemo(() => {
    const storage =
      typeof window === "undefined"
        ? undefined
        : createJSONStorage<Task[]>(() => localStorage);

    return atomWithStorage<Task[]>(storageKey, [], storage, {
      getOnInit: true,
    });
  }, [storageKey]);

  const [tasks, setTasks] = useAtom(tasksAtom);
  const [newTask, setNewTask] = useState("");

  const addTask = () => {
    if (!newTask.trim()) return;

    const task: Task = {
      id: crypto.randomUUID(),
      title: newTask.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    setTasks([...tasks, task]);
    setNewTask("");
  };

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-zinc-900 border-l border-zinc-800 shadow-xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Tasks</h2>
          <span className="text-xs text-zinc-500">
            {completedCount}/{totalCount}
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="px-4 py-2 border-b border-zinc-800">
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              {...tw(`h-full bg-gradient-to-r from-blue-500 
                to-violet-500 transition-all duration-300 w-[${(completedCount / totalCount) * 100}%]`)}
            />
          </div>
        </div>
      )}

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No tasks yet. Add one below!
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="bg-zinc-800 rounded-lg p-3 group hover:bg-zinc-700/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleTask(task.id)}
                  className="mt-0.5 shrink-0"
                >
                  {task.completed ? (
                    <CheckSquare className="w-4 h-4 text-green-400" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm wrap-break-word ${
                      task.completed
                        ? "text-zinc-500 line-through"
                        : "text-zinc-200"
                    }`}
                  >
                    {task.title}
                  </p>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all shrink-0"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add task input */}
      <div className="border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a task... (Enter to save)"
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <button
            onClick={addTask}
            disabled={!newTask.trim()}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
