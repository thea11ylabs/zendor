/**
 * Client-side LaTeX compilation using SwiftLaTeX WASM
 * This runs entirely in the browser without server dependencies
 */

interface PdfTeXEngine {
	loadEngine(): Promise<void>;
	writeMemFSFile(filename: string, content: string): void;
	setEngineMainFile(filename: string): void;
	compileLaTeX(): Promise<{ status: number; pdf?: Uint8Array; log?: string }>;
	flushCache(): void;
	latexWorker?: Worker;
}

interface PdfTeXEngineConstructor {
	new (): PdfTeXEngine;
}

declare global {
	interface Window {
		PdfTeXEngine: PdfTeXEngineConstructor;
	}
}

let engine: PdfTeXEngine | null = null;
let engineReady = false;

export async function initLaTeXEngine(): Promise<void> {
	if (engineReady) return;

	// Configure Module to locate WASM files correctly
	// @ts-expect-error - Module is a global set by SwiftLaTeX
	window.Module = window.Module || {};
	// @ts-expect-error - Module configuration
	window.Module.locateFile = (path: string) => {

		if (path.endsWith(".wasm") || path.endsWith(".js")) {
			return `/tex/${path}`;
		}
		return path;
	};

	// Dynamically load SwiftLaTeX engine script
	if (!window.PdfTeXEngine) {
		await new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src = "/tex/PdfTeXEngine.js";
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	if (!engine) {
		engine = new window.PdfTeXEngine();
		await engine.loadEngine();

		// Configure worker to use our proxy endpoint for TexLive resources
		// This bypasses CORS issues with the remote TexLive server
		// Note: Worker appends "pdftex/" to this URL, so we don't include it here
		if (engine.latexWorker) {
			const proxyUrl = `${window.location.origin}/api/texlive-proxy/`;
			console.log(`[LaTeX] Configuring TexLive endpoint: ${proxyUrl}`);
			engine.latexWorker.postMessage({
				cmd: "settexliveurl",
				url: proxyUrl,
			});
		}
	}

	engineReady = true;
}

export async function compileLaTeX(content: string): Promise<Uint8Array> {
	await initLaTeXEngine();

	if (!engine) {
		throw new Error("LaTeX engine not initialized");
	}

	// Write the main tex file to engine memory
	engine.writeMemFSFile("main.tex", content);

	// Set main file and compile
	engine.setEngineMainFile("main.tex");

	const result = await engine.compileLaTeX();

	if (result.status !== 0) {
		throw new Error(
			`LaTeX compilation failed: ${result.log || "Unknown error"}`,
		);
	}

	if (!result.pdf) {
		throw new Error("No PDF output generated");
	}

	return result.pdf;
}

export function isEngineReady(): boolean {
	return engineReady;
}

export function flushCache(): void {
	if (engine) {
		engine.flushCache();
	}
}
