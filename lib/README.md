# lib/

Reusable utilities, parsers, and helpers.

## Core Utilities

### `utils.ts`

- `cn()` - Tailwind class merging (clsx + tailwind-merge)
- `debounce()` - Debounce with cancel capability
- `tw()` - Dynamic Tailwind arbitrary value handler

### `constants.ts`

Application-wide constants.

## Markdown & Rendering

### `markdown/`

- `index.tsx` - Markdown processor
- `code-block.tsx` - Syntax-highlighted code blocks with Shiki

## LaTeX Support

### `latex-completions.ts`

Comprehensive LaTeX command autocompletion (~500+ commands).

### `latex-completions-overleaf.ts`

Overleaf-specific LaTeX completions.

### `latex-package-completions.ts`

LaTeX package autocompletion.

### `latex-linter.ts`

LaTeX syntax validation and error detection.

### `tex-compiler.ts`

Client-side LaTeX compilation wrapper using SwiftLaTeX WASM.

## Citations & Bibliography

### `citations.ts`

BibTeX citation management:

- Citation types: article, book, inproceedings, phdthesis, etc.
- Citation styles: IEEE, APA, MLA
- LocalStorage-based citation library
- Functions: `getCitations()`, `saveCitations()`, `addCitation()`, `formatCitation()`

## Figure/Media Management

### `figures.ts`

Figure extraction and management from markdown content.

## PDF Processing

### `pdf/`

- `pdf-js.ts` - PDF.js wrapper for client-side rendering
- `pdf-chunker.ts` - Chunks PDFs into 128KB segments with SHA-256 hashing
- `pdf-js-wrapper.ts` - High-level PDF document handling
- `pdf-caching.ts` - Caching strategy for PDF chunks
- `pdf-caching-transport.ts` - HTTP transport with caching

## Streaming & Real-time

### `streaming/`

- `useStream.ts` - React hook for streaming AI responses

## Slide Parsing

### `slide-parser.ts`

Parse and manage presentation slides (Slidev/Typst syntax).

## Authentication

### `auth-client.ts`

Client-side auth helpers (GitHub OAuth client).

### `auth-server.ts`

Server-side auth configuration.

## Convex Integration

### `convex.tsx`

Convex provider setup and initialization.
