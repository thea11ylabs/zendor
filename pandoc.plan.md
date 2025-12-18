# Overleaf PDF Rendering Analysis & Plan

## How Overleaf Renders PDFs

### Architecture Overview

1. **CLSI (Common LaTeX Service Interface)** - `/services/clsi/`
   - RESTful API for compiling LaTeX documents
   - Runs LaTeX compilers (pdflatex, xelatex, lualatex) in Docker containers
   - Uses TeX Live Docker images for actual compilation
   - Returns compiled PDF via URL endpoint

2. **Web Frontend** - `/services/web/frontend/js/features/pdf-preview/`
   - Uses **PDF.js** (Mozilla's library) to render PDFs in browser
   - `PDFJSWrapper` class wraps the PDF.js viewer
   - Supports zooming, page navigation, synctex (click to jump to source)
   - Renders PDF pages to canvas elements

### Key Components

```
POST /project/<project-id>/compile
{
  compile: {
    options: { compiler: 'pdflatex', timeout: 60 },
    rootResourcePath: 'main.tex',
    resources: [{ path: 'main.tex', content: '...' }]
  }
}

Response:
{
  compile: {
    status: 'success',
    outputFiles: [
      { type: 'pdf', url: '/project/<id>/output/output.pdf' }
    ]
  }
}
```

### Auto-Compile Feature
- `useCompileTriggers` hook listens for:
  - `doc:changed` events (when document is edited)
  - Keyboard shortcuts (Cmd+S, Cmd+Enter, Ctrl+.)
- `autoCompile` setting triggers recompile after document changes
- Uses debouncing to prevent excessive recompilations

### PDF Viewing with PDF.js
- `PDFViewer` from `pdfjs-dist` renders PDF pages
- Supports annotations, links, text selection
- Custom transport for streaming/caching PDF chunks
- Synctex integration for bidirectional navigation

---

## Plan for Zendor PDF Features

### Option 1: Browser-Based (Current Approach - Improve)
**@react-pdf/renderer** - Client-side PDF generation
- Pros: No server needed, works offline
- Cons: Limited markdown/LaTeX support, font issues

**Improvements needed:**
1. Fix Unicode characters (arrows, special symbols)
2. Better font support (use web fonts with full Unicode)
3. Improve table rendering
4. Add page breaks

### Option 2: Server-Side with LaTeX (Like Overleaf)
Use actual LaTeX compilation for true research paper quality:

1. **Option 2a: Local LaTeX via WASM**
   - Use `texlive.js` or similar WASM-compiled TeX
   - Runs in browser, no server needed
   - Limited but works offline

2. **Option 2b: Server-side LaTeX**
   - Set up CLSI-like service
   - Run pdflatex/xelatex in Docker
   - Best quality but requires server infrastructure

3. **Option 2c: Pandoc WASM**
   - Already have `pandoc-wasm` installed
   - Convert markdown to LaTeX, then to PDF
   - Middle ground between quality and complexity

### Option 3: Hybrid PDF.js Viewer
Use PDF.js like Overleaf for viewing any generated PDF:

```tsx
// Install pdfjs-dist
import { PDFViewer, EventBus } from 'pdfjs-dist/web/pdf_viewer.mjs'

// Create viewer
const viewer = new PDFViewer({ container, eventBus })
viewer.setDocument(pdfDocument)
```

---

## Recommended Implementation

### Phase 1: Fix Current Issues
1. Use fonts with full Unicode support (Noto Sans/Serif)
2. Fix arrow character rendering (→)
3. Improve markdown stripping

### Phase 2: Add PDF View Toggle
Add a "PDF" button alongside current view modes:
- Split view: Editor | Markdown Preview
- PDF view: Editor | PDF Preview (live updating)

```tsx
export type ViewMode = "doc" | "editor" | "preview" | "split" | "pdf";
```

### Phase 3: Auto-Compile
Like Overleaf's auto-compile:
1. Debounce content changes (500ms-2s delay)
2. Regenerate PDF on each change
3. Show compilation status indicator

### Phase 4: Better PDF Generation (Future)
Consider pandoc-wasm or texlive.js for higher quality:
- True LaTeX rendering
- Better math support
- Professional typography

---

## Dependencies to Consider

- `pdfjs-dist` - Mozilla's PDF viewer (for viewing generated PDFs)
- `pandoc-wasm` - Already installed, can convert markdown to PDF
- `texlive.js` - WebAssembly TeX (future consideration)

## Notes on Fonts

For proper Unicode support including arrows (→), use:
- Google Noto fonts (comprehensive Unicode coverage)
- Or embed specific characters as SVG/paths
