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
there is no local Docker stack with the same volumes, with one deliberate exception in §0a (copying
the backup *off* the VPS), which is explicitly labeled as running on your own machine. Every other
code block below is explicitly labeled **(on the VPS, via SSH)** or **(GitHub Actions, automatic)**
so there's no ambiguity about where to paste it.

**Context — why §0 exists at all:** the currently-running `vending-api` container has no volume
for `/app/apps/api/uploads` — those files live only in the container's own writable layer. Worse,
the *current* production `deploy.sh` (on `main`, before this branch) already runs
`docker compose down --remove-orphans` unconditionally on **every single deploy**, before rebuilding
— so this was never a risk specific to the first GHCR deploy; every past deploy has already wiped
whatever photos existed before it, and whatever's in the container right now is only what's been
uploaded since the *last* deploy. The first GHCR deploy is simply the next event that will do the
same thing, and it's the last chance to capture what's there before `uploads_data` makes this a
non-issue going forward.

## 0. BEFORE you merge (on the VPS, via SSH) — mandatory

**Do this before merging this branch to `main` at all.** Once merged, the next push-triggered
deploy removes the running `vending-api` container exactly like every deploy before it has — at
that point anything not already copied out is gone for good.

### 0a. Back up existing photos now — this is the only copy

```bash
# (on the VPS, via SSH, from the app directory)
BACKUP_DIR="$HOME/uploads-backup-$(date +%F)"
docker cp vending-api:/app/apps/api/uploads "$BACKUP_DIR"
```

Check the layout you actually got — `docker cp`'s destination semantics depend on whether
`$BACKUP_DIR` already existed (it shouldn't, given the date-stamped name, but confirm):

```bash
# (on the VPS, via SSH)
ls -R "$BACKUP_DIR"
```

**Then verify nothing was dropped in transit — compare file counts, not just "it ran without an
error":**

```bash
# (on the VPS, via SSH)
LOCAL_COUNT=$(find "$BACKUP_DIR" -type f | wc -l)
CONTAINER_COUNT=$(docker exec vending-api sh -c 'find /app/apps/api/uploads -type f | wc -l')
echo "backup: $LOCAL_COUNT   container (still live): $CONTAINER_COUNT"
```

**Do not proceed with the merge until these two numbers are equal.** If they don't match, the
backup is incomplete — investigate before touching anything else (don't retry blindly; find out why
first, e.g. a permissions issue `docker cp` silently skipped).

**This copy still only exists on the VPS itself — get it off the VPS too**, since a VPS-local backup
doesn't protect against anything that takes the VPS itself down:

```bash
# (on the VPS, via SSH)
tar czf "$BACKUP_DIR.tar.gz" -C "$HOME" "$(basename "$BACKUP_DIR")"
```

```bash
# (on your own machine — the one place in this runbook that's NOT run on the VPS,
#  because the whole point is getting a copy to somewhere that isn't the VPS)
scp <vps_user>@<vps_host>:~/uploads-backup-<date>.tar.gz .
```

### 0b. Go/No-Go checklist before merging

- [ ] §0a's two file counts match exactly.
- [ ] The `.tar.gz` has been copied off the VPS (confirmed present on your own machine, not just
      that the `scp` command exited 0).
- [ ] Merging at a quiet hour — the first GHCR deploy is still a real restart (~10-30s on
      `api`/`web`, see §4), and it's the first time this exact pull-deploy path has run for real.
- [ ] Required GitHub repository secrets are present (names only — never paste values anywhere):
      `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`,
      `JWT_SECRET`, `POSTGRES_PASSWORD`, and (optional) `VPS_PORT`, `GH_PAT`,
      `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- [ ] Enough free space on the VPS to pull two new images alongside whatever's already cached:
      ```bash
      # (on the VPS, via SSH)
      df -h /
      docker system df
      ```

Only merge once every box above is checked.

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

### 2a. The photo backup already happened — in §0, before you merged

Don't take a fresh backup here — the container §0a backed up from is gone by now (removed by the
deploy that just ran, same as every deploy before it). This is very likely a *different SSH
session* from §0a's, so `$BACKUP_DIR` isn't still set — re-set it to the exact dated path you used
there before anything below:

```bash
# (on the VPS, via SSH)
BACKUP_DIR="$HOME/uploads-backup-<the-date-you-used-in-§0>"   # fill in the real date
ls -R "$BACKUP_DIR"
```

If you skipped §0 or can't find that backup, stop and check `~/uploads-backup-*.tar.gz` (both on
the VPS and wherever §0a's `scp` sent it) before going any further — there is no other copy.

The `ls -R` output above determines step 2c's source path — `docker cp`'s destination semantics
depend on whether the backup directory already existed when it was taken. If it shows an
`issues/` subdirectory, the backup mirrors `uploads/` directly (contents land at
`<backup-dir>/issues/<files>`). If it shows the photo files directly with no `issues/` subfolder,
adjust the `cp` source path in step 2c accordingly (`/backup/.` instead of `/backup/issues/.`).

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
BACKUP_DIR="$HOME/uploads-backup-<the-date-you-used-in-§0>"   # same directory §0a created

docker run --rm \
  -v "$VOL":/data \
  -v "$BACKUP_DIR":/backup:ro \
  alpine sh -c 'mkdir -p /data/issues && cp -a /backup/issues/. /data/issues/ && chown -R 1000:1000 /data'
```

(Swap `/backup/issues/.` for `/backup/.` if step 2a's `ls -R` showed no `issues/` subfolder.)

This is a **one-time** step, done once right after the first deploy that introduces the
`uploads_data` volume. Every deploy after that keeps using the same volume — nothing to repeat.

## 3. Rollback

- **Automatic**: `deploy.sh` already rolls back on a failed health check — see §1. Nothing to run
  manually in that case. As of the rollback-safety fix, it (and everything below) refuses to roll
  back to `latest` — only an immutable `sha-xxxxxxx` tag is ever accepted, since `latest` is a
  floating pointer our own build job overwrites on every push and may already point at the exact
  broken image you're trying to get away from.
- **Manual, later** (the new tag looked healthy at deploy time but turned out broken in practice):
  ```bash
  # (on the VPS, via SSH, from the app directory)
  scripts/rollback.sh sha-abc1234
  # see ~/deploy-state/previous_tag for the last known-good tag, if one was recorded
  ```
- **If `scripts/rollback.sh` itself won't run** (e.g. the script changed and is the thing that's
  broken) — do the same thing it does, by hand, with a *known-good `sha-xxxxxxx` tag*, never
  `latest`:
  ```bash
  # (on the VPS, via SSH, from the app directory)
  export IMAGE_TAG=sha-<known-good-short-sha>
  docker compose -f docker-compose.yml pull web api
  docker compose -f docker-compose.yml up -d --no-deps --wait api web
  ```
  **Do not** fall back to reverting `deploy.sh`/`docker-compose.yml` to an old pre-GHCR commit and
  re-running it — that flow runs `docker compose down --remove-orphans` unconditionally (tearing
  down `db` and `nginx` too, not just `api`/`web`) and then rebuilds on the VPS from scratch
  (20-30 min). It's slower, touches services that don't need touching, and leaves the repo in a
  manually-reverted state that's easy to forget about. **Never run `docker compose down -v`** or
  remove any named volume (`postgres_data`, `uploads_data`) as part of any rollback, under any
  circumstance.

## 4. Downtime — be honest about this

`docker compose up -d --no-deps api web` is **not** zero-downtime. It stops the old `api`/`web`
container, removes it, then creates and starts the new one in its place — sequential, not the
parallel create-then-cutover that `docker-compose.green.yml`'s blue-green flow does. Expect a real
**~10-30 second gap** where nginx returns connection-refused/502 for that service while the new
container boots. `db` and `nginx` themselves are never touched by this rolling update at all. If a
deploy ever needs genuinely zero downtime, use the blue-green flow in `docker-compose.green.yml`
instead — this runbook's §1-3 don't provide that.

## 5. Lessons from #84 and #85

**(a) nginx reload can silently serve a stale config.** `nginx.conf` is a single-file bind mount;
`git reset --hard` replaces it by writing a new file and renaming it into place (a new inode), but
the already-running container's mount keeps pointing at the old, now-unlinked inode. `nginx -s
reload` re-reads *that* — reports success, changes nothing. `reload_nginx()` in both `deploy.sh`
and `scripts/rollback.sh` now compares `sha256sum` of the host file against the one inside the
container first: identical → reload in place as before; different → `docker restart vending-nginx`
(which re-resolves the mount) instead, and waits for `nginx -t` to pass before continuing.

**(b) A stale/revoked `GH_PAT` 401s even on a public repo.** GitHub returns 401 for an invalid
token regardless of whether the repo actually needs auth — there's no "oh, this repo is public,
ignore the bad token" fallback on GitHub's side. Both the clone and fetch steps in `deploy.yml` now
retry once without the auth header on failure, with a clear warning, before giving up; `GIT_TERMINAL_PROMPT=0`
is also set so a bad credential fails fast instead of hanging on an unanswerable interactive prompt.

**(c) The first GHCR deploy on a VPS has `ROLLBACK_AVAILABLE=false` if nothing valid is already
running.** This isn't a bug to fix later — see §1's note on it. If that specific deploy's health
check fails, there is genuinely nothing to automatically roll back to yet; it stops for manual
investigation on purpose rather than attempting a rollback to nothing.

**(d) "Re-run failed jobs" is only unambiguously safe when the failure happened *before* any
`docker compose` command ran** — e.g. the git-auth/clone step or the GHCR login: nothing on the VPS
changed yet, so restarting from scratch is a clean retry. Once `docker compose pull`/`up` has
already succeeded earlier in the same run (for instance, the DB sync or Super Admin step is what
actually failed), re-running from scratch re-executes those already-succeeded steps too — pull/up/
reload/health-checks are all effectively idempotent against containers already on the target tag,
but `drizzle-kit push --force` (the DB sync step) is not something to blindly re-trigger without
first checking what state the earlier partial run left the schema in.
