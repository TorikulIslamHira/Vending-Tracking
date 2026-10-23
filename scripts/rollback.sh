#!/bin/bash
# Manual rollback: re-pulls and rolls api/web to an already-published GHCR
# tag. Run on the VPS, from the app directory (same place deploy.sh runs).
#
#   scripts/rollback.sh sha-abc1234
#
# "latest" is deliberately not a valid target here — see is_immutable_tag
# below.
#
# deploy.sh already does this automatically when a deploy's own health check
# fails — this script is for rolling back later, e.g. the new tag looked
# healthy but turned out to be broken in practice.
set -e

# Same tag shape deploy.sh itself requires before ever trusting a
# rollback target — rejects anything that isn't a plausible image tag
# (a full image reference pasted by mistake, a "@sha256:..." digest, a
# typo with shell metacharacters, etc.) before it ever reaches
# `docker compose pull/up`.
TAG_REGEX='^[A-Za-z0-9_.-]{1,128}$'
is_valid_tag() {
  [[ "$1" =~ $TAG_REGEX ]]
}

# A rollback target also has to be *immutable*. "latest" is a floating
# pointer our own build job overwrites on every push — by the time you're
# reaching for a rollback, "latest" may well already point at the exact
# broken image you're trying to get away from. Only our own
# "sha-<7-hex>" format is accepted.
is_immutable_tag() {
  [[ "$1" =~ ^sha-[0-9a-f]{7,40}$ ]]
}

TAG="$1"
if [ -z "$TAG" ]; then
  echo "Usage: scripts/rollback.sh <sha-tag>"
  echo "  (see ~/deploy-state/previous_tag for the last known-good tag)"
  exit 1
fi

if ! is_valid_tag "$TAG"; then
  echo "🛑 '$TAG' doesn't look like a valid image tag — refusing to roll back to it."
  echo "   Expected a plain tag like 'sha-abc1234', not a full image reference"
  echo "   or a @sha256:... digest."
  exit 1
fi

if ! is_immutable_tag "$TAG"; then
  echo "🛑 '$TAG' is not an immutable sha-xxxxxxx tag — refusing to roll back to it."
  echo "   'latest' (and anything else that isn't 'sha-<7+ hex chars>') is a"
  echo "   floating tag: it gets overwritten by the next push, so it's not a"
  echo "   safe, pinned rollback target. Use the exact sha-<short> tag of the"
  echo "   known-good build instead (see ~/deploy-state/previous_tag)."
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

# Same reload as deploy.sh (see its reload_nginx() for the full writeup):
# nginx.conf is a single-file bind mount resolved to a specific inode when
# Docker sets it up. If you checked out a different commit before rolling
# back, the file on disk has a NEW inode, but the running container's
# mount still points at the OLD one — `nginx -s reload` would silently
# keep serving stale config and report success. Compare checksums first;
# only reload in place when they actually match, restart the container
# (which re-resolves the bind mount) when they don't.
reload_nginx() {
  if $DOCKER_CMD inspect -f '{{.State.Running}}' vending-nginx 2>/dev/null | grep -q true; then
    HOST_CONF_SHA=$(sha256sum nginx/nginx.conf | awk '{print $1}')
    CONTAINER_CONF_SHA=$($DOCKER_CMD exec vending-nginx sha256sum /etc/nginx/nginx.conf 2>/dev/null | awk '{print $1}')

    if [ -n "$CONTAINER_CONF_SHA" ] && [ "$HOST_CONF_SHA" = "$CONTAINER_CONF_SHA" ]; then
      echo "🔁 nginx.conf unchanged (sha256 $HOST_CONF_SHA) — reloading in place."
      if $DOCKER_CMD exec vending-nginx nginx -t; then
        $DOCKER_CMD exec vending-nginx nginx -s reload
      else
        echo "🛑 nginx -t failed on the current config — NOT reloading (would drop the working one)."
        return 1
      fi
    else
      echo "🔁 nginx.conf is stale in the running container (host sha ${HOST_CONF_SHA:-?}, container sha ${CONTAINER_CONF_SHA:-unreadable}) — restarting vending-nginx instead of reloading..."
      $DOCKER_CMD restart vending-nginx
      for i in $(seq 1 15); do
        if $DOCKER_CMD inspect -f '{{.State.Running}}' vending-nginx 2>/dev/null | grep -q true \
          && $DOCKER_CMD exec vending-nginx nginx -t >/dev/null 2>&1; then
          echo "✅ vending-nginx restarted and nginx -t passes on the new config."
          return 0
        fi
        sleep 1
      done
      echo "🛑 vending-nginx did not come back up healthy within 15s of restarting."
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
