"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, X, Plus, Trash2, Copy, FileDown, Loader } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { githubDark } from "@uiw/codemirror-theme-github";
import { Button } from "../ui/button";

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackagesFromImports: (code: string) => Promise<void>;
}

interface CodeCell {
  id: string;
  code: string;
  output: string;
  error: boolean;
  running: boolean;
}

interface PythonRunnerProps {
  isOpen: boolean;
  onToggle: () => void;
  onInsertOutput?: (output: string) => void;
}

export default function PythonRunner({
  isOpen,
  onToggle,
  onInsertOutput,
}: PythonRunnerProps) {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [loading, setLoading] = useState(false);
  const [cells, setCells] = useState<CodeCell[]>([
    {
      id: crypto.randomUUID(),
      code: "# Write Python code here\nprint('Hello, World!')",
      output: "",
      error: false,
      running: false,
    },
  ]);
  const pyodideRef = useRef<PyodideInterface | null>(null);

  // Load Pyodide
  useEffect(() => {
    if (!isOpen || pyodideRef.current) return;

    const loadPyodide = async () => {
      setLoading(true);
      try {
        // Load Pyodide from CDN
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
        script.async = true;

        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Pyodide"));
          document.head.appendChild(script);
        });

        // Initialize Pyodide
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pyodideInstance = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
        });

        // Set up stdout/stderr capture
        await pyodideInstance.runPythonAsync(`
import sys
from io import StringIO

class CaptureOutput:
    def __init__(self):
        self.stdout = StringIO()
        self.stderr = StringIO()

    def __enter__(self):
        self._stdout = sys.stdout
        self._stderr = sys.stderr
        sys.stdout = self.stdout
        sys.stderr = self.stderr
        return self

    def __exit__(self, *args):
        sys.stdout = self._stdout
        sys.stderr = self._stderr

capture = CaptureOutput()
        `);

        pyodideRef.current = pyodideInstance;
        setPyodide(pyodideInstance);
      } catch (err) {
        console.error("Failed to load Pyodide:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPyodide();
  }, [isOpen]);

  const runCode = useCallback(
    async (cellId: string) => {
      if (!pyodide) return;

      const cellIndex = cells.findIndex((c) => c.id === cellId);
      if (cellIndex === -1) return;

      const cell = cells[cellIndex];

      // Mark as running
      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? { ...c, running: true, output: "", error: false }
            : c
        )
      );

      try {
        // Load any required packages
        await pyodide.loadPackagesFromImports(cell.code);

        // Run with output capture
        const result = await pyodide.runPythonAsync(`
with capture:
    exec('''${cell.code.replace(/'/g, "\\'")}''')
output = capture.stdout.getvalue() + capture.stderr.getvalue()
capture.stdout.truncate(0)
capture.stdout.seek(0)
capture.stderr.truncate(0)
capture.stderr.seek(0)
output
      `);

        setCells((prev) =>
          prev.map((c) =>
            c.id === cellId
              ? {
                  ...c,
                  output: String(result || ""),
                  running: false,
                  error: false,
                }
              : c
          )
        );
      } catch (err) {
        setCells((prev) =>
          prev.map((c) =>
            c.id === cellId
              ? { ...c, output: String(err), running: false, error: true }
              : c
          )
        );
      }
    },
    [pyodide, cells]
  );

  const addCell = () => {
    setCells((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        code: "",
        output: "",
        error: false,
        running: false,
      },
    ]);
  };

  const deleteCell = (id: string) => {
    if (cells.length <= 1) return;
    setCells((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCode = (id: string, code: string) => {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, code } : c)));
  };

  const copyOutput = (output: string) => {
    navigator.clipboard.writeText(output);
  };

  const insertToDoc = (output: string) => {
    onInsertOutput?.(output);
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-[500px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700 shadow-xl transform transition-transform z-30 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Python Runner
            </h2>
            {loading && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Loader className="h-3 w-3 animate-spin" />
                Loading Pyodide...
              </span>
            )}
            {pyodide && !loading && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Ready
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addCell}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400"
              title="Add cell"
            >
              <Plus className="h-4 w-4" />
            </button>
            <Button
              onClick={onToggle}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
            >
              <X className="h-5 w-5 text-zinc-500" />
            </Button>
          </div>
        </div>

        {/* Cells */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cells.map((cell, index) => (
            <div
              key={cell.id}
              className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
            >
              {/* Cell header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <span className="text-xs text-zinc-500">In [{index + 1}]</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => runCode(cell.id)}
                    disabled={!pyodide || cell.running}
                    className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-green-600 dark:text-green-400 disabled:opacity-50"
                    title="Run cell"
                  >
                    {cell.running ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteCell(cell.id)}
                    disabled={cells.length <= 1}
                    className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-red-600 disabled:opacity-50"
                    title="Delete cell"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Code input with syntax highlighting */}
              <CodeMirror
                value={cell.code}
                onChange={(value) => updateCode(cell.id, value)}
                extensions={[python()]}
                theme={githubDark}
                placeholder="# Enter Python code..."
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  highlightActiveLine: true,
                }}
                style={{ fontSize: "13px" }}
              />

              {/* Output */}
              {cell.output && (
                <div
                  className={`border-t border-zinc-200 dark:border-zinc-700 ${cell.error ? "bg-red-50 dark:bg-red-900/20" : "bg-zinc-50 dark:bg-zinc-800"}`}
                >
                  <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-200 dark:border-zinc-700">
                    <span className="text-xs text-zinc-500">
                      Out [{index + 1}]
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyOutput(cell.output)}
                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500"
                        title="Copy output"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => insertToDoc(cell.output)}
                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-blue-500"
                        title="Insert to document"
                      >
                        <FileDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <pre
                    className={`px-3 py-2 text-sm font-mono overflow-x-auto ${cell.error ? "text-red-600 dark:text-red-400" : "text-zinc-800 dark:text-zinc-200"}`}
                  >
                    {cell.output}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-20" onClick={onToggle} />
      )}
    </>
  );
}
