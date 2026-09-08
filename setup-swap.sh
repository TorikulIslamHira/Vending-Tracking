#!/bin/bash
# ==============================================================================
# One-time VPS swap setup (Ubuntu/Debian)
# ==============================================================================
# Run this ONCE, manually, directly on the VPS:
#
#   sudo bash setup-swap.sh
#
# deploy.sh already tries to set up a 2GB swapfile automatically on every
# deploy, but only if it's already running with passwordless sudo — if the
# CI/CD SSH user doesn't have that, it silently skips it and the VPS never
# actually gets swap. It also only calls `swapon` for the current boot; it
# never persists the swapfile in /etc/fstab, so a reboot loses it. This
# script does the full, permanent setup once, interactively, so it works
# regardless of what deploy.sh's automated user is allowed to do — and
# survives a reboot, which deploy.sh's own check does not.
#
# Uses the same /swapfile path deploy.sh already checks for, so the two
# don't conflict or create a second swapfile.
# ==============================================================================

set -e

SWAP_PATH="/swapfile"
SWAP_SIZE_GB=2

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ This script must be run as root (sudo bash setup-swap.sh)."
  exit 1
fi

echo "=========================================="
echo "🧠 VPS Swap Setup (${SWAP_SIZE_GB}GB)"
echo "=========================================="

# --- 1. Create the swapfile (idempotent: skip if it already exists) ---
if [ -f "$SWAP_PATH" ]; then
  echo "ℹ️  $SWAP_PATH already exists — skipping allocation."
else
  echo "📦 Allocating ${SWAP_SIZE_GB}GB at $SWAP_PATH..."
  fallocate -l "${SWAP_SIZE_GB}G" "$SWAP_PATH" 2>/dev/null || \
    dd if=/dev/zero of="$SWAP_PATH" bs=1M count=$((SWAP_SIZE_GB * 1024)) status=progress
fi

# --- 2. Secure it: only root may read/write the swapfile ---
echo "🔒 Securing permissions (600)..."
chmod 600 "$SWAP_PATH"

# --- 3. Format as swap (safe to re-run; mkswap on an already-formatted
#        file just re-writes the same signature) ---
echo "🛠️  Formatting as swap..."
mkswap "$SWAP_PATH"

# --- 4. Enable it now, for this boot ---
if swapon --show | grep -q "$SWAP_PATH"; then
  echo "ℹ️  Swap already active."
else
  echo "▶️  Enabling swap..."
  swapon "$SWAP_PATH"
fi

# --- 5. Persist across reboots via /etc/fstab (the step deploy.sh's own
#        automated check never does) ---
FSTAB_ENTRY="$SWAP_PATH none swap sw 0 0"
if grep -qF "$SWAP_PATH" /etc/fstab 2>/dev/null; then
  echo "ℹ️  /etc/fstab already has an entry for $SWAP_PATH."
else
  echo "💾 Adding $SWAP_PATH to /etc/fstab so it survives a reboot..."
  echo "$FSTAB_ENTRY" >> /etc/fstab
fi

# --- 6. Prefer swap only as a safety net, not routine behavior — a
#        database server (Postgres, running in this same stack) performs
#        much worse if the kernel swaps its working set out under normal
#        load. Lower swappiness biases the kernel toward reclaiming page
#        cache first and only swapping when RAM is genuinely under real
#        pressure, e.g. during a memory-heavy Docker build. ---
echo "⚙️  Tuning vm.swappiness=10 (prefer RAM, use swap only under real pressure)..."
sysctl -w vm.swappiness=10 >/dev/null
if grep -q "^vm.swappiness" /etc/sysctl.conf 2>/dev/null; then
  sed -i 's/^vm.swappiness.*/vm.swappiness=10/' /etc/sysctl.conf
else
  echo "vm.swappiness=10" >> /etc/sysctl.conf
fi

echo "=========================================="
echo "✅ Swap setup complete."
free -h
echo "=========================================="
