# Submission

## Delivered

- Next.js App Router application with TypeScript, Prisma, and PostgreSQL.
- Demo login with a signed, HTTP-only session cookie.
- Document dashboard and Tiptap rich-text editing with autosave.
- Owner/editor/viewer document access, collaborator management, and role-aware read-only behavior.
- `.txt`, `.md`, and `.docx` import into new documents owned by the signed-in user.
- Reviewer seed data: Alex owns “Review-ready project brief,” Sam is an editor, and Jordan is a viewer.
- Loading, not-found, error, and save recovery states.
- Vitest coverage and GitHub Actions checks.

## Reviewer Quick Start

Requirements: Node.js 22, npm, and Docker Compose (or a PostgreSQL server).

```bash
cp .env.example .env
```

Replace the example `SESSION_SECRET` with a random value of at least 32 characters. Then run:

```bash
docker compose up -d db
npm ci
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose one of the listed accounts:

- `alex@example.com`: owns the sample document and can share/manage it.
- `sam@example.com`: editor access to the sample document.
- `jordan@example.com`: read-only viewer access to the sample document.

The login page explicitly marks authentication as demo-only. No password is required.

## Verification

```bash
npm test
npm run lint
npm run typecheck
```

Tests use mocked Prisma for permission and service flows; conversion tests use `samples/sample.txt`, `samples/sample.md`, and `samples/sample.docx`.

## Notes for Deployment

- Keep `.env` local; it is ignored by Git. Configure `DATABASE_URL` and a strong `SESSION_SECRET` in the deployment environment.
- The session implementation is for a demo and is not a substitute for production authentication, account recovery, or session revocation.
- The current `npm run build` command runs `prisma migrate deploy` and `prisma db seed` before `next build`. Separate migration/seed operations from the build in a production deployment, and avoid seeding demo users unless they are intended to exist there.
- Import has a 2 MB file limit. Images and complex Word layouts are not imported.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the request/data flow, authorization rules, conversion pipeline, test strategy, and known limitations.