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

# -f docker-compose.yml pinned explicitly, same reasoning as deploy.sh:
# never let Compose's default file-discovery auto-merge anything else
# that happens to be sitting in this directory.
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

# Same reload as deploy.sh: nginx.conf is a bind mount, so if you checked
# out a different commit before rolling back, the running nginx process
# still has whatever config it loaded last until told to reload. `nginx -t`
# first so a broken config fails this script instead of taking nginx down;
# never recreates the nginx container, only reloads it (or starts it with
# --no-deps if it wasn't running at all).
reload_nginx() {
  if $DOCKER_CMD inspect -f '{{.State.Running}}' vending-nginx 2>/dev/null | grep -q true; then
    if $DOCKER_CMD exec vending-nginx nginx -t; then
      $DOCKER_CMD exec vending-nginx nginx -s reload
    else
      echo "🛑 nginx -t failed on the current config — NOT reloading (would drop the working one)."
      return 1
    fi
  else
    echo "⚠️  vending-nginx is not running — starting it (--no-deps, nothing else touched)..."
    $COMPOSE_CMD up -d --no-deps nginx
  fi
}

echo "⏪ Rolling back api/web to '$TAG'..."
export IMAGE_TAG="$TAG"
if $COMPOSE_CMD pull web api \
  && $COMPOSE_CMD up -d --no-deps --wait api web \
  && reload_nginx \
  && curl -fsS -o /dev/null http://localhost/login \
  && curl -fsS -o /dev/null http://localhost/api/v1/health; then
  mkdir -p "$HOME/deploy-state"
  echo "$TAG" > "$HOME/deploy-state/previous_tag"
  echo "✅ Rolled back to '$TAG' and confirmed reachable through nginx."
else
  echo "🛑 Rollback to '$TAG' failed its health/nginx check — investigate before trying another tag."
  exit 1
fi
