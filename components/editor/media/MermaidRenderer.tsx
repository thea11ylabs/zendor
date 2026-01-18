"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  chart: string;
  isDark?: boolean;
}

let mermaidInitialized = false;

export function MermaidRenderer({
  chart,
  isDark = false,
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        securityLevel: "loose",
        fontFamily: "system-ui, -apple-system, sans-serif",
      });
      mermaidInitialized = true;
    }
  }, [isDark]);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;

      try {
        // Update theme
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "loose",
          fontFamily: "system-ui, -apple-system, sans-serif",
        });

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError("");
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to render diagram"
        );
        setSvg("");
      }
    };

    renderChart();
  }, [chart, isDark]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400 font-mono">
          Mermaid Error: {error}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container flex justify-center my-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
