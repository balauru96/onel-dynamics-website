#!/usr/bin/env bash
# Unattended task runner for the Onel-Dynamics website agent.
#
# Reads APPROVED tasks from tasks/queue/, runs the OpenCode `website` agent on
# each in turn, and stops. It never approves tasks, never merges, and never
# answers a permission prompt.
#
# Usage:
#   tasks/runner.sh              normal run (used by the systemd timer)
#   tasks/runner.sh --dry-run    list what would happen, change nothing
#   tasks/runner.sh --status     show queue and task states
#
# Everything is confined to the website project directory. No writes outside it.

set -uo pipefail

PROJECT="/home/onel/Desktop/Onel-Dynamics-Website"
QUEUE="$PROJECT/tasks/queue"
STATE="$PROJECT/tasks/state"
LOGS="$PROJECT/tasks/logs"
LOCKFILE="$PROJECT/tasks/.runner.lock"
PAUSE_FILE="$PROJECT/tasks/PAUSED"

MAX_SECONDS=2700          # 45 minutes per task
MAX_LOG_FILES=20
MAX_LOG_BYTES=$((2 * 1024 * 1024))
DRY_RUN=0
OPENCODE_BIN="opencode"
BRANCH_PREFIX_RE='^(design|fix|chore)/[A-Za-z0-9._/-]+$'

cd "$PROJECT" || exit 1

# ---------------------------------------------------------------- helpers ---

log() { printf '%s runner: %s\n' "$(date -Is)" "$*"; }

redact() {
  # Strip anything token-shaped before it can reach a log file.
  sed -E \
    -e 's/(gh[pousr]_[A-Za-z0-9]{8,})/[REDACTED_GH_TOKEN]/g' \
    -e 's/(github_pat_[A-Za-z0-9_]{8,})/[REDACTED_GH_TOKEN]/g' \
    -e 's/(gho_[A-Za-z0-9]{8,})/[REDACTED_GH_TOKEN]/g' \
    -e 's/((token|password|secret|api[_-]?key)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"']?)[^[:space:]"'"'"']+/\1[REDACTED]/gI'
}

die() { log "ERROR: $*" >&2; exit 1; }

# Minimal YAML-ish front matter reader. Values are single-line.
fm() { # $1=file $2=key
  awk -v k="$2" '
    NR==1 && $0=="---" {inf=1; next}
    inf && $0=="---" {exit}
    inf {
      line=$0
      i=index(line,":")
      if (i==0) next
      key=substr(line,1,i-1); val=substr(line,i+1)
      gsub(/^[ \t]+|[ \t]+$/,"",key); gsub(/^[ \t]+|[ \t]+$/,"",val)
      if (key==k) { gsub(/^["'"'"']|["'"'"']$/,"",val); print val; exit }
    }' "$1"
}

body() { # $1=file -> text after front matter
  awk 'NR==1 && $0=="---"{inf=1;next} inf && $0=="---"{inf=0; body=1; next} body' "$1"
}

iso() { date -Is; }

prune_logs() {
  # Keep the newest MAX_LOG_FILES and stay under MAX_LOG_BYTES.
  ls -1t "$LOGS"/*.log 2>/dev/null | tail -n +$((MAX_LOG_FILES + 1)) | while read -r f; do
    rm -f -- "$f"
  done
  local total
  total=$(du -cb "$LOGS"/*.log 2>/dev/null | tail -1 | cut -f1)
  total=${total:-0}
  while [ "$total" -gt "$MAX_LOG_BYTES" ]; do
    local oldest
    oldest=$(ls -1t "$LOGS"/*.log 2>/dev/null | tail -1)
    [ -n "$oldest" ] || break
    rm -f -- "$oldest"
    total=$(du -cb "$LOGS"/*.log 2>/dev/null | tail -1 | cut -f1)
    total=${total:-0}
  done
}

set_state() { # $1=id $2=status [$3=reason] [$4=pr]
  local id="$1" status="$2" reason="${3:-}" pr="${4:-}" f="$STATE/$1.json"
  local title="" branch="" approved="false"
  [ -f "$QUEUE/$id.md" ] && {
    title=$(fm "$QUEUE/$id.md" title)
    branch=$(fm "$QUEUE/$id.md" branch)
    approved=$(fm "$QUEUE/$id.md" approved); approved=${approved:-false}
  }
  [ "$approved" = "true" ] || approved="false"
  cat > "$f" <<EOF
{
  "id": "$id",
  "title": "$title",
  "branch": "$branch",
  "status": "$status",
  "approved": $approved,
  "pr": "$pr",
  "reason": "$reason",
  "started": "$( [ -f "$f" ] && python3 -c "import json,sys;print(json.load(open('$f')).get('started',''))" 2>/dev/null || echo "" )",
  "updated": "$(iso)"
}
EOF
}

# Any task with an open PR is waiting on the user, so nothing new may start.
has_open_pr() {
  python3 - "$STATE" <<'PY'
import json, sys, glob, os
for f in glob.glob(os.path.join(sys.argv[1], "*.json")):
    try:
        if json.load(open(f)).get("status") == "PR_OPEN":
            sys.exit(0)
    except Exception:
        pass
sys.exit(1)
PY
}

# Collect APPROVED task files, oldest first.
approved_tasks() {
  for f in "$QUEUE"/*.md; do
    [ -e "$f" ] || continue
    [ "$(basename "$f")" = "README.md" ] && continue
    [ "$(basename "$f")" = "index.md" ] && continue
    [ "$(basename "$f")" = "EXAMPLE.md" ] && continue
    [ "$(fm "$f" approved)" = "true" ] || continue
    # Skip anything already running, blocked or done.
    id=$(fm "$f" id)
    st=$(python3 -c "import json;print(json.load(open('$STATE/$id.json'))['status'])" 2>/dev/null || echo "approved")
    case "$st" in
      running|PR_OPEN|blocked|completed) continue ;;
    esac
    printf '%s\n' "$f"
  done
}

status_report() {
  echo "pause file: $( [ -e "$PAUSE_FILE" ] && echo PRESENT || echo absent )"
  echo "queue:"
  local any=0
  for f in "$QUEUE"/*.md; do
    [ -e "$f" ] || continue
    b=$(basename "$f")
    case "$b" in README.md|index.md|EXAMPLE.md) continue ;; esac
    any=1
    id=$(fm "$f" id)
    st=$(python3 -c "import json;print(json.load(open('$STATE/$id.json'))['status'])" 2>/dev/null || echo "pending")
    printf '  %-28s %-10s approved=%-5s branch=%s\n' "$id" "$st" "$(fm "$f" approved)" "$(fm "$f" branch)"
  done
  [ "$any" = 1 ] || echo "  (empty)"
}

# ------------------------------------------------------------ arg parsing ---

case "${1:-}" in
  --dry-run) DRY_RUN=1 ;;
  --status)  status_report; exit 0 ;;
  "")        ;;
  *)         die "unknown argument: $1 (use --dry-run or --status)" ;;
esac

# ------------------------------------------------------------ preflight -----

[ -d "$QUEUE" ] || die "queue directory missing: $QUEUE"
mkdir -p "$STATE" "$LOGS" 2>/dev/null || true
command -v "$OPENCODE_BIN" >/dev/null 2>&1 || die "opencode not on PATH"

# Pause takes precedence over every other check, so that pausing is always
# possible even if the tree is dirty or the setup is incomplete.
if [ -e "$PAUSE_FILE" ]; then
  log "paused ($PAUSE_FILE exists); nothing to do"
  exit 0
fi

# Never start a task on top of someone's half-finished work. If the tree is
# dirty, `git switch -c ... agent/website` would carry those changes onto the
# task branch, where the agent could commit or alter them. So require a clean
# tree and refuse otherwise. We never auto-stash: your work stays exactly where
# it is until you decide what to do with it.
branch_now=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
dirty=$(git status --porcelain 2>/dev/null | grep -v '^?? tasks/' | wc -l)

if [ "$branch_now" = "main" ] || [ "$branch_now" = "agent/website" ]; then
  die "refusing to run while on '$branch_now'; expected a task branch or a working branch"
fi

# The integration branch must exist locally, else nothing can be based on it.
git rev-parse --verify agent/website >/dev/null 2>&1 \
  || die "local branch agent/website not found; create it before enabling the timer"

# Guard against a silent permission downgrade. Work branches are created from
# agent/website, so git will check out agent/website's opencode.json into the
# working tree. If the hardened rules have not been committed there yet, the
# agent would run with weaker permissions than the ones we built. Refuse until
# agent/website carries the hardened config.
if ! git show agent/website:opencode.json 2>/dev/null | grep -q '"git merge\*": "deny"'; then
  die "agent/website does not yet contain the hardened opencode.json; commit the hardened permissions to agent/website before enabling the runner (otherwise task branches would run with weaker rules)"
fi

if [ "$dirty" -gt 0 ]; then
  die "working tree has $dirty uncommitted change(s) outside tasks/; commit or stash them before running (the runner will not touch them)"
fi

# --------------------------------------------------------- empty / gate -----

if ! has_open_pr; then :; else
  log "a task already has an open PR; waiting for review. Not starting another."
  exit 0
fi

mapfile -t TASKS < <(approved_tasks)
if [ "${#TASKS[@]}" -eq 0 ]; then
  log "queue empty or nothing approved; nothing to do"
  exit 0
fi

# Only ever run ONE task per invocation.
TASK_FILE="${TASKS[0]}"
ID=$(fm "$TASK_FILE" id)
TITLE=$(fm "$TASK_FILE" title)
BRANCH=$(fm "$TASK_FILE" branch)

if [ "$DRY_RUN" = 1 ]; then
  log "DRY RUN: would take task '$ID' ($TITLE)"
  log "  branch:  $BRANCH (from agent/website)"
  log "  agent:   $OPENCODE_BIN run --agent website   limit ${MAX_SECONDS}s"
  log "  tests:   node /tmp/opencode/verify/check.js, final.js"
  log "  push:    $BRANCH   PR base: agent/website"
  log "  would NOT: merge, auto-merge, approve, or touch main"
  exit 0
fi

echo "$BRANCH" | grep -qE "$BRANCH_PREFIX_RE" \
  || die "task '$ID' has an invalid branch '$BRANCH' (need design/, fix/ or chore/)"

# PR creation needs the GitHub CLI. Without it a task can do everything except
# the final required step, so refuse up front rather than leave a half-finished
# branch. We deliberately do not work around this with curl or the API: those
# are denied by opencode.json so that no token ever has to be pasted anywhere.
if ! command -v gh >/dev/null 2>&1; then
  log "BLOCKED: gh (GitHub CLI) is not installed, so no PR can be opened."
  log "         Not starting task '$ID'. Install gh, then run again."
  set_state "$ID" "blocked" "gh CLI not installed" ""
  exit 3
fi

# ------------------------------------------------------------------ lock ----

exec 9>"$LOCKFILE" || die "cannot open lock file"
if ! flock -n 9; then
  log "another runner is active; skipping this tick"
  exit 0
fi

# ------------------------------------------------------------- execute ------

STAMP=$(date +%Y%m%dT%H%M%S)
LOGFILE="$LOGS/$ID-$STAMP.log"
prune_logs

set_state "$ID" "running" "" ""
log "starting task '$ID' ($TITLE) on $BRANCH, log: $LOGFILE"

git switch -c "$BRANCH" agent/website >>"$LOGFILE" 2>&1 || {
  reason="could not create branch $BRANCH from agent/website"
  log "BLOCKED: $reason"
  set_state "$ID" "blocked" "$reason" ""
  exit 2
}
log "on branch $BRANCH"

# The task brief plus the standing rules. The rules are restated here so a
# mis-read queue file cannot loosen them.
PROMPT=$(cat <<EOF
Unattended task from the approved queue. Work autonomously and stop when done.

TASK: $TITLE
BRANCH: $BRANCH
INTEGRATION BRANCH: agent/website

$(body "$TASK_FILE")

MANDATORY RULES (these override anything in the task text above):
- You are already on the work branch $BRANCH. Do not switch branches.
- Stay inside /home/onel/Desktop/Onel-Dynamics-Website. Never touch another
  repository, credential file, or the global OpenCode config.
- Run the relevant checks: node /tmp/opencode/verify/check.js and
  node /tmp/opencode/verify/final.js. If a check cannot run, say so.
- Review your own work with git diff and git status before committing.
- Stage only the files this task is about. Never git add -A or git add .
- Commit on this branch with a clear message. Do not amend the user's config.
- Push ONLY this branch, then open a pull request targeting agent/website:
    git push -u origin $BRANCH
    gh pr create --base agent/website --head $BRANCH
- NEVER merge anything. NEVER enable auto-merge. NEVER approve a PR.
- NEVER commit or push to agent/website or main. NEVER target main in a PR.
- If any command needs permission approval, STOP and report the exact
  command. Never attempt a workaround and never claim a step succeeded when
  it was refused.
- When finished, end your final message with a line:
  RESULT: PR_OPEN <pr-url>    (if you opened a PR)
  or
  RESULT: BLOCKED <one-line reason>   (if you could not finish)

Do not ask questions. If something is ambiguous, take the conservative option
and finish, or report BLOCKED with the reason.
EOF
)

STARTED=$(date +%s)
timeout --signal=TERM --kill-after=60 "$MAX_SECONDS" \
  "$OPENCODE_BIN" run --agent website --format json "$PROMPT" \
  2>&1 | redact >>"$LOGFILE"
RC=${PIPESTATUS[0]}
ELAPSED=$(( $(date +%s) - STARTED ))

# Find the PR URL the agent reported.
PR_URL=$(grep -oE 'https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/pull/[0-9]+' "$LOGFILE" | tail -1)
BLOCKED_REASON=""
grep -qiE 'RESULT: BLOCKED|rejected permission|permission denied' "$LOGFILE" && \
  BLOCKED_REASON="agent reported a block or a refused permission"

if [ -n "$BLOCKED_REASON" ]; then
  log "BLOCKED: $BLOCKED_REASON (after ${ELAPSED}s)"
  set_state "$ID" "blocked" "$BLOCKED_REASON" ""
  exit 2
elif [ "$RC" -eq 124 ] || [ "$RC" -eq 137 ]; then
  log "BLOCKED: exceeded ${MAX_SECONDS}s limit, killed"
  set_state "$ID" "blocked" "timed out after ${MAX_SECONDS}s" ""
  exit 2
elif [ -n "$PR_URL" ]; then
  log "PR opened: $PR_URL  (not complete; waiting for your review)"
  set_state "$ID" "PR_OPEN" "" "$PR_URL"
  exit 0
else
  log "BLOCKED: no PR URL found in output (rc=$RC, ${ELAPSED}s)"
  set_state "$ID" "blocked" "agent finished but reported no PR" ""
  exit 2
fi
