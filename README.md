# Zendor

A modern, self-hostable markdown and latex editor built for developers and researchers. Features LaTeX support, citations, AI assistance, real-time collaboration, and multiple editing modes.

## Features

- **Multi-Editor Support** - Markdown with live preview, WYSIWYG visual editor, LaTeX editor with PDF preview, and slide presentation builder
- **AI Integration** - OpenAI and Anthropic support with streaming responses and context-aware assistance
- **Academic Writing** - BibTeX citation management, LaTeX math rendering, code syntax highlighting
- **Collaboration** - Real-time presence, shareable documents with permissions, Google Docs-style comments
- **Productivity** - Voice transcription, Python code execution, Mermaid diagrams, mini notes and task tracker

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Backend:** Convex (serverless database & functions)
- **Auth:** Better Auth with GitHub OAuth
- **State:** Jotai with localStorage persistence
- **Styling:** Tailwind CSS 4
- **Editors:** TipTap (WYSIWYG), CodeMirror (code)
- **Math:** KaTeX, LaTeX.js
- **PDF:** PDF.js with chunking
- **AI:** Vercel AI SDK (Anthropic, OpenAI)
- **Runtime:** Bun

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- [Convex](https://convex.dev/) account
- GitHub OAuth app (for authentication)

### Installation

```bash
git clone https://github.com/thea11ylabs/zendor.git
cd zendor
bun install
```

### Environment Variables

Create a `.env.local` file:

```env
# Convex
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
# Add the following to your backend/convex cloud env variables

# Auth
BETTER_AUTH_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AI (optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### Development

```bash
# Start Convex backend
bunx convex dev

# Start Next.js dev server (in another terminal)
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build

```bash
bun run build
bun run start
```

## Project Structure

```text
zendor/
├── app/           # Next.js pages and API routes
├── components/    # React UI components
├── convex/        # Backend schema, functions, and auth
├── hooks/         # Custom React hooks
├── lib/           # Utilities, parsers, and helpers
├── stores/        # Jotai state atoms
└── public/        # Static assets (PDF.js, TeX engine)
```

See individual folder READMEs for detailed documentation.

## License

MIT
