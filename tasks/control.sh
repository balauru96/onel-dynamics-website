#!/usr/bin/env bash
# Control the unattended website agent runner.
#
#   tasks/control.sh status     queue + timer state
#   tasks/control.sh start      enable the timer (begins checking every 30 min)
#   tasks/control.sh pause      stop starting new tasks (finishes nothing abrupt)
#   tasks/control.sh resume     allow tasks again
#   tasks/control.sh stop       disable the timer entirely
#   tasks/control.sh logs [id]  tail runner logs (all, or one task)
#   tasks/control.sh dry-run    show what the runner would do now
#
# No sudo. Everything is user-level.

set -uo pipefail
PROJECT="/home/onel/Desktop/Onel-Dynamics-Website"
PAUSE_FILE="$PROJECT/tasks/PAUSED"
UNIT="onel-website-agent"

cd "$PROJECT" || exit 1

case "${1:-status}" in
  status)
    echo "--- timer ---"
    systemctl --user is-active "$UNIT.timer" 2>/dev/null || true
    systemctl --user is-enabled "$UNIT.timer" 2>/dev/null || true
    echo "--- next run ---"
    systemctl --user list-timers "$UNIT.timer" --no-pager 2>/dev/null | sed -n '2p' || true
    echo "--- queue ---"
    ./tasks/runner.sh --status
    ;;
  start)
    systemctl --user enable --now "$UNIT.timer" && echo "timer started"
    ;;
  pause)
    touch "$PAUSE_FILE" && echo "paused: no new tasks will start (a running task is left alone)"
    ;;
  resume)
    rm -f "$PAUSE_FILE" && echo "resumed"
    ;;
  stop)
    systemctl --user disable --now "$UNIT.timer" && echo "timer stopped"
    ;;
  logs)
    if [ -n "${2:-}" ]; then
      tail -n 100 "$PROJECT"/tasks/logs/"$2"-*.log
    else
      tail -n 100 "$PROJECT"/tasks/logs/*.log
    fi
    ;;
  dry-run)
    ./tasks/runner.sh --dry-run
    ;;
  *)
    echo "usage: $0 {status|start|pause|resume|stop|logs [id]|dry-run}" >&2
    exit 2
    ;;
esac
