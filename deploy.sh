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

# The tag that was running *before* this deploy — what a failed health check
# below rolls back to. Defaults to "latest" on a brand-new VPS with no prior
# recorded deploy.
LAST_GOOD_TAG=$(cat "$PREVIOUS_TAG_FILE" 2>/dev/null || echo "latest")
export IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "🐳 2/4 Pulling image tag '$IMAGE_TAG' and rolling out api/web..."
$COMPOSE_CMD pull web api

# --no-deps: never touch db/nginx here, even though they're declared
# dependencies — they keep running unchanged unless their own config
# changed. --wait: block until the new containers report healthy (see the
# `healthcheck:` blocks in docker-compose.yml) before this line returns, so
# the old containers keep serving the whole time and downtime is just the
# container-swap itself (~10s), not a build.
if $COMPOSE_CMD up -d --no-deps --wait api web; then
  echo "✅ api/web healthy on '$IMAGE_TAG'."
  echo "$IMAGE_TAG" > "$PREVIOUS_TAG_FILE"
else
  echo "❌ api/web did not become healthy on '$IMAGE_TAG' — rolling back to '$LAST_GOOD_TAG'..."
  export IMAGE_TAG="$LAST_GOOD_TAG"
  $COMPOSE_CMD pull web api || true
  if $COMPOSE_CMD up -d --no-deps --wait api web; then
    echo "⚠️  Rolled back to '$LAST_GOOD_TAG'. The failed deploy still needs investigating."
  else
    echo "🛑 Rollback to '$LAST_GOOD_TAG' also failed to become healthy — manual intervention required."
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
