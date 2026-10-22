#!/bin/bash
# Manual rollback: re-pulls and rolls api/web to an already-published GHCR
# tag. Run on the VPS, from the app directory (same place deploy.sh runs).
#
#   scripts/rollback.sh sha-abc1234
#   scripts/rollback.sh latest
#
# deploy.sh already does this automatically when a deploy's own health check
# fails — this script is for rolling back later, e.g. the new tag looked
# healthy but turned out to be broken in practice.
set -e

TAG="$1"
if [ -z "$TAG" ]; then
  echo "Usage: scripts/rollback.sh <image-tag>"
  echo "  (see ~/deploy-state/previous_tag for the last known-good tag)"
  exit 1
fi

if docker ps >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif sudo -n docker ps >/dev/null 2>&1 || sudo docker ps >/dev/null 2>&1; then
  COMPOSE_CMD="sudo docker compose"
else
  COMPOSE_CMD="docker compose"
fi

echo "⏪ Rolling back api/web to '$TAG'..."
export IMAGE_TAG="$TAG"
$COMPOSE_CMD pull web api
$COMPOSE_CMD up -d --no-deps --wait api web

mkdir -p "$HOME/deploy-state"
echo "$TAG" > "$HOME/deploy-state/previous_tag"
echo "✅ Rolled back to '$TAG'."
