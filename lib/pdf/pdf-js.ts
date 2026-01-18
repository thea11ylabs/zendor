import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";

let PDFJS: typeof import("pdfjs-dist") | null = null;
let workerInitialized = false;

async function ensurePDFJS() {
  if (typeof window === "undefined") return null;
  if (PDFJS) return PDFJS;
  PDFJS = await import("pdfjs-dist");
  return PDFJS;
}

export async function ensurePdfJsWorker() {
  const pdfjs = await ensurePDFJS();
  if (!pdfjs || workerInitialized) return;

  pdfjs.GlobalWorkerOptions.workerPort = new Worker(
    new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url)
  );
  workerInitialized = true;
}

export const imageResourcesPath = "/images/pdfjs-dist/";
const cMapUrl = "/js/pdfjs-dist/cmaps/";
const wasmUrl = "/js/pdfjs-dist/wasm/";
const iccUrl = "/js/pdfjs-dist/iccs/";
const standardFontDataUrl = "/fonts/pdfjs-dist/";

const disableStream = process.env.NODE_ENV !== "test";

export async function loadPdfDocumentFromUrl(
  url: string,
  options: Partial<DocumentInitParameters> = {}
) {
  const pdfjs = await ensurePDFJS();
  if (!pdfjs) throw new Error("PDF.js not available in SSR environment");

  const disableFontFace =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("disable-font-face") ===
      "true";

  await ensurePdfJsWorker();

  return pdfjs.getDocument({
    url,
    cMapUrl,
    wasmUrl,
    iccUrl,
    standardFontDataUrl,
    disableFontFace,
    disableAutoFetch: true,
    disableStream,
    isEvalSupported: false,
    enableXfa: false,
    ...options,
  });
}

export async function getPDFJS() {
  return ensurePDFJS();
}
