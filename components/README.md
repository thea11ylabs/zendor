# components/

React UI components organized by feature.

## UI Components (`ui/`)

Base components built on Radix UI:

- `button.tsx` - Button variants
- `input.tsx`, `textarea.tsx` - Form inputs
- `dialog.tsx` - Modal dialogs
- `dropdown-menu.tsx` - Dropdown menus
- `scroll-area.tsx` - Scrollable containers
- `tooltip.tsx` - Tooltips

## Editor Components (`editor/`)

### Core

- `MarkdownEditor.tsx` - CodeMirror-based markdown editor
- `VisualEditor.tsx` - WYSIWYG editor (TipTap/Prosemirror)
- `MarkdownPreview.tsx` - Live preview with markdown rendering
- `EditorToolbar.tsx` - Formatting toolbar, view modes, sharing
- `DocEditor.tsx` - Document wrapper

### Features

- `CitationManager.tsx` - Citation picker and bibliography
- `CommentSidebar.tsx` - Threaded comment panel

### Media (`editor/media/`)

- `FigureManager.tsx` - Image/figure insertion
- `MermaidRenderer.tsx` - Mermaid diagram rendering

### Productivity (`editor/productivity/`)

- `MiniNotes.tsx` - Inline note-taking
- `MiniTaskTracker.tsx` - Todo/task list

## AI Chat Components (`ai-chat/`)

- `chat-container.tsx` - Main chat interface
- `SimpleChatPanel.tsx` - Compact chat sidebar
- `message.tsx` - Individual message display
- `chat-input.tsx` - Message input with attachments
- `markdown-renderer.tsx` - AI response rendering
- `streaming-message.tsx` - Real-time streaming display
- `thinking-sidebar.tsx` - AI reasoning/thinking process
- `thinking-accordion.tsx` - Expandable thinking details
- `header.tsx` - Chat header with controls

## PDF Components (`pdf/`)

- `PDFPreview.tsx` - Full PDF viewer with navigation
- `PDFJSViewer.tsx` - PDF.js implementation with chunking

## LaTeX Components (`latex/`)

- `LaTeXPreview.tsx` - Live LaTeX render preview

## Slides Components (`slides/`)

- `SlideCanvas.tsx` - Slide rendering and navigation

## Code Components (`code/`)

- `PythonRunner.tsx` - Execute Python and display results

## Collaboration (`collab/`)

- `ShareDialog.tsx` - Share document UI with permissions

## Layout Components (`layout/`)

- `auth-guard.tsx` - Route protection wrapper

## Providers (`providers/`)

- `ThemeProvider.tsx` - Light/dark mode (next-themes)
- `Providers.tsx` - Root provider composition

## Extensions (`extensions/`)

- `MathExtension.tsx` - TipTap math support

## Global Components

- `Toolbar.tsx` - Main editor toolbar
- `DictateButton.tsx` - Voice input (Web Speech API)
