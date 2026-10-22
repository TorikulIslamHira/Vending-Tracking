---
title: Security Analysis — Drizzle SQL-Injection Advisory & Migration Baseline Plan
date: 2026-10-22
dependencies:
  - "[[database-schema.md]]"
  - "[[00-System-Architecture-MoC.md]]"
impacts:
  - "[[packages/database]]"
  - "[[apps/api]]"
tags:
  - security-analysis
  - drizzle
  - sql-injection
  - migrations
---

# Security Analysis: Drizzle SQL-Injection Advisory & Migration Baseline Plan

**Analysis only — no code, dependency, or database changes were made as part of this document.**
Both items below need the user's explicit approval before anyone acts on them (per the new rule
in `.cursorrules`/`.clinerules`/`.agentrules`).

## a) Drizzle ORM SQL-injection advisory (Dependabot: 2 High alerts)

**Advisory:** [GHSA-gpj5-g38j-94v9](https://github.com/advisories/GHSA-gpj5-g38j-94v9) / **CVE-2026-39356**
("Drizzle ORM has SQL injection via improperly escaped SQL identifiers"), CVSS 3.1 **7.5 High**, CWE-89.

- **Affected:** all `drizzle-orm` versions before `0.45.2`, and `1.0.0-beta.2` through `1.0.0-beta.19`.
- **Fixed:** `0.45.2` or later (or `1.0.0-beta.20`+ on the beta line).
- **The flaw:** Drizzle's dialect-specific identifier escaping failed to escape embedded delimiter
  characters before wrapping a name in quotes/backticks. An application that passes
  attacker-controlled input into an API that *constructs a SQL identifier or alias* —
  `sql.identifier()`, `.as()`, or any raw string concatenated into a table/column name — can let an
  attacker break out of the quoted identifier and inject SQL.
- **This repo's current version:** `drizzle-orm: ^0.40.0` in both `apps/api/package.json` and
  `packages/database/package.json` — **affected** (below `0.45.2`).

### Code audit — every place user input could reach a SQL identifier

Searched `apps/api/src/**/*.ts` and `packages/database/src/**/*.ts` for `sql.identifier(`, `sql.raw(`,
`.as(` with a non-literal argument, any dynamic `orderBy`/sort-field construction, and every
`sql\`...\`` raw-SQL template usage. Findings:

| Pattern | Result |
|---|---|
| `sql.identifier(...)` | **Zero occurrences anywhere in the codebase.** |
| `sql.raw(...)` | **Zero occurrences anywhere in the codebase.** |
| `.as(` with a dynamic/user-controlled string | **Zero occurrences.** Every `orderBy` in every controller (`apps/api/src/modules/*/[a-z]*.controller.ts` — audit, inventory, machines, packets, stores, users, 17 call sites total) uses a **hardcoded** column reference, e.g. `orderBy: [desc(adminAuditLogs.createdAt)]` (`audit.controller.ts:34`) or `orderBy: [desc(machines.createdAt)]` (`machines.controller.ts:31`). None derive the sorted column from a query parameter, request body, or any other user-controlled value. |
| Raw `sql\`...\`` template literals | Exactly two uses in the whole monorepo, both fully static strings with **zero interpolation**: `apps/api/src/server.ts:81` — `sql\`SELECT 1\`` (the `/health` DB-connectivity check) — and `packages/database/src/wipe.ts:6-8` — `DROP SCHEMA public CASCADE`, `CREATE SCHEMA public`, `GRANT ALL ON SCHEMA public TO public` (the `db:wipe` dev-only script). Neither ever concatenates a request-derived value into the query text. |
| Any dynamic table/column name construction | None found. Every query in every controller references schema objects imported from `packages/database/src/schema.ts` (e.g. `machines.createdAt`, `cashLogs.agentId`) — these are TypeScript property accesses resolved at compile time, not runtime strings, so there is no code path where a request value could even syntactically become part of an identifier. |
| `apps/web` | Has no `@vending/database` or `drizzle-orm` dependency at all (confirmed via `grep` on `apps/web/package.json`) — it never touches the database directly; all DB access is server-side only, through `apps/api`. |

**Exploitability verdict: not currently exploitable.** The vulnerable code path requires
attacker-controlled input to reach an identifier-construction API. This codebase has zero calls to
any such API — every column/table/sort reference is a static, hardcoded schema property, and the
only two raw-SQL usages in the entire codebase are fully static strings with no interpolation at
all. This matches what other real-world triage of this same advisory found when auditing codebases
with no dynamic-identifier usage (see the "no currently reachable injection path" conclusion in
public issue trackers reviewing the same CVE).

**That said:** "not currently exploitable" is a property of the code today, not a reason to stay on
a vulnerable version — a future change that *does* add a dynamic sort/filter feature (a very
plausible ask for this app's reports/history views) would land directly on the vulnerable code path
with nothing here to stop it. The advisory should still be cleared.

### Proposed upgrade (not applied)

Latest patched stable release as of this analysis: **`drizzle-orm@0.45.4`** (checked via
`pnpm info drizzle-orm dist-tags`, a read-only registry query — no install was run). The matching
`drizzle-kit` latest is **`0.31.11`** — multiple real-world upgrade PRs for this same advisory moved
both together, since `drizzle-kit` generates migrations from the version of `drizzle-orm`'s schema
APIs it's paired with.

```bash
# NOT RUN — proposal only, for the user to execute after reviewing changelogs
# between 0.40.0 and 0.45.4 for breaking API changes:
pnpm --filter @vending/api --filter @vending/database add drizzle-orm@^0.45.4
pnpm --filter @vending/database add drizzle-kit@^0.31.11
```

Per the new rule-file guidance (`.cursorrules` rule 11): this is exactly the "prefer the latest
patched version, not just the minimum fixed version" case — `0.45.2` clears the advisory, but
`0.45.4` is the actual latest stable and should be what gets installed if/when this is approved.

## b) Migration baseline plan: moving `drizzle-kit push --force` to `drizzle-kit migrate`

**Current state:** `deploy.sh` runs `drizzle-kit push --force` against production on every deploy.
`push` works by diffing the *live* database schema directly against `schema.ts` and applying
whatever DDL closes the gap — it has no concept of migration files and never touches a migration
history table. `packages/database/drizzle/` already has a full generated journal (`0000_famous_
malcolm_colcord.sql` through `0008_material_maria_hill.sql`, tracked in `drizzle/meta/_journal.json`)
from `db:generate` runs, but **none of these files have ever actually been applied via `migrate()`**
— production's schema got to its current state entirely through `push`, so Drizzle has never
written anything to a migrations-tracking table for this database.

**Why switching cold is unsafe:** `drizzle-kit migrate` creates (if absent) a tracking table —
`"__drizzle_migrations"` in a `"drizzle"` schema by default — and replays every migration file whose
hash isn't already recorded there. On this production database, that table doesn't exist at all, so
a naive switch would make `migrate` try to run **all nine** migrations from scratch against a
database that already has every table/column they'd create. Postgres raises a hard error on the
first `CREATE TABLE` that already exists (migration `0000`), so in the best case the deploy just
fails loudly; in a worse case (if some later migration's statements happened to be idempotent or
partially succeed before hitting a conflict), it could leave the tracking table in a half-populated,
inconsistent state that's harder to reason about than doing nothing at all.

**Safe baseline procedure (plan only — nothing below was executed):**

1. **Full backup first, non-negotiable.** A manual `pg_dump` (or trigger the existing
   `weeklyRawBackup.ts` Google Drive backup job on demand) before touching anything — this must be
   restorable before step 2 proceeds.
2. **Verify no schema drift.** Confirm the *live* production schema actually matches what
   `schema.ts` (and therefore the 0000-0008 migration files, which were generated from it) describes
   — e.g. `drizzle-kit check` or a manual diff — since `push` could in principle have been run at a
   point where `schema.ts` had since drifted from an intermediate state. If there's drift, the
   baseline must be built from the *actual* live schema, not assumed from the journal.
3. **Manually seed the tracking table** — on a copy of production, not production itself yet:
   - Create `"drizzle"."__drizzle_migrations"` (columns: `id serial primary key`, `hash text not
     null`, `created_at bigint`) if it doesn't already exist.
   - Insert one row per existing migration file (0000-0008), each with the **exact hash
     `drizzle-kit` itself computes** for that file's contents — this has to come from `drizzle-kit`'s
     own hashing (not guessed), since a mismatched hash makes `migrate()` treat an already-applied
     migration as pending and try to re-run it. `drizzle/meta/_journal.json`'s existing `when` values
     (epoch ms) are reasonable to reuse for `created_at`, since that only affects display/ordering,
     not which migrations get skipped.
4. **Dry-run against a staging copy of production** (restored from the step-1 backup, *not*
   production) — run `drizzle-kit migrate` and confirm it reports **zero** pending migrations. This
   is the real verification gate; nothing proceeds to production without a clean dry run here.
5. **Only after step 4 passes clean**, apply the same seeding to production itself, then switch
   `deploy.sh` from `drizzle-kit push --force` to `drizzle-kit migrate` for all *future* schema
   changes. From that point on, every schema change goes through `db:generate` (review the generated
   SQL) → commit the migration file → `migrate` applies it — a real, replayable history instead of
   `push`'s silent live-diff, and the existing 0000-0008 files become genuinely useful for spinning
   up a fresh environment (a replica, a CI test database) from scratch.

**Open risk to flag explicitly:** step 3's hash-matching is the one place this plan could go wrong
if executed carelessly — getting it right requires either running `drizzle-kit`'s own tooling to
produce the hashes (not hand-computing them) or a verified reference for its exact algorithm, not
an assumption. This document deliberately stops at "here's the procedure and where the real risk
is," not a ready-to-paste SQL script, because that script should only get written and reviewed at
the point the user actually approves doing this.
