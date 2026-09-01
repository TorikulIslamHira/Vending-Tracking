#!/bin/bash
set -e

echo "=========================================="
echo "🚀 Bee Novelty Vending Deployment Script"
echo "=========================================="

echo "📥 1/4 Pulling latest changes from GitHub..."
git pull origin main

echo "🐳 2/4 Rebuilding and restarting Docker containers..."
docker compose up -d --build

echo "🗄️ 3/4 Synchronizing database schema (Prisma db push)..."
# Execute database migration inside the running API container
if docker compose exec -T api pnpm --filter @vending/database run db:push; then
  echo "✅ Database schema in sync."
else
  echo "⚠️ Fallback to direct npx prisma db push..."
  docker compose exec -T api npx prisma db push || true
fi

echo "🧹 4/4 Cleaning up obsolete Docker image layers..."
docker image prune -f

echo "=========================================="
echo "🎉 Deployment successfully completed!"
echo "=========================================="
