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

echo "📥 1/4 Synchronizing latest changes from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "🐳 2/4 Rebuilding and restarting Docker containers..."
# Build images sequentially to keep RAM footprint low
$COMPOSE_CMD build --parallel=false
$COMPOSE_CMD up -d

echo "🗄️ 3/4 Synchronizing database schema (Prisma db push)..."
# Execute database migration inside the running API container
if $COMPOSE_CMD exec -T api pnpm --filter @vending/database run db:push; then
  echo "✅ Database schema in sync."
else
  echo "⚠️ Fallback to direct npx prisma db push..."
  $COMPOSE_CMD exec -T api npx prisma db push || true
fi

echo "🧹 4/4 Cleaning up obsolete Docker image layers..."
$DOCKER_CMD image prune -f

echo "=========================================="
echo "🎉 Deployment successfully completed!"
echo "=========================================="
