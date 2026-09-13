#!/usr/bin/env bash

# ==============================================================================
# SyncInk Voice - 24/7 Production Server & GitHub Auto-Updater
# Designed for Termux (Android), VPS, and Linux
# ==============================================================================

# 1. Acquire Android wake lock on Termux to prevent CPU sleep when screen is off
if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
  echo -e "\033[1;32m[Termux]\033[0m Wake lock acquired (Android CPU sleep disabled)"
fi

# Set directory to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo -e "\033[1;36m====================================================\033[0m"
echo -e "\033[1;36m       SyncInk Voice 24/7 Server & Auto-Updater     \033[0m"
echo -e "\033[1;36m====================================================\033[0m"

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo -e "\033[1;33m[Setup]\033[0m Installing node modules..."
  npm install
fi

# Ensure bot dist exists
if [ ! -d "dist" ]; then
  echo -e "\033[1;33m[Setup]\033[0m Building TypeScript files..."
  npm run termux:build
fi

# Function to check and pull updates from GitHub
check_and_update() {
  git fetch origin main --quiet 2>/dev/null
  local LOCAL_HASH
  local REMOTE_HASH
  LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null)
  REMOTE_HASH=$(git rev-parse origin/main 2>/dev/null)

  if [ -n "$LOCAL_HASH" ] && [ -n "$REMOTE_HASH" ] && [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
    echo -e "\n\033[1;35m[Auto-Updater]\033[0m New commits detected on GitHub!"
    echo -e "\033[1;35m[Auto-Updater]\033[0m Updating: $LOCAL_HASH -> $REMOTE_HASH"
    
    # Fast forward or reset to origin/main
    git reset --hard origin/main

    # Check if dependencies changed
    if git diff --name-only "$LOCAL_HASH" "$REMOTE_HASH" 2>/dev/null | grep -q "package.json"; then
      echo -e "\033[1;35m[Auto-Updater]\033[0m Dependencies updated in package.json. Running npm install..."
      npm install
    fi

    # Compile the bot with the new code
    echo -e "\033[1;35m[Auto-Updater]\033[0m Rebuilding bot with latest changes..."
    npm run termux:build
    echo -e "\033[1;32m[Auto-Updater]\033[0m Update completed! Restarting server now...\n"
    return 0
  fi
  return 1
}

# Polling interval in seconds (checks GitHub every 30s)
POLL_INTERVAL=30

# Main loop to keep bot running 24/7 with auto-restart and auto-update
while true; do
  # Check for updates right before starting
  check_and_update

  echo -e "\033[1;32m[Server]\033[0m Starting SyncInk Voice (Bot & Dashboard)..."

  # Start the bot process in the background
  node dist/index.js &
  BOT_PID=$!

  # Trap SIGINT and SIGTERM to kill bot cleanly on Ctrl+C
  trap 'echo -e "\n\033[1;31m[Server]\033[0m Shutting down SyncInk Voice..."; kill $BOT_PID 2>/dev/null; exit 0' SIGINT SIGTERM

  RELOAD=false

  # Watch loop: monitors process and checks GitHub
  while kill -0 "$BOT_PID" 2>/dev/null; do
    sleep "$POLL_INTERVAL"

    if check_and_update; then
      echo -e "\033[1;33m[Server]\033[0m Restarting bot for new update..."
      kill "$BOT_PID" 2>/dev/null
      wait "$BOT_PID" 2>/dev/null
      RELOAD=true
      break
    fi
  done

  # Wait for the bot to terminate
  wait "$BOT_PID" 2>/dev/null
  EXIT_STATUS=$?

  if [ "$RELOAD" = false ]; then
    echo -e "\033[1;31m[Server]\033[0m Bot stopped (Exit code: $EXIT_STATUS). Restarting in 5s..."
    sleep 5
  fi
done
