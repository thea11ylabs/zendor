# Zendor Editor - Implementation Plan

## Project Overview

Zendor is a markdown editor with Google Docs-style visual editing (TipTap), split view, preview, and various features.

## Completed Features

- [x] TipTap visual editor with markdown sync
- [x] CodeMirror markdown editor
- [x] Split view (Doc, Editor, Split, Preview modes)
- [x] LaTeX support with KaTeX (click to edit)
- [x] Comment sidebar
- [x] Autosave to localStorage
- [x] Theme toggle (light/dark)
- [x] Dictation feature (basic speech-to-text with OpenAI Whisper)

## Current Outstanding Tasks

### 1. Citation Feature (Like Overleaf)

**Status: Complete**

- [x] Created `app/lib/citations.ts` - BibTeX types, storage, parsing, IEEE formatting
- [x] Created `CitationManager` component with BibTeX import
- [x] Render citations in preview (replace `\cite{key}` with numbered refs)
- [x] IEEE-style bibliography section at end of document
- [ ] Add citation autocomplete when typing `\cite{}` (future enhancement)

### 2. AI Chat Window

**Status: Complete**

- [x] Created chat API route at `app/api/chat/route.ts` using AI SDK
- [x] Created `ChatSidebar` component with streaming responses
- [x] Uses `@ai-sdk/openai` with `streamText` from `ai` package
- [x] AI has context of current document content
- [x] AI button in toolbar (purple theme)

### 3. Enhanced Dictation

**Status: Not Started**

- [ ] Add option to reformat/reorganize dictated text using AI
- [ ] Create API route for AI-powered dictation cleanup
- [ ] Keep user's words as much as possible while improving structure

### 4. PDF Preview

**Status: Not Started**

- [ ] Add PDF export/preview using browser-based solution
- [ ] Options: html2pdf.js, pdfmake, or @react-pdf/renderer
- [ ] Real-time preview if possible

## Key Files

### Editor Components

- `app/editor/page.tsx` - Main editor page with state management
- `app/components/VisualEditor.tsx` - TipTap visual editor
- `app/components/EditorToolbar.tsx` - Formatting toolbar (has DictateButton)
- `app/components/MarkdownEditor.tsx` - CodeMirror editor
- `app/components/MarkdownPreview.tsx` - Preview with react-markdown
- `app/components/CommentSidebar.tsx` - Comments feature

### Extensions

- `app/components/extensions/MathExtension.tsx` - LaTeX support

### API Routes

- `app/api/transcribe/route.ts` - Whisper transcription (uses OpenAI directly)

### Libraries/Utilities

- `app/lib/citations.ts` - Citation utilities (just created)

## Environment Variables Needed

```
OPENAI_API_KEY=your_key_here
```

## Installed AI Packages

```json
"ai": "6.0.0-beta.122",
"@ai-sdk/openai": "3.0.0-beta.71",
"@ai-sdk/react": "3.0.0-beta.122"
```

## Reference: AI SDK Usage Pattern (from automatic-product-demos)

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, UIMessage, convertToModelMessages } from "ai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const result = streamText({
  model: openai("gpt-4o"),
  system: "Your system prompt",
  messages: convertToModelMessages(messages),
});

return result.toUIMessageStreamResponse();
```

## Notes

- User prefers step-by-step implementation
- Lint passes with only Convex-generated file warnings
- Run `pnpm lint` to verify changes
