---
title: GHCR Deploy Runbook
date: 2026-10-22
dependencies:
  - "[[00-System-Architecture-MoC.md]]"
impacts:
  - "[[apps/api]]"
  - "[[apps/web]]"
tags:
  - runbook
  - deploy
  - ghcr
  - rollback
  - uploads
---

# GHCR Deploy Runbook

**Where each step runs — read this first.** Every `docker`/`docker compose` command below
operates on containers and named volumes (`uploads_data`, `postgres_data`) that only exist on
**the production VPS**. None of it works, or means anything, run from a developer's own laptop —
there is no local Docker stack with the same volumes. Every code block below is explicitly labeled
**(on the VPS, via SSH)** or **(GitHub Actions, automatic)** so there's no ambiguity about where to
paste it.

## 1. First deploy after merging to `main`

1. **(GitHub Actions, automatic)** A push to `main` triggers `.github/workflows/deploy.yml`'s
   `build` job: builds `apps/api`/`apps/web`, pushes `ghcr.io/<owner>/vending-{api,web}:sha-<short>`
   and `:latest`, then the `deploy` job SSHes into the VPS and runs `deploy.sh`.
2. **(on the VPS, via SSH)** Watch `deploy.sh`'s own output for, in order: `Logging in to ghcr.io`,
   `Pulling image tag '...'`, `nginx -t` reporting `syntax is ok` / `test is successful`, the two
   silent `curl` health checks, then `✅ '...' is healthy and reachable through nginx`. If this is
   genuinely the first GHCR deploy ever run on this VPS, you'll also see one of:
   - `ℹ️  No recorded previous_tag yet — using the currently running image's tag ('...')...` (a
     container was already running — rollback has a real target), or
   - `⚠️  No recorded previous_tag and no running vending-api container...` (nothing was running at
     all — rollback is unavailable for *this* deploy only; it does not fail the deploy, only a
     later failed health check would have nowhere to fall back to).
3. **(on the VPS, via SSH)** The DB sync/Super Admin steps (`3/4`, `4/4`) run exactly as every prior
   deploy — unchanged by any of this.

## 2. Photo backup and seeding the `uploads_data` volume

**All of this runs on the VPS.** `uploads_data` is a Docker-managed named volume
(`docker-compose.yml`) that only exists there — there is nothing to back up or seed on your own
machine.

### 2a. Back up existing photos (before the `uploads_data` volume exists)

```bash
# (on the VPS, via SSH, from the app directory)
docker cp vending-api:/app/apps/api/uploads ~/uploads-backup
```

Check the layout you actually got before the next step — `docker cp`'s destination semantics
depend on whether `~/uploads-backup` already existed:

```bash
# (on the VPS, via SSH)
ls -R ~/uploads-backup
```

If it shows an `issues/` subdirectory, the backup mirrors `uploads/` directly (contents land at
`~/uploads-backup/issues/<files>`). If it shows the photo files directly with no `issues/`
subfolder, adjust the `cp` source path in step 2c accordingly (`/backup/.` instead of
`/backup/issues/.`).

### 2b. Confirm the real volume name and the `node` user's uid — don't assume either

```bash
# (on the VPS, via SSH)
docker volume ls | grep uploads_data
# expect vending-tracking_uploads_data — but confirm; it depends on the actual
# project-directory name / COMPOSE_PROJECT_NAME on this specific VPS.

docker run --rm ghcr.io/<owner>/vending-api:<tag> id node
# official node:*-alpine images use uid:gid 1000:1000 — confirm against the
# actual pulled image rather than assuming.
```

### 2c. Seed the volume

```bash
# (on the VPS, via SSH)
VOL=vending-tracking_uploads_data   # replace with what `docker volume ls` showed above

docker run --rm \
  -v "$VOL":/data \
  -v ~/uploads-backup:/backup:ro \
  alpine sh -c 'mkdir -p /data/issues && cp -a /backup/issues/. /data/issues/ && chown -R 1000:1000 /data'
```

(Swap `/backup/issues/.` for `/backup/.` if step 2a's `ls -R` showed no `issues/` subfolder.)

This is a **one-time** step, done once right after the first deploy that introduces the
`uploads_data` volume. Every deploy after that keeps using the same volume — nothing to repeat.

## 3. Rollback

- **Automatic**: `deploy.sh` already rolls back on a failed health check — see §1. Nothing to run
  manually in that case.
- **Manual, later** (the new tag looked healthy at deploy time but turned out broken in practice):
  ```bash
  # (on the VPS, via SSH, from the app directory)
  scripts/rollback.sh sha-abc1234
  # or: scripts/rollback.sh latest
  # see ~/deploy-state/previous_tag for the last known-good tag, if one was recorded
  ```
- **Manual fallback to the pre-GHCR flow**, if the new pull-deploy flow itself is broken and you
  need the site back up now:
  ```bash
  # (on the VPS, via SSH, from the app directory)
  git checkout 9436352 -- deploy.sh docker-compose.yml nginx/nginx.conf docker-compose.green.yml
  ./deploy.sh
  ```
  That commit is the last one before any GHCR/nginx/photo work — slower (builds on the VPS,
  20-30 min) but it's the known-good path. Afterward, decide how to get back to the tip of `main`
  (`git reset --hard origin/main` once the underlying issue is fixed, or whatever the team's normal
  flow is).

## 4. Downtime — be honest about this

`docker compose up -d --no-deps api web` is **not** zero-downtime. It stops the old `api`/`web`
container, removes it, then creates and starts the new one in its place — sequential, not the
parallel create-then-cutover that `docker-compose.green.yml`'s blue-green flow does. Expect a real
**~10-30 second gap** where nginx returns connection-refused/502 for that service while the new
container boots. `db` and `nginx` themselves are never touched by this rolling update at all. If a
deploy ever needs genuinely zero downtime, use the blue-green flow in `docker-compose.green.yml`
instead — this runbook's §1-3 don't provide that.
