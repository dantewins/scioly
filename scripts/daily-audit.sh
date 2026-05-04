#!/usr/bin/env bash
# scripts/daily-audit.sh
# Runs the audit-loop unattended once per day. Driven by launchd.
# - Resets the audit-loop branch to origin/main
# - Boots next dev, invokes `claude -p "/audit-loop --auto-mechanical"`
# - On changes: pushes audit-loop and opens a PR via gh
# - Cleans up dev server in all exit paths

set -euo pipefail

PROJECT_DIR="/Users/musung/Desktop/scioly"
LOG_DIR="$HOME/Library/Logs"
LOG_FILE="$LOG_DIR/scioly-audit-loop.log"
BRANCH="audit-loop"
DATE_TAG="$(date +%Y-%m-%d)"

mkdir -p "$LOG_DIR"

# Everything stdout/stderr goes to the log file, with timestamps.
exec >>"$LOG_FILE" 2>&1
echo
echo "======================================================================"
echo "[daily-audit] starting at $(date)"
echo "======================================================================"

# launchd does not source shell rc files; ensure the binaries we need are on PATH.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# launchd starts processes with a max-files cap of 256, which Node + Next.js +
# headless claude blow through. Bump it to a value `claude` is happy with.
ulimit -n 65536 2>/dev/null || true

cd "$PROJECT_DIR"

# Sanity checks before we touch anything.
if ! command -v claude >/dev/null 2>&1; then
  echo "[daily-audit] claude CLI not found on PATH. Aborting." >&2
  exit 1
fi
if ! command -v gh >/dev/null 2>&1; then
  echo "[daily-audit] gh CLI not found. Aborting." >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "[daily-audit] gh is not authenticated (run 'gh auth login' interactively). Aborting." >&2
  exit 1
fi

# If a previous audit PR is still open, leave it alone — don't overwrite the user's review queue.
EXISTING_PR=$(gh pr list --head "$BRANCH" --state open --json number --jq '.[0].number' 2>/dev/null || true)
if [[ -n "${EXISTING_PR:-}" ]]; then
  echo "[daily-audit] PR #$EXISTING_PR is already open against branch $BRANCH. Skipping today's run." >&2
  exit 0
fi

# Sync local repo and reset audit-loop to origin/main.
git fetch origin --prune
git checkout main
git reset --hard origin/main
git checkout -B "$BRANCH" origin/main

# Boot dev server in the background, then wait for it.
DEV_LOG="/tmp/scioly-audit-dev.log"
: >"$DEV_LOG"
npm run dev >"$DEV_LOG" 2>&1 &
DEV_PID=$!

cleanup() {
  if kill -0 "$DEV_PID" 2>/dev/null; then
    echo "[daily-audit] stopping dev server (pid $DEV_PID)"
    kill "$DEV_PID" 2>/dev/null || true
    sleep 2
    kill -9 "$DEV_PID" 2>/dev/null || true
  fi
  pkill -f "next-server" 2>/dev/null || true
}
trap cleanup EXIT

# Wait up to 90s for :3000 to respond.
for _ in $(seq 1 45); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me 2>/dev/null || echo "000")
  if [[ "$CODE" == "200" || "$CODE" == "401" ]]; then
    echo "[daily-audit] dev server up (HTTP $CODE)"
    break
  fi
  sleep 2
done

# Hand off to claude. Bypass permission prompts since this is unattended.
# Tools allowed: just enough to walk flows and edit code.
CLAUDE_DEBUG_LOG="$LOG_DIR/scioly-audit-loop.claude-debug.log"
echo "[daily-audit] claude env: HOME=$HOME USER=$USER PWD=$(pwd)"
echo "[daily-audit] claude binary: $(which claude || echo '<missing>')"
claude --debug -p "say one word and exit" --output-format text 2>&1 | head -50 || true
echo "[daily-audit] minimal claude test done"
claude -p "/audit-loop --auto-mechanical" \
  --permission-mode bypassPermissions \
  --allowedTools "Bash Edit Read Write Glob Grep Agent" \
  --output-format text \
  --debug-file "$CLAUDE_DEBUG_LOG" || \
  echo "[daily-audit] claude exited non-zero; see $CLAUDE_DEBUG_LOG"

# Stop dev server now (also handled by trap, but explicit so the next steps see it down).
cleanup
trap - EXIT

# If the audit produced no changes, nothing to push — exit cleanly.
git fetch origin
if git diff --quiet origin/main..HEAD; then
  echo "[daily-audit] no changes on $BRANCH vs origin/main; nothing to push."
  exit 0
fi

# Push and open a PR.
git push -f origin "$BRANCH"

DIGEST="docs/audit/${DATE_TAG}.md"
PR_BODY=$(cat <<EOF
Daily audit run — $DATE_TAG

This PR was opened automatically by the daily audit-loop launchd job.

Mechanical fixes applied (P1 + Slow + Dead-code + Refactor). Track B
items (Missing functionality / UX / UI) are recorded in the digest
but left unfixed for human triage.

See \`$DIGEST\` for the full findings list and before/after table.
EOF
)

gh pr create \
  --base main \
  --head "$BRANCH" \
  --title "Audit $DATE_TAG" \
  --body "$PR_BODY" \
  || echo "[daily-audit] gh pr create failed (a PR may already exist or main may be unchanged)"

echo "[daily-audit] done at $(date)"
