Scaffold a Next.js (App Router, TypeScript) app with Prisma + Postgres. Models: User(id,email,name), Document(id,ownerId,title,content Json,createdAt,updatedAt), DocumentShare(documentId,userId,role viewer|editor, unique pair). Add a seed script creating 3 demo users. Implement demo auth: a login page listing the seeded users, and a signed cookie session. Add a lib function getAccess(user, doc) returning owner|editor|viewer|none and use it in every route handler. Use zod for validation. Don't build the editor yet. Give me full file paths, only the code that changes, and the commands to run.

Next phase: documents CRUD + dashboard + rich-text editor. Keep diffs small and explain choices briefly.

API (route handlers, all calling getAccess() and zod validation):
- GET /api/documents -> owned + shared documents, each with an `access` field (owner|editor|viewer)
- POST /api/documents -> creates "Untitled document" with an empty Tiptap JSON doc
- GET /api/documents/:id -> document + the caller's access
- PATCH /api/documents/:id -> title and/or content; owner or editor only; viewer gets 403
- DELETE /api/documents/:id -> owner only
Rules: no access -> 404 (don't leak existence); viewer editing -> 403. Limit content size to ~1 MB. Return errors as { error: { code, message } }.

Dashboard page:
- Tabs: "My documents" and "Shared with me"
- Cards with title, last updated, and a badge (Owner / Editor / Viewer)
- "New document" button, empty states, loading and error states

Editor page:
- Tiptap with StarterKit + Underline, with immediatelyRender: false for Next.js
- Toolbar: Bold, Italic, Underline, Paragraph/H1/H2/H3, Bullet list, Numbered list, with active states
- Inline title rename (save on blur)
- Debounced autosave (about 1 second) with a visible "Saving... / Saved / Error, retry" status
- Read-only mode and a disabled toolbar when the user's access is viewer
Do not build sharing or upload yet. Give me full file paths, only the changed code, and the commands to run.