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

echo "=========================================="
echo "🚀 Bee Novelty Vending Deployment Script"
echo "=========================================="

echo "📥 1/4 Pulling latest changes from GitHub..."
git pull origin main

echo "🐳 2/4 Rebuilding and restarting Docker containers..."
$COMPOSE_CMD up -d --build

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
