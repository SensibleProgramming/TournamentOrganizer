---
name: report
description: Generate a report of all AI-assisted code changes in this repository.
---

Generate a report of all AI-assisted code changes in this repository.

## Usage

- `/report` — all merged PRs, all time
- `/report --since YYYY-MM-DD` — PRs merged on or after that date
- `/report --iteration N` — PRs merged during Iteration N (1, 2, or 3)
- `/report --model <name>` — filter by model (e.g. `sonnet`, `haiku`, `opus`)

Parse `$ARGUMENTS` for any of the above flags before starting.

---

## Step 1 — Gather the data

Dispatch to the `github-actor` agent, or run directly:
```
pwsh -File .claude/scripts/pr-report-data.ps1 [-Since <date>] [-Iteration <N>] [-Model <name>]
```

This single script call replaces what used to be a `gh pr list` + a per-PR `gh pr view --json commits` fallback check + a per-issue `gh project item-list` query + a per-PR `gh pr view --json files` call. It:
1. Fetches merged PRs against `dev` (up to 200)
2. Filters to AI-assisted ones only (body contains `Generated with [Claude Code]` or `Co-Authored-By: Claude`, falling back to checking each commit's message body)
3. Extracts the referenced issue (`References #N` / `Closes #N`) and the `Model:` tag from the PR body
4. Cross-references story points from a single project-board fetch
5. Fetches the files-changed count per PR
6. Applies `-Since` / `-Iteration` / `-Model` filtering

Returns a JSON array of `{number, mergedAt, title, url, issue, model, storyPoints, filesChanged}`.

## Step 2 — Render the report

Output a markdown report in this exact format:

```
# AI-Assisted Code Report
**Repository:** SensibleProgramming/TournamentOrganizer
**Generated:** <today's date>
**Filter:** <describe the active filter, or "All time">

## Pull Requests

| PR | Merged | Model | Pts | Files | Issue | Title |
|---|---|---|---|---|---|---|
| [#126](url) | 2026-03-30 | claude-sonnet-4-6 | 2 | 2 | #91 | fix(security): replace innerHTML… |
| … | … | … | … | … | … | … |

## Summary

| Metric | Value |
|---|---|
| Total AI-assisted PRs | N |
| Total story points delivered | N |
| Total files changed | N |
| Models used | claude-sonnet-4-6 (N PRs), claude-haiku-4-5 (N PRs), … |
| Date range | YYYY-MM-DD → YYYY-MM-DD |
```

Truncate titles at 60 characters with `…` if needed to keep the table readable. Sum `storyPoints` for the total (treat `-` as 0 for the sum, but still display `-` per-row).

---

## Rules

- Any PR the script returns is already confirmed AI-assisted — no further filtering needed.
- If story points are missing for a PR (`storyPoints: "-"`), display `-` rather than `0` in the table — unknown ≠ zero.
- The Models used summary line must list each distinct model ID with its PR count.
- After printing the report, state the total token cost if visible in the session context; otherwise omit.
