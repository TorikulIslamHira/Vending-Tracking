# Bee Novelty — Vending Machine SaaS

Multi-tenant vending machine fleet management platform: field-agent restock/cash-collection workflows, admin fleet management, and financial reconciliation reporting.

## Tech Stack

- **API**: Fastify + TypeScript, `apps/api`
- **Web**: Next.js 15 (App Router) + TypeScript, `apps/web`
- **Database**: PostgreSQL via Drizzle ORM (`postgres-js` driver), `packages/database`
- **Shared**: `packages/shared-types` (domain types/enums), `packages/validation` (Zod schemas)
- **Monorepo**: pnpm workspaces
- **Infra**: Docker Compose (Postgres, API, Web, Nginx reverse proxy)

Deeper architecture, business-rule, and schema documentation lives in [`docs/`](docs/00-System-Map/00-System-Architecture-MoC.md).

## Prerequisites

- Node.js 22+
- pnpm 11 (`corepack enable` will pick up the version pinned in `package.json`)
- Docker + Docker Compose (for local Postgres, or the full containerized stack)

## Environment Variables

Copy `.env.production.example` to `.env` at the repo root and fill in real values — every value below is **required**; the API and database client throw a fatal error and refuse to start if any are missing (no hardcoded fallbacks).

| Variable | Used by | Notes |
| --- | --- | --- |
| `POSTGRES_USER` | `docker-compose.yml` | Defaults to `vending_user` if unset |
| `POSTGRES_PASSWORD` | `docker-compose.yml` | High-entropy value, e.g. `openssl rand -hex 24`. Required — `docker compose up` refuses to start without it |
| `POSTGRES_DB` | `docker-compose.yml` | Defaults to `vending_db` if unset |
| `DATABASE_URL` | `apps/api`, `packages/database` | Full Postgres connection string. Inside Docker, host is `db`; from the host machine (e.g. running `db:push`), host is `localhost` |
| `JWT_SECRET` | `apps/api` | High-entropy value, e.g. `openssl rand -hex 32`. Required — the API crashes on boot without it |
| `PORT`, `HOST`, `NODE_ENV`, `LOG_LEVEL` | `apps/api` | Standard Fastify server config |
| `NEXT_PUBLIC_API_URL` | `apps/web` | API base path as seen by the browser, e.g. `/api/v1` |
| `SUPER_ADMIN_EMAIL` | `packages/database` seed script | Bootstraps the one initial `ADMIN` account. Required to run `db:seed` |
| `SUPER_ADMIN_PASSWORD` | `packages/database` seed script | Same as above — pick a strong password, it's hashed with bcrypt before storage |

`packages/database` also reads its own `.env` (`packages/database/.env`) when you run its scripts directly from the host (`db:push`, `db:seed`, `db:studio`, `db:wipe`) — keep `DATABASE_URL`/`SUPER_ADMIN_*` there in sync with the root `.env`.

Beyond the initial Super Admin, every other user is created through the in-app admin UI (`POST /api/v1/users`), not through environment variables or the seed script.

## Local Setup

```bash
pnpm install

# Start Postgres (and optionally the full stack) via Docker
docker compose up -d db          # Postgres only, for local `pnpm dev`
# — or —
docker compose up -d --build     # Full stack: db, api, web, nginx

# Apply the schema to the database
pnpm --filter @vending/database run db:push

# Bootstrap the Super Admin (requires SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD in packages/database/.env)
pnpm --filter @vending/database run db:seed

# Run the API and Web dev servers together
pnpm dev
```

The API listens on `http://localhost:3001`, the web app on `http://localhost:3000`. If you brought up the full Docker stack instead, Nginx proxies both behind `http://localhost`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run API + Web dev servers in parallel |
| `pnpm build` | Build every workspace package (`tsc` / `next build`) |
| `pnpm typecheck` | `tsc --noEmit` across every workspace package |
| `pnpm lint` | ESLint across the whole repo (`eslint.config.mjs`) |
| `pnpm format` | Prettier, writes in place |
| `pnpm --filter @vending/database run db:push` | Push the current Drizzle schema straight to the database (used for local dev) |
| `pnpm --filter @vending/database run db:generate` | Generate a versioned SQL migration snapshot under `packages/database/drizzle/` |
| `pnpm --filter @vending/database run db:seed` | Provision/update the Super Admin account (see Environment Variables above) |
| `pnpm --filter @vending/database run db:studio` | Launch Drizzle Studio against the local database |

## Documentation

The [`docs/`](docs/00-System-Map/00-System-Architecture-MoC.md) directory is a structured knowledge base (architecture, business rules, dated changelogs) — start at the Map of Content and follow the links relevant to what you're working on.
