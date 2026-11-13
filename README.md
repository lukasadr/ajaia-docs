# Ajaia Documents

A Next.js App Router demo for creating, editing, importing, and sharing rich-text documents. Documents are stored as Tiptap-compatible JSON in PostgreSQL through Prisma.

## Requirements

- Node.js 22 (matches the CI workflow)
- npm
- Docker Compose, or another PostgreSQL server

## Local Setup

```bash
cp .env.example .env
```

Set `SESSION_SECRET` to a random value of at least 32 characters. For example:

```bash
sed -i "s|replace-with-a-random-secret-at-least-32-characters-long|$(openssl rand -base64 32)|" .env
```

Start the provided PostgreSQL service, install dependencies, apply the schema, and create the demo accounts and shared example document:

```bash
docker compose up -d db
npm ci
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If port `5432` is already occupied by PostgreSQL, the Compose service cannot bind that port; point `DATABASE_URL` at the existing database or adjust the Compose port and connection URL.

The login page lists three seeded demo accounts:

- Alex Morgan (`alex@example.com`), owner of the seeded review document
- Sam Rivera (`sam@example.com`), editor of the review document
- Jordan Lee (`jordan@example.com`), viewer of the review document

Authentication is intentionally a demo account picker, not production authentication.

## Features

- Create and edit Tiptap documents with title and content autosave.
- Share documents with existing demo users as editors or viewers.
- Import `.txt`, `.md`, and `.docx` files up to 2 MB. Imported files create new documents owned by the current user. See [`samples/`](samples/) for small fixtures.
- Role-based access: owners can manage and delete; editors can read and update; viewers can read only.

## Commands

```bash
npm run dev          # local development server
npm run lint         # ESLint for src/ and prisma/
npm run typecheck    # TypeScript check
npm test             # Vitest suite
npm run test:watch   # Vitest watch mode
npm run db:generate  # generate Prisma Client
npm run db:migrate   # create/apply a development migration
npm run db:seed      # upsert demo users and reviewer sample document
npm run build        # Prisma generate, migrate deploy, seed, then Next.js build
npm start            # run the production server after build
```

`npm run build` currently runs `prisma migrate deploy` and `prisma db seed` before `next build`. The seed creates demo accounts and a shared sample document. Review this script before using it in production deployments; migrations and demo data setup are usually managed as explicit deployment steps.

## Tests and CI

Tests use Vitest. Prisma is mocked for access, sharing, and API authorization tests; file conversion tests use the fixtures in `samples/`, including a real minimal DOCX file. GitHub Actions runs Prisma Client generation, lint, tests, and typecheck on pushes and pull requests.

## Project Map

- `src/app/api/`: authentication, document, sharing, and import route handlers
- `src/lib/access.ts`: owner/editor/viewer/none access calculation
- `src/lib/sharing.ts`: testable sharing service
- `src/lib/import/convert.ts`: file-to-Tiptap conversion
- `src/components/`: dashboard, editor, and sharing dialog
- `prisma/`: PostgreSQL schema, migrations, and seed script
- `docs/ARCHITECTURE.md`: data flow, security boundaries, and current limitations