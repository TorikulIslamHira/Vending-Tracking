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

**Why switching cold is unsafe, and the actual skip mechanism (verified against the installed
source, not assumed):** `drizzle-kit migrate` ultimately calls `drizzle-orm`'s own
`PgDialect.migrate()`. Quoting the installed package directly —
`node_modules/drizzle-orm/pg-core/dialect.js:44-72` (identical logic in every dialect; this is the
`postgres-js`-reached path):

```js
// pg-core/dialect.js:44-72
async migrate(migrations, session, config) {
    const migrationsTable = typeof config === "string" ? "__drizzle_migrations" : config.migrationsTable ?? "__drizzle_migrations";
    const migrationsSchema = typeof config === "string" ? "drizzle" : config.migrationsSchema ?? "drizzle";
    const migrationTableCreate = sql`
			CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at bigint
			)
		`;
    await session.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(migrationsSchema)}`);
    await session.execute(migrationTableCreate);
    const dbMigrations = await session.all(
      sql`select id, hash, created_at from ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} order by created_at desc limit 1`
    );
    const lastDbMigration = dbMigrations[0];
    await session.transaction(async (tx) => {
      for await (const migration of migrations) {
        if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
          for (const stmt of migration.sql) {
            await tx.execute(sql.raw(stmt));
          }
          await tx.execute(
            sql`insert into ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} ("hash", "created_at") values(${migration.hash}, ${migration.folderMillis})`
          );
        }
      }
    });
  }
```

And `migration.folderMillis`/`migration.hash` come from `node_modules/drizzle-orm/migrator.js:19-24`:

```js
// migrator.js:19-24
migrationQueries.push({
  sql: result,
  bps: journalEntry.breakpoints,
  folderMillis: journalEntry.when,
  hash: crypto.createHash("sha256").update(query).digest("hex")
});
```

**This corrects an earlier version of this document, which claimed the skip decision was a
per-migration hash lookup.** It is not. The actual mechanism:

- The query at `dialect.js:56-57` fetches **only the single most recent row**
  (`order by created_at desc limit 1`) — not the full set of previously-applied hashes.
- The loop at `dialect.js:61-62` applies migration file *N* **only if**
  `lastDbMigration.created_at < migration.folderMillis` — a plain timestamp comparison against that
  one latest row. `folderMillis` is exactly `_journal.json`'s `when` field for that entry
  (`migrator.js:22`).
- `hash` (a SHA-256 of the migration file's raw text, `migrator.js:23`) is only ever **written**
  when a migration applies (`dialect.js:67`) — it is never read back or compared for the skip
  decision. It's bookkeeping, not the gate.

**Practical consequence — this makes the baseline simpler than previously written:** since only the
single latest `created_at` matters, the tracking table needs **exactly one row**, not one per
existing migration file. Seed it with migration `0008`'s own `folderMillis` and its real hash, and
every one of 0000-0008 evaluates as "already applied" in one comparison each (all of their
`folderMillis` values are ≤ 0008's, by construction — they're chronologically ordered), so the whole
loop skips cleanly on the first real `migrate()` run.

From `packages/database/drizzle/meta/_journal.json`'s last entry:
```json
{ "idx": 8, "tag": "0008_material_maria_hill", "when": 1791157268448 }
```
And the real SHA-256 of that file's contents (computed locally, read-only, exactly as
`migrator.js:23` computes it — `sha256(fs.readFileSync(path).toString())`):
```
7127c075b54cb2a704cc9b85ae311a7b1b4e6f2df3b88255a8c828ff9c1c3b1d
```

**Safe baseline procedure (plan only — nothing below was executed, nothing under
`packages/database` was modified to produce it, no database was accessed):**

1. **Full backup first, non-negotiable.** A manual `pg_dump` (or trigger the existing
   `weeklyRawBackup.ts` Google Drive backup job on demand) before touching anything — this must be
   restorable before step 2 proceeds.
2. **Verify no schema drift.** Confirm the *live* production schema actually matches what
   `schema.ts` (and therefore the 0000-0008 migration files, which were generated from it) describes
   — e.g. `drizzle-kit check` or a manual diff — since `push` could in principle have been run at a
   point where `schema.ts` had since drifted from an intermediate state. If there's drift, the
   baseline must be built from the *actual* live schema, not assumed from the journal.
3. **Manually seed the tracking table with one row** — on a copy of production, not production
   itself yet:
   ```sql
   CREATE SCHEMA IF NOT EXISTS "drizzle";
   CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
     id SERIAL PRIMARY KEY,
     hash text NOT NULL,
     created_at bigint
   );
   INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
   VALUES (
     '7127c075b54cb2a704cc9b85ae311a7b1b4e6f2df3b88255a8c828ff9c1c3b1d',
     1791157268448
   );
   ```
   That's the exact `CREATE SCHEMA`/`CREATE TABLE` DDL `dialect.js:47-55` itself would run, and the
   one row is migration `0008`'s own real hash/timestamp — not placeholders, and not one row per
   migration file (unnecessary given the mechanism above).
4. **Dry-run against a staging copy of production** (restored from the step-1 backup, *not*
   production) — run `drizzle-kit migrate` and confirm it reports **zero** pending migrations. This
   is the real verification gate; nothing proceeds to production without a clean dry run here.
5. **Only after step 4 passes clean**, apply the same single-row seed to production itself, then
   switch `deploy.sh` from `drizzle-kit push --force` to `drizzle-kit migrate` for all *future*
   schema changes. From that point on, every schema change goes through `db:generate` (review the
   generated SQL) → commit the migration file → `migrate` applies it — a real, replayable history
   instead of `push`'s silent live-diff, and the existing 0000-0008 files become genuinely useful for
   spinning up a fresh environment (a replica, a CI test database) from scratch.

**Open risk to flag explicitly:** this now has a precise, verified mechanism rather than an assumed
one, so the main remaining risk is step 2 (undetected schema drift between the live DB and
`schema.ts`/the journal) — if that drift exists, the single seeded row would make `migrate()` skip
a migration the live DB doesn't actually have, silently. Step 2's drift check is the real gate this
plan depends on; it is not optional.
