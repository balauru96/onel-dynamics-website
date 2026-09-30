# Runner state

One `<id>.json` per task, written by the runner. Do not hand-edit while a task
is running. You may delete a file to reset a task to `pending`.

Fields:

- `id`, `title`, `branch`
- `status`: pending | approved | running | PR_OPEN | blocked | completed
- `approved`: whether you set `approved: true` in the queue file
- `pr`: pull request URL, once opened
- `reason`: why it is blocked
- `started`, `updated`: ISO timestamps
- `log`: path to that task's log

The queue file in `tasks/queue/` is the source of truth for `approved` and the
task brief. This directory is a record of what the runner did.
