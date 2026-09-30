# Task queue

This directory holds approved tasks for the unattended website agent.
The runner reads these files; you write them.

## How to add a task

Create one file per task in this directory, for example
`tasks/queue/2026-10-01-hero-subhead.md`:

```markdown
---
id: hero-subhead
title: Tighten the hero subhead line length
branch: design/hero-subhead
---

Short, concrete description of the change you want.
```

Save the file. That is all. Do not edit `status` yourself; the runner owns it.

The runner only starts a task once you have set the `approved` field:

```markdown
---
id: hero-subhead
title: Tighten the hero subhead line length
branch: design/hero-subhead
approved: true
---

Short, concrete description of the change you want.
```

Until `approved: true` is present the file is ignored entirely. The runner
never sets that field for you and never invents tasks.

## Fields

| Field       | Required | Meaning |
| ----------- | -------- | ------- |
| `id`        | yes      | Short slug, unique. Used in branch and PR names. |
| `title`     | yes      | One line, imperative. |
| `branch`    | yes      | Must start with `design/`, `fix/` or `chore/`. |
| `approved`  | no       | `true` means you authorised it. Absent or anything else means pending. |
| `notes`     | no       | Extra context for the agent. |

The body below the front matter is the task brief. Keep it to the outcome you
want. The agent decides the implementation.

## Branch naming

`branch` becomes the work branch, created from `agent/website`. Use
`design/` for visual work, `fix/` for defects, `chore/` for maintenance.
Anything not starting with one of those three prefixes is rejected.

## States

`status` is written by the runner into `tasks/state/<id>.json` and mirrored
here for reading:

| State         | Meaning |
| ------------- | ------- |
| `pending`     | Queued, not approved yet. |
| `approved`    | You approved it, not started. |
| `running`     | Agent is working on it now. |
| `PR_OPEN`     | A pull request exists against `agent/website`. **Not finished.** |
| `blocked`     | Stopped: failure, timeout, or a permission prompt. Needs you. |
| `completed`   | You reviewed, merged, and the work landed. Only you set this. |

`PR_OPEN` is a waiting state, not success. A task becomes `completed` only
after you merge its pull request yourself.

## Rules the runner enforces

- One task at a time, oldest first.
- If any task is already `PR_OPEN`, nothing new starts. You review first.
- The agent works on a branch created from `agent/website` and opens a pull
  request targeting `agent/website`. Never `main`.
- No merging, no auto-merge, no approvals, no force-push, ever.
- 45 minute limit per task. After that the task is `blocked`.
- A permission prompt is never answered automatically. The task is `blocked`
  and the runner stops.
