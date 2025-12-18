// Performance measurement utilities for editor

export interface PerfMetrics {
  inputLatency: number[];    // Time from keystroke to DOM update
  renderTime: number[];      // Time spent in React render
  avgInputLatency: number;
  p95InputLatency: number;
  avgRenderTime: number;
}

class EditorPerf {
  private inputLatencies: number[] = [];
  private renderTimes: number[] = [];
  private keystrokeStart: number = 0;
  private enabled: boolean = false;

  enable() {
    this.enabled = true;
    this.reset();
    console.log('[Perf] Editor performance monitoring enabled');
  }

  disable() {
    this.enabled = false;
    console.log('[Perf] Editor performance monitoring disabled');
  }

  reset() {
    this.inputLatencies = [];
    this.renderTimes = [];
  }

  // Call when keystroke starts (in CodeMirror onChange)
  markKeystroke() {
    if (!this.enabled) return;
    this.keystrokeStart = performance.now();
  }

  // Call after DOM update completes
  markDOMUpdate() {
    if (!this.enabled || !this.keystrokeStart) return;
    const latency = performance.now() - this.keystrokeStart;
    this.inputLatencies.push(latency);
    this.keystrokeStart = 0;

    // Warn if latency is high
    if (latency > 16) { // > 1 frame at 60fps
      console.warn(`[Perf] High input latency: ${latency.toFixed(2)}ms`);
    }
  }

  // Call to measure React render time
  measureRender(fn: () => void) {
    if (!this.enabled) {
      fn();
      return;
    }
    const start = performance.now();
    fn();
    const time = performance.now() - start;
    this.renderTimes.push(time);
  }

  getMetrics(): PerfMetrics {
    const sorted = [...this.inputLatencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      inputLatency: this.inputLatencies,
      renderTime: this.renderTimes,
      avgInputLatency: this.inputLatencies.length
        ? this.inputLatencies.reduce((a, b) => a + b, 0) / this.inputLatencies.length
        : 0,
      p95InputLatency: sorted[p95Index] || 0,
      avgRenderTime: this.renderTimes.length
        ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
        : 0,
    };
  }

  report() {
    const metrics = this.getMetrics();
    console.log('[Perf] Editor Performance Report:');
    console.log(`  Samples: ${this.inputLatencies.length}`);
    console.log(`  Avg Input Latency: ${metrics.avgInputLatency.toFixed(2)}ms`);
    console.log(`  P95 Input Latency: ${metrics.p95InputLatency.toFixed(2)}ms`);
    console.log(`  Avg Render Time: ${metrics.avgRenderTime.toFixed(2)}ms`);
    console.log(`  Target: <16ms for 60fps, <8ms for 120fps`);
    return metrics;
  }
}

export const editorPerf = new EditorPerf();

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as unknown as { editorPerf: EditorPerf }).editorPerf = editorPerf;
}
