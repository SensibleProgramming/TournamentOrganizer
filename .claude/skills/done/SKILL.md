---
name: done
description: Mark a feature complete after its PR has merged to dev.
---

Mark a feature complete after its PR has merged to `dev`.

Usage: `/done <issue-number>`

`$ARGUMENTS` must be an issue number (e.g. `42`).

## Step 1 — Verify the PR is merged

```bash
gh pr list --repo SensibleProgramming/TournamentOrganizer --base dev --state merged --json number,title,body \
  --jq '.[] | select(.body | test("#$ARGUMENTS")) | "#\(.number) \(.title) [\(.mergedAt)]"'
```

If no merged PR references the issue → stop and report: "No merged PR found for #$ARGUMENTS on `dev`. Merge the PR first."

## Step 2 — Mark Done on the project board

Dispatch to the `github-actor` agent:
1. Resolve the item ID: `.claude/scripts/gh-board.ps1 -Action ItemForIssue -Value $ARGUMENTS`
2. Set status: `.claude/scripts/gh-board.ps1 -Action SetStatus -Item <itemId> -Value Done`

(`gh-board.ps1` hardcodes the confirmed-correct project ID `PVT_kwDOECHdcM4BSqCs` — a previous version of this command used a different, invalid project/field ID pair that didn't match any project this org owns; that bug no longer exists now that both ID lookups route through the same script as every other board-mutating skill.)

## Step 3 — Delete stale plan files

List any plan files that reference the issue:
```bash
ls C:/Users/sgall/.claude/plans/
```

If any plan file is for this feature, delete it:
```bash
rm "C:/Users/sgall/.claude/plans/<filename>"
```

## Step 4 — Report

Print: "Issue #N marked Done. Plan files cleaned up." (or "No plan files found.")
