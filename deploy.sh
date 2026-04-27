#!/usr/bin/env bash
#
# deploy.sh — Deploy Thinker Toolbox to a remote server via SCP
#
# Usage: ./deploy.sh <host> <user> <password> <remote_path> [ssh_key]
#
# Examples:
#   ./deploy.sh example.com deploy 'my!p@ss' /var/www/thinkertoolbox
#   ./deploy.sh example.com deploy 'my!p@ss' /var/www/thinkertoolbox ~/.ssh/id_ed25519
#   ./deploy.sh example.com deploy 'my!p@ss' /
#
# Note: Wrap the password in SINGLE quotes to prevent shell expansion
#       of special characters like !, $, @, etc.
#
# Requires: sshpass (install with: apt install sshpass / brew install sshpass)
#

set -euo pipefail

# ─── Parameters ──────────────────────────────────────────────────────────────
HOST="${1:?Usage: $0 <host> <user> <password> <remote_path> [ssh_key]}"
USER="${2:?Usage: $0 <host> <user> <password> <remote_path> [ssh_key]}"
PASSWORD="${3:?Usage: $0 <host> <user> <password> <remote_path> [ssh_key]}"
REMOTE_PATH="${4:?Usage: $0 <host> <user> <password> <remote_path> [ssh_key]}"
SSH_KEY="${5:-}"

# ─── Validate ────────────────────────────────────────────────────────────────
if [ ! -d "js" ] || [ ! -d "css" ]; then
  echo "❌ Error: Run this script from the word-tools-deploy directory"
  exit 1
fi

# ─── Check for sshpass ──────────────────────────────────────────────────────
if ! command -v sshpass &>/dev/null; then
  echo "❌ sshpass is required. Install with:"
  echo "   Ubuntu/Debian: sudo apt install sshpass"
  echo "   macOS:          brew install sshpass"
  echo ""
  echo "   Or use an SSH key instead (pass '' as password and specify key):"
  echo "   ./deploy.sh host user '' /path ~/.ssh/id_ed25519"
  exit 1
fi

# ─── Normalise remote path (remove trailing slash, keep root as /) ──────────
REMOTE_PATH="${REMOTE_PATH%/}"
if [ -z "$REMOTE_PATH" ]; then
  REMOTE_PATH="/"
fi

# ─── Build SSH options ───────────────────────────────────────────────────────
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
SCP_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)

if [ -n "$SSH_KEY" ]; then
  SSH_OPTS+=(-i "$SSH_KEY")
  SCP_OPTS+=(-i "$SSH_KEY")
fi

echo "🚀 Deploying Thinker Toolbox"
echo "   Host:   $HOST"
echo "   User:   $USER"
echo "   Path:   $REMOTE_PATH"
echo ""

# ─── Export password for sshpass ─────────────────────────────────────────────
export SSHPASS="$PASSWORD"

# ─── Create remote directories ──────────────────────────────────────────────
#echo "📁 Creating remote directories..."
#sshpass -e ssh "${SSH_OPTS[@]}" "${USER}@${HOST}" \
#  "mkdir -p ${REMOTE_PATH}/js ${REMOTE_PATH}/css" 2>/dev/null || {
#  echo "❌ Failed to connect or create directories on $HOST"
#  unset SSHPASS
#  exit 1
#}

# ─── Copy files ──────────────────────────────────────────────────────────────
echo "📦 Copying files..."

# HTML pages — scp needs trailing slash on dirs; for root path use /
sshpass -e scp "${SCP_OPTS[@]}" *.html "${USER}@${HOST}:${REMOTE_PATH}/"

# JavaScript
sshpass -e scp "${SCP_OPTS[@]}" js/*.js "${USER}@${HOST}:${REMOTE_PATH}/js/"

# CSS
sshpass -e scp "${SCP_OPTS[@]}" css/*.css "${USER}@${HOST}:${REMOTE_PATH}/css/"

# Config files
sshpass -e scp "${SCP_OPTS[@]}" manifest.json robots.txt sitemap.xml sw.js sw-colour-picker.js ads.txt "${USER}@${HOST}:${REMOTE_PATH}/"

# ─── Clean up ───────────────────────────────────────────────────────────────
unset SSHPASS

echo ""
echo "✅ Deploy complete!"
echo "🌐 Files deployed to ${USER}@${HOST}:${REMOTE_PATH}"
