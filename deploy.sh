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

echo "📥 1/4 Synchronizing latest changes from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "🛑 2/4 Stopping existing containers to free server RAM..."
$COMPOSE_CMD down --remove-orphans || true

echo "🐳 3/4 Rebuilding and starting Docker containers..."
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build images sequentially to keep RAM footprint low
$COMPOSE_CMD build --parallel=false
$COMPOSE_CMD up -d

echo "🗄️ 4/4 Synchronizing database schema (Drizzle db push)..."
# Wait 5 seconds for PostgreSQL container to become ready
sleep 5
# Execute database schema push inside the running API container
if $COMPOSE_CMD exec -T api pnpm --filter @vending/database run db:push; then
  echo "✅ Database schema in sync with Drizzle ORM."
else
  echo "⚠️ Fallback to direct drizzle-kit push..."
  $COMPOSE_CMD exec -T -w /app/packages/database api npx drizzle-kit push || true
fi

echo "🧹 4/4 Cleaning up obsolete Docker image layers..."
$DOCKER_CMD image prune -f

echo "=========================================="
echo "🎉 Deployment successfully completed!"
echo "=========================================="
