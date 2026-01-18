# convex/

Convex backend: database schema, server functions, and authentication.

## Schema

Defined in `schema.ts`:

| Table             | Description                                   |
| ----------------- | --------------------------------------------- |
| `chats`           | AI conversation threads, indexed by user      |
| `messages`        | Chat messages with embeddings for RAG/search  |
| `streamMetadata`  | Active AI stream tracking                     |
| `comments`        | Google Docs-style inline comments             |
| `commentReplies`  | Threaded comment replies                      |
| `documents`       | Markdown/LaTeX documents with CRDT support    |
| `presence`        | Real-time user presence per document          |

## Core Functions

### `documents.ts`

- `create()` - Create new document
- `list()` - Paginated user documents
- `get()` - Fetch document with permission check
- `update()` - Update content with optimistic concurrency
- `share()` - Generate share tokens and permissions
- `getByShareToken()` - Public document access

### `messages.ts`

- `list()` - Paginated chat messages
- `add()` - Add message with optional embedding
- `remove()` - Delete message
- `clearChat()` - Clear all messages from chat

### `chats.ts`

- `list()` - User's chats paginated
- `create()` - New chat thread
- `fork()` - Branch conversation at specific message

### `comments.ts`

- `add()` - Create comment on selection
- `addReply()` - Thread reply
- `resolve()` - Mark comment resolved

## Authentication

### `auth.ts` & `betterAuth/`

- Convex adapter for Better Auth
- GitHub OAuth integration
- User session management

## Streaming

### `streaming/`

- `crons.ts` - Scheduled cleanup tasks
- `lib.ts` - Streaming utilities for AI responses

## Usage

```bash
# Start Convex dev server
bunx convex dev

# Deploy to production
bunx convex deploy
```
