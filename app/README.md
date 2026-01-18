# app/

Next.js App Router pages and API routes.

## Pages

### `/` (Landing)

Marketing landing page with hero section, feature grid, and CTAs.

### `/editor`

Main markdown editor with:

- Multiple view modes (editor, split, preview, visual)
- CodeMirror-based markdown editing
- Live preview with LaTeX and syntax highlighting
- Citation manager (BibTeX)
- Comment sidebar (threaded comments)
- Figure/media manager
- Python code runner
- AI chat panel with streaming
- Mini notes and task tracker

### `/latex-editor`

Dedicated LaTeX document editor:

- Real-time PDF preview
- LaTeX compilation with error linting
- Comments and citations support

### `/slides`

Presentation builder:

- Slidev and Typst syntax support
- Multi-slide management
- Split view editing

### `/dashboard`

User document management (protected route):

- List, create, edit, delete documents
- Share documents with permissions

### `/sign-in`

GitHub OAuth authentication page.

### `/share/[token]`

Public shared document view (read-only or editable based on permissions).

## API Routes

| Route | Description |
|-------|-------------|
| `/api/auth/[...all]` | Better Auth handler (GitHub OAuth) |
| `/api/compile-latex` | Server-side LaTeX compilation |
| `/api/texlive-proxy/[...path]` | Proxy for TexLive resources |
| `/api/transcribe` | Voice-to-text (OpenAI Whisper) |
| `/api/pdf-chunks/[contentId]/[hash]` | PDF chunking and caching |

## Layout

`layout.tsx` provides:

- Theme provider (light/dark mode)
- Global providers (Convex, Jotai, React Query)
- Toast notifications (Sonner)
