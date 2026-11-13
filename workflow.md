Scaffold a Next.js (App Router, TypeScript) app with Prisma + Postgres. Models: User(id,email,name), Document(id,ownerId,title,content Json,createdAt,updatedAt), DocumentShare(documentId,userId,role viewer|editor, unique pair). Add a seed script creating 3 demo users. Implement demo auth: a login page listing the seeded users, and a signed cookie session. Add a lib function getAccess(user, doc) returning owner|editor|viewer|none and use it in every route handler. Use zod for validation. Don't build the editor yet. Give me full file paths, only the code that changes, and the commands to run.

Checked the page, tested login and logout with seeders

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

Deployed on vercel, fixed fetch tables error by adding prisma generate and migrate during production build

Created dev branch

Manual testing the formatting, listing, persistence,auto-save features

Next phase: sharing + tests. Keep diffs small and explain choices briefly.

Service layer (testable, no HTTP inside):
- shareDocument(ownerId, docId, email, role): owner only; role is viewer|editor; target is looked up by email among existing users; error if the user doesn't exist, is the owner, or the email is invalid; if already shared, update the role (upsert)
- unshareDocument(ownerId, docId, userId): owner only
- listShares(ownerId, docId): returns users and roles

API:
- GET /api/documents/:id/share -> list collaborators (owner only)
- POST /api/documents/:id/share { email, role } -> owner only
- DELETE /api/documents/:id/share { userId } -> owner only
Errors: not owner -> 403 if they have access, 404 if they have none; unknown email -> 400 with a clear message. Validate with zod.

UI:
- "Share" button in the editor, visible to the owner only
- Share dialog: email input (or a picker of the seeded users), role select (Viewer/Editor), add button, list of current collaborators with role change and remove, inline errors
- Dashboard: in "Shared with me", show "Shared by <owner name>" and the role badge; keep the Owner badge in "My documents"
- A viewer sees a read-only editor with a "View only" notice

Tests (Vitest):
1. getAccess: owner, editor, viewer, and none
2. Sharing flow: user B gets none before sharing; viewer can read but a PATCH is rejected; editor can PATCH; after unshare, access is none again; a non-owner can't share; sharing with the owner or an unknown email fails
Use a test database or mock Prisma, whichever is faster, and tell me which you chose and why. Give me full file paths, only the changed code, and the commands to run.


Next phase: file import. Keep diffs small and explain choices briefly.

Feature: a user uploads a .txt, .md, or .docx file and gets a NEW editable document owned by them, with the filename (without extension) as the title.

Backend:
- POST /api/documents/import (multipart/form-data, field "file"), with `export const runtime = 'nodejs'`
- Validation (zod and manual checks): allowed extensions .txt/.md/.docx only; max 2 MB; reject empty files; for .docx also check the ZIP signature (starts with "PK"); return { error: { code, message } } with clear messages (400 for invalid type or empty, 413 for too large)
- Put the conversion logic in a pure, testable module `lib/import/convert.ts`:
  - .txt -> paragraphs split on blank lines (escape HTML, preserve line breaks within a paragraph)
  - .md -> markdown-it to HTML
  - .docx -> mammoth.convertToHtml (buffer input)
  - then HTML -> Tiptap JSON via generateJSON using the SAME extension list as the editor (extract that list into a shared file), so unsupported or unsafe markup is dropped by the schema
- Create the Document through the existing service, owned by the current user. Return the new document id.

UI:
- "Import" button on the dashboard (file picker; drag and drop is optional)
- Helper text: "Supported: .txt, .md, .docx (max 2 MB). Images and complex Word layouts are not imported."
- Loading state, inline error messages, and redirect to the new document on success

Tests (Vitest) for convert.ts:
1. .txt with two paragraphs produces two paragraph nodes
2. .md with a heading, bold, and a bullet list produces heading, bold mark, and bulletList nodes
3. an unsupported extension is rejected
4. an oversized file is rejected
5. a small .docx fixture converts to non-empty content
Add small fixtures (sample.txt, sample.md, sample.docx) in a /samples folder I can mention in the README.
Give me full file paths, only the changed code, and the commands to run.