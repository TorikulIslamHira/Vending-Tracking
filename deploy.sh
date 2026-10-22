#!/bin/bash
set -e

# Detect docker permission and configure compose command.
#
# Always pin -f docker-compose.yml explicitly rather than let Compose fall
# back to its own default file-discovery (which auto-loads a
# docker-compose.override.yml from the CWD if one happens to exist, with
# zero signal that it did). docker-compose.dev.yml restores `build:` for
# local dev and is gitignored-from-production-mind-wise only by
# convention, not enforcement — without an explicit -f here, if that file
# (or any future docker-compose.override.yml) ever ends up in this
# directory on the VPS, every command below would silently start
# rebuilding images from source instead of pulling from GHCR, with no
# error and no log line calling it out. There is no actual "build as a
# fallback if the pull fails" behavior anywhere in this script — the only
# thing that ever resembled one was that implicit auto-load, which isn't
# safe to depend on (a reset to a ref that doesn't have the override file
# makes it vanish out from under you) and isn't made safe by trying to
# preserve it — it's removed here instead, for good.
if docker ps >/dev/null 2>&1; then
  DOCKER_CMD="docker"
  COMPOSE_CMD="docker compose -f docker-compose.yml"
elif sudo -n docker ps >/dev/null 2>&1 || sudo docker ps >/dev/null 2>&1; then
  DOCKER_CMD="sudo docker"
  COMPOSE_CMD="sudo docker compose -f docker-compose.yml"
else
  DOCKER_CMD="docker"
  COMPOSE_CMD="docker compose -f docker-compose.yml"
fi

# Ensure at least 2GB of swap space exists on the VPS to prevent Docker OOM crashes
SWAP_TOTAL=$(free -m | awk '/Swap:/ {print $2}')
if [ -z "$SWAP_TOTAL" ] || [ "$SWAP_TOTAL" -lt 1024 ]; then
  echo "🧠 Configuring 2GB swap space on host..."
  if [ ! -f /swapfile ]; then
    if sudo -n true 2>/dev/null; then
      sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
      sudo chmod 600 /swapfile
      sudo mkswap /swapfile
      sudo swapon /swapfile || true
    fi
  else
    sudo swapon /swapfile 2>/dev/null || true
  fi
fi

echo "=========================================="
echo "🚀 Bee Novelty Vending Deployment Script"
echo "=========================================="

echo "🔍 0/4 Verifying required environment configuration..."
if [ ! -f .env ]; then
  echo "❌ No .env file found in $(pwd)."
  echo "   Copy .env.production.example to .env and fill in real values, or"
  echo "   configure the corresponding GitHub Actions secrets so the CI/CD"
  echo "   pipeline can inject it automatically."
  exit 1
fi

# Fail fast with a clear, per-variable report — rather than letting a missing
# value surface much later as an opaque docker-compose ":?" error after the
# build has already started. Never prints the values themselves.
MISSING_VARS=""
for VAR in POSTGRES_PASSWORD JWT_SECRET SUPER_ADMIN_EMAIL SUPER_ADMIN_PASSWORD; do
  VALUE=$(grep -E "^${VAR}=" .env | tail -n1 | cut -d '=' -f2- | tr -d '\r')
  if [ -z "$VALUE" ]; then
    echo "  ❌ $VAR is missing a value"
    MISSING_VARS="$MISSING_VARS $VAR"
  else
    echo "  ✅ $VAR is set"
  fi
done

if [ -n "$MISSING_VARS" ]; then
  echo "🛑 Aborting: missing required .env value(s):$MISSING_VARS"
  echo "   Set them as GitHub repository secrets (Settings → Secrets and"
  echo "   variables → Actions) so the deploy workflow can sync them, or add"
  echo "   them to .env on this server directly, then re-run."
  exit 1
fi

# GHCR_TOKEN/GHCR_ACTOR are only set when deploy.yml invokes this script —
# they're the deploy job's own short-lived GITHUB_TOKEN, passed over SSH the
# same way GH_PAT already is. A manual run on the VPS with no GHCR_TOKEN set
# just skips the login and relies on whatever session docker already has.
if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "🔑 Logging in to ghcr.io..."
  echo "$GHCR_TOKEN" | $DOCKER_CMD login ghcr.io -u "${GHCR_ACTOR:-x-access-token}" --password-stdin
  # Always log back out, however this script exits — a lingering ghcr.io
  # session on a shared VPS user outlives the ephemeral token's job.
  trap '$DOCKER_CMD logout ghcr.io >/dev/null 2>&1 || true' EXIT
fi

echo "📥 1/4 Synchronizing latest changes from GitHub..."
# This repo is private. When run via the CI/CD workflow, GIT_AUTH_HEADER is
# already exported into this process's environment (built from the GH_PAT
# repository secret) — reuse it here rather than embedding a token in the
# remote URL. Falls back to a plain fetch for a manual/interactive run on
# the VPS, where a real TTY or a configured credential helper can handle
# the prompt instead.
if [ -n "${GIT_AUTH_HEADER:-}" ]; then
  git -c http.extraheader="$GIT_AUTH_HEADER" fetch origin main
else
  git fetch origin main
fi
git reset --hard origin/main

# No images are built on the VPS any more (see .github/workflows/deploy.yml's
# `build` job) — api/web are pre-built on GitHub's runners and pushed to
# GHCR, so this step is now a pull-and-roll instead of a 20-30 minute
# on-VPS build. `image prune -f` only removes dangling (untagged) layers —
# every sha-tagged image stays cached locally under its own tag, which is
# exactly what makes the rollback below fast.
$DOCKER_CMD image prune -f || true

DEPLOY_STATE_DIR="$HOME/deploy-state"
mkdir -p "$DEPLOY_STATE_DIR"
PREVIOUS_TAG_FILE="$DEPLOY_STATE_DIR/previous_tag"

# Only ever trust a candidate rollback tag that actually looks like a
# tag: no slashes, no "@sha256:..." digest, no empty string. Exported so
# the same definition is sourceable in isolation for testing.
TAG_REGEX='^[A-Za-z0-9_.-]{1,128}$'
is_valid_tag() {
  [[ "$1" =~ $TAG_REGEX ]]
}

# The tag that was running *before* this deploy — what a failed health
# check below rolls back to.
#
# The VPS can currently be running a LOCALLY BUILT image from the old
# pre-GHCR flow — Compose names those after the project/service with no
# registry and often no explicit tag at all (e.g. "vending-tracking-api"
# or "vending-tracking-api:latest"), not a ghcr.io reference. On the very
# first GHCR deploy, naively taking whatever's after the last ":" in that
# string either returns the whole un-tagged image name (no ":" to split
# on at all) or "latest" — either way, writing that into previous_tag
# would make a future rollback try to `docker compose pull` a tag that
# was never pushed to GHCR and doesn't exist there.
#
# So a candidate is only ever accepted as LAST_GOOD_TAG if it's an exact
# match for OUR GHCR repo: "ghcr.io/<owner>/vending-api:<tag>", built from
# the same $IMAGE_OWNER deploy.yml already passes in (same default as
# docker-compose.yml's own `${IMAGE_OWNER:-torikulislamhira}`). This
# single prefix+regex check rejects every bad case without needing a
# separate "is it a digest" branch: a locally-built image never starts
# with "ghcr.io/" at all; a digest reference
# ("ghcr.io/.../vending-api@sha256:...") has "@" immediately after the
# image name where the prefix below requires a literal ":", so the prefix
# match itself already fails; and even a combined tag+digest reference
# ("...vending-api:tag@sha256:...") would still get caught by
# is_valid_tag's character class, which has no "@" in it.
GHCR_OWNER="${IMAGE_OWNER:-torikulislamhira}"
GHCR_API_PREFIX="ghcr.io/${GHCR_OWNER}/vending-api:"

ROLLBACK_AVAILABLE=true
LAST_GOOD_TAG=""

if [ -f "$PREVIOUS_TAG_FILE" ]; then
  RECORDED_TAG=$(cat "$PREVIOUS_TAG_FILE")
  if is_valid_tag "$RECORDED_TAG"; then
    LAST_GOOD_TAG="$RECORDED_TAG"
  else
    echo "⚠️  $PREVIOUS_TAG_FILE contains '$RECORDED_TAG', which doesn't look like a valid image tag — ignoring it and checking what's actually running instead."
  fi
fi

if [ -z "$LAST_GOOD_TAG" ]; then
  # No usable recorded tag (file missing, or its content failed
  # validation above) — see if the currently running container is
  # already one of our real GHCR images.
  RUNNING_API_IMAGE=$($DOCKER_CMD inspect -f '{{.Config.Image}}' vending-api 2>/dev/null || true)
  if [[ "$RUNNING_API_IMAGE" == "$GHCR_API_PREFIX"* ]]; then
    CANDIDATE_TAG="${RUNNING_API_IMAGE#"$GHCR_API_PREFIX"}"
    if is_valid_tag "$CANDIDATE_TAG"; then
      LAST_GOOD_TAG="$CANDIDATE_TAG"
      echo "ℹ️  No usable recorded previous_tag — using the currently running image's tag ('$LAST_GOOD_TAG') as the rollback target."
    fi
  fi
fi

if [ -z "$LAST_GOOD_TAG" ]; then
  ROLLBACK_AVAILABLE=false
  echo "⚠️  No usable previous tag found — no valid previous_tag recorded, and the currently running image isn't one of our GHCR tags (likely still on the old locally-built flow, or this is the first-ever deploy on this VPS). Rollback is UNAVAILABLE: if this deploy's health check fails below, it will stop for manual investigation instead of attempting a rollback that has nothing real to fall back to."
fi

export IMAGE_TAG="${IMAGE_TAG:-latest}"

# --no-deps: never touch db/nginx here, even though they're declared
# dependencies — they keep running unchanged unless their own config
# changed. --wait blocks until the new containers report healthy (see the
# `healthcheck:` blocks in docker-compose.yml), then the curls re-check the
# same thing through nginx's actual public path — a container's own
# healthcheck only proves Docker can reach it directly (curl from inside);
# it says nothing about whether nginx's upstream resolution works.
#
# Honest downtime note: this is NOT the zero-downtime blue-green swap
# docker-compose.green.yml does (a second container built up alongside the
# first, cut over, then the old one torn down). `up -d --no-deps` on the
# SAME project stops the old api/web container, removes it, then creates
# and starts the new one in its place — sequential, not parallel. Expect a
# genuine ~10-30s gap where nginx gets connection-refused/502 on that
# service while the new container boots, not true zero-downtime. The
# blue-green flow in docker-compose.green.yml exists for when that gap
# actually matters.
#
# nginx.conf is a bind mount (docker-compose.yml), not baked into the
# nginx:alpine image — a commit that changes it lands the new file on disk
# via the git reset above, but the *running* nginx process keeps the config
# it already loaded until it's told to reload. `nginx -t` first: never
# reload a config that doesn't even parse, which would otherwise take the
# whole site down instead of just failing this deploy. The nginx container
# itself is never recreated here — reload, not restart/up, and only
# `up -d --no-deps nginx` (never touching api/web/db) if it's not even
# running.
reload_nginx() {
  if $DOCKER_CMD inspect -f '{{.State.Running}}' vending-nginx 2>/dev/null | grep -q true; then
    if $DOCKER_CMD exec vending-nginx nginx -t; then
      $DOCKER_CMD exec vending-nginx nginx -s reload
    else
      echo "🛑 nginx -t failed on the new config — NOT reloading (would drop the working one)."
      return 1
    fi
  else
    echo "⚠️  vending-nginx is not running — starting it (--no-deps, nothing else touched)..."
    $COMPOSE_CMD up -d --no-deps nginx
  fi
}

roll_out() {
  $COMPOSE_CMD pull web api \
    && $COMPOSE_CMD up -d --no-deps --wait api web \
    && reload_nginx \
    && curl -fsS -o /dev/null http://localhost/login \
    && curl -fsS -o /dev/null http://localhost/api/v1/health
}

echo "🐳 2/4 Pulling image tag '$IMAGE_TAG', rolling out api/web, and verifying through nginx..."
if roll_out; then
  echo "✅ '$IMAGE_TAG' is healthy and reachable through nginx."
  echo "$IMAGE_TAG" > "$PREVIOUS_TAG_FILE"
elif [ "$ROLLBACK_AVAILABLE" = false ]; then
  echo "🛑 '$IMAGE_TAG' failed its health/nginx check, and there is no known-good tag to roll back to (no valid previous_tag, and nothing currently running is one of our GHCR images). Containers may be left in a broken state — investigate immediately, e.g.:"
  echo "   $COMPOSE_CMD logs --tail=100 api web"
  exit 1
else
  echo "❌ '$IMAGE_TAG' failed its health/nginx check — rolling back to '$LAST_GOOD_TAG'..."
  export IMAGE_TAG="$LAST_GOOD_TAG"
  if roll_out; then
    echo "⚠️  Rolled back to '$LAST_GOOD_TAG'. The failed deploy still needs investigating."
  else
    echo "🛑 Rollback to '$LAST_GOOD_TAG' also failed — manual intervention required."
  fi
  exit 1
fi

echo "🗄️ 3/4 Synchronizing database schema (Drizzle db push)..."
# No sleep-and-hope wait for Postgres here: the `--wait` above already
# blocked until api's own /health check passed, and /health runs a real
# `SELECT 1` against the database — so the DB connection is already proven
# live by the time this line runs.
# Invoke drizzle-kit's binary directly rather than through `pnpm run` / `pnpm
# --filter`: pnpm wraps every `run` with a dependency-status check that tries
# to reach the npm registry and write to /app, which fails under the api
# container's non-root, network-restricted production runtime (the same class
# of bug already worked around for the container's own CMD — see the
# Dockerfile comment above `node dist/server.js`). No `|| true` here: if
# schema sync genuinely fails, the deploy must fail loudly rather than
# silently leave the live database drifted out of sync with the code that's
# now running against it (exactly how a "column ... does not exist" error
# reaches production).
if $COMPOSE_CMD exec -T -w /app/packages/database api node_modules/.bin/drizzle-kit push --force; then
  echo "✅ Database schema in sync with Drizzle ORM."
else
  echo "❌ Database schema push failed."
  echo "   Containers are running but may be serving against a stale schema."
  echo "   Investigate immediately, e.g.:"
  echo "     $COMPOSE_CMD exec -w /app/packages/database api node_modules/.bin/drizzle-kit push --force"
  exit 1
fi

echo "🔑 4/4 Provisioning/repairing the Super Admin account..."
# Runs the already-compiled dist/seed.js directly (plain `node`, no pnpm/tsx
# wrapper — same reasoning as the drizzle-kit invocation above). Reads
# SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD from the container's own environment
# (wired in via docker-compose.yml) and re-hashes + upserts on every deploy,
# so the stored bcrypt hash can never drift from the current secret and the
# account can never end up locked out or missing after a fresh deploy.
if $COMPOSE_CMD exec -T -w /app/packages/database api node dist/seed.js; then
  echo "✅ Super Admin account synced."
else
  echo "❌ Super Admin provisioning failed."
  echo "   Investigate immediately, e.g.:"
  echo "     $COMPOSE_CMD exec -w /app/packages/database api node dist/seed.js"
  exit 1
fi

echo "🧹 Cleaning up obsolete Docker image layers..."
# || true: a cleanup hiccup here must never mask an otherwise fully
# successful deploy — set -e would abort before the success banner below.
$DOCKER_CMD image prune -f || true

echo "=========================================="
echo "🎉 Deployment successfully completed!"
echo "=========================================="
