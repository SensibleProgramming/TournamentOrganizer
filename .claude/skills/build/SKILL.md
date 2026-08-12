---
name: build
description: Build both the .NET backend and Angular frontend. Report any errors or warnings.
---

Build both the .NET backend and Angular frontend and report the result.

Dispatch to the `build-runner` agent (haiku) — it runs `.claude/scripts/build-check.ps1`, which builds both projects and returns a condensed pass/fail summary. Relay its report to the user: whether each project built cleanly, and the full text of any errors or warnings.

If invoked from inside another skill that must not pause on a sub-dispatch (e.g. `implement-next`), run the script directly instead:
```
pwsh -File .claude/scripts/build-check.ps1
```
