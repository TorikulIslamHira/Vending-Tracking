#!/bin/bash
set -e

# Detect docker permission and configure compose command
if docker ps >/dev/null 2>&1; then
  DOCKER_CMD="docker"
  COMPOSE_CMD="docker compose"
elif sudo -n docker ps >/dev/null 2>&1 || sudo docker ps >/dev/null 2>&1; then
  DOCKER_CMD="sudo docker"
  COMPOSE_CMD="sudo docker compose"
else
  DOCKER_CMD="docker"
  COMPOSE_CMD="docker compose"
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

echo "🔍 0/5 Verifying required environment configuration..."
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

echo "📥 1/5 Synchronizing latest changes from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "🛑 2/5 Stopping existing containers to free server RAM..."
$COMPOSE_CMD down --remove-orphans || true

echo "🧹 Freeing disk space before the build (prevents ENOSPC mid-build)..."
# `docker system prune -af --volumes` is deliberately NOT used: --volumes
# removes every volume Docker considers unused, and right after the `down`
# above, the named postgres_data volume (docker-compose.yml) briefly has no
# attached container — exactly the state --volumes would delete it in. That
# risk isn't worth it for build-cache cleanup, so this only ever touches
# images and the builder cache, never volumes.
#
# Also deliberately plain `-f` (dangling only), NOT `-af` (all unused): right
# after `down` above, every image — including nginx:alpine, postgres:16-alpine,
# and last deploy's own app images — briefly has zero running containers, so
# `-a` would consider all of them "unused" and delete them too. That was
# happening every single deploy, forcing a full re-pull of nginx/postgres and
# a full rebuild of the app images from scratch each time, for no actual disk
# benefit (leftover untagged layers from a rebuild are already dangling, so
# plain -f still cleans those up).
$DOCKER_CMD image prune -f || true

# The builder cache (BuildKit's cache mounts, e.g. the pnpm store — see the
# Dockerfiles) is usually worth keeping: wiping it on every deploy would
# force a full dependency re-download from the registry each time. Only
# clear it when disk space is actually tight, so the common case still gets
# fast incremental builds and ENOSPC still can't happen when it matters.
AVAILABLE_GB=$(df --output=avail -B1G / 2>/dev/null | tail -n1 | tr -d ' ')
if [ -n "$AVAILABLE_GB" ] && [ "$AVAILABLE_GB" -lt 5 ]; then
  echo "⚠️  Only ${AVAILABLE_GB}GB free on / — also clearing the Docker build cache..."
  $DOCKER_CMD builder prune -af || true
fi

echo "💾 Disk space after cleanup:"
df -h / 2>/dev/null | tail -n1 || true

echo "🐳 3/5 Rebuilding and starting Docker containers..."
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build images sequentially to keep RAM footprint low
$COMPOSE_CMD build --parallel=false
$COMPOSE_CMD up -d

echo "🗄️ 4/5 Synchronizing database schema (Drizzle db push)..."
# Wait 5 seconds for PostgreSQL container to become ready
sleep 5
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

echo "🔑 5/5 Provisioning/repairing the Super Admin account..."
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
