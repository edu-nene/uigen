# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup
npm run setup          # install deps + generate Prisma client + run migrations

# Development
npm run dev            # Next.js dev server with Turbopack (uses node-compat.cjs shim)
npm run dev:daemon     # Same, but runs in background; logs go to logs.txt

# Build & production
npm run build
npm run start

# Database
npx prisma generate    # Regenerate Prisma client after schema changes
npx prisma migrate dev # Apply new migrations
npm run db:reset       # Wipe and re-migrate (destructive)

# Lint
npm run lint

# Tests
npm run test                            # Run all tests (Vitest)
npx vitest run src/path/to/__tests__/  # Run a specific test file or directory
```

**Required env var:** `ANTHROPIC_API_KEY` in `.env`. If left empty, the app falls back to a mock provider that returns static placeholder code.

## Architecture

UIGen is an AI-powered React component generator. Users describe a component in natural language; the Claude AI creates/edits files in a virtual filesystem; the result is compiled in-browser and shown in a sandboxed iframe.

### Request lifecycle

1. User message → `POST /api/chat` (`src/app/api/chat/route.ts`)
2. Server streams a Vercel AI SDK response using `claude-haiku-4-5` (or mock)
3. AI can call two tools: `str_replace_editor` (patch existing files) and `file_manager` (create/delete files)
4. Streamed tool calls update the client-side virtual filesystem (`FileSystemContext`)
5. `jsx-transformer.ts` (Babel Standalone) compiles JSX in the browser and builds an import map
6. `PreviewFrame.tsx` renders the import map + compiled code inside a sandboxed `<iframe>`

### Key files

| File | Role |
|---|---|
| `src/app/api/chat/route.ts` | Streaming AI endpoint; registers AI tools |
| `src/lib/provider.ts` | Returns Anthropic or mock language model |
| `src/lib/prompts/generation.tsx` | System prompt — defines AI behaviour and filesystem conventions |
| `src/lib/file-system.ts` | Pure virtual filesystem implementation (in-memory) |
| `src/lib/contexts/file-system-context.tsx` | React context that owns virtual FS state |
| `src/lib/contexts/chat-context.tsx` | Chat state, streaming, and tool-call orchestration |
| `src/lib/transform/jsx-transformer.ts` | Compiles JSX with Babel, resolves imports via import-map |
| `src/lib/tools/str-replace.ts` | AI tool: patch file contents |
| `src/lib/tools/file-manager.ts` | AI tool: create/delete files |
| `src/lib/auth.ts` | JWT session management (jose) |
| `src/actions/index.ts` | Server actions: signUp, signIn, signOut, getUser |
| `src/middleware.ts` | Auth middleware for protected routes |
| `prisma/schema.prisma` | SQLite schema: `User` and `Project` models |

### Filesystem conventions (followed by the AI)

- `/App.jsx` is always the root component rendered in the preview
- Local imports use the `@/` alias (maps to `src/`)
- All files live in the virtual FS (never written to disk)
- Project state (messages + FS data) is serialised as JSON and stored in the `Project` DB row

### Database

SQLite via Prisma. Two models:
- `User` — email + bcrypt-hashed password
- `Project` — `messages` (JSON string) + `data` (JSON string of virtual FS), optionally linked to a user

Anonymous sessions are supported; projects can exist without a user.

### Path alias

`@/*` → `src/*` (configured in `tsconfig.json` and respected by the `jsx-transformer` import map at runtime).
