# AI Workflow Note

## Tools used

- **GitHub Copilot**: used as the coding agent to implement each phase (scaffold, routes, UI, tests).
- **Claude (Anthropic)**: used outside the codebase to discuss the architecture, break the build into phases, draft the phase prompts, and plan the submission.

## How I worked

I split the build into four phases, each driven by a written prompt:

1. Scaffold, data model, seeded demo users with cookie-session auth, and a single `getAccess` function.
2. Documents CRUD, dashboard, and the Tiptap editor with debounced autosave.
3. Sharing (service layer, API, share dialog) and tests.
4. File import (`.txt`, `.md`, `.docx`) with a testable conversion module.

Every prompt stated the contract (routes, status codes, error shape), the scope ("do not build X yet"), and the output format (full file paths, only the changed code, and the commands to run). I worked on a dev branch and checked each phase manually before starting the next.

## Where AI materially sped up the work

- Scaffolding Next.js, Prisma, and Postgres, plus the seed script and the demo auth.
- CRUD routes with zod validation, with one access-control function used by every handler.
- The Tiptap editor, toolbar, and autosave with a visible save status.
- The sharing service layer and dialog, and the import conversion module with its tests.

## What I changed or rejected

- The agent forgot the delete button. I asked for it and told it to check the spec for any other missing components.
- It used a basic browser `alert` to confirm deletion. I had it replaced with a proper modal.
- The production build on Vercel failed with a missing-tables error. I fixed it by adding `prisma generate` and the migration to the production build step.

## How I verified

- Manual testing after each phase: login and logout with the seeded users, formatting, document listing, persistence after refresh, and autosave.
- Deployed to Vercel and tested on the live URL.
- Sharing and import: tested manually in the UI with the seeded demo users and sample files.
- Automated tests: Vitest tests for the access rules, the sharing flow, and the import conversion, run with `npm test`.

## What I owned

The stack and scope decisions (what to cut: real-time collaboration, comments, version history, real authentication, and storing original uploads), the access rules (owner, editor, viewer, and 404 when a user has no access), and the acceptance of each phase only after manual testing.

## Links
Github: https://github.com/lukasadr/ajaia-docs
Vercel: https://ajaia-docs-umber-nine.vercel.app/