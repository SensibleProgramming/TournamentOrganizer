Generate a report of all AI-assisted code changes in this repository.

## Usage

- `/report` — all merged PRs, all time
- `/report --since YYYY-MM-DD` — PRs merged on or after that date
- `/report --iteration N` — PRs merged during Iteration N (1, 2, or 3)
- `/report --model <name>` — filter by model (e.g. `sonnet`, `haiku`, `opus`)

Parse `$ARGUMENTS` for any of the above flags before starting.

---

## Step 1 — Fetch merged PRs

```bash
gh pr list --repo SensibleProgramming/TournamentOrganizer \
  --base dev --state merged --limit 200 \
  --json number,title,body,mergedAt,url
```

For each PR, check for AI attribution in this order (stop at first match):

1. Body contains `Generated with [Claude Code]` — explicit attribution (PRs from 2026-03-30 onward)
2. Body contains `Co-Authored-By: Claude` — older PRs that included it in the body
3. Any commit's `messageBody` contains `Co-Authored-By: Claude`:
   ```bash
   gh pr view <number> --repo SensibleProgramming/TournamentOrganizer \
     --json commits --jq '.commits[].messageBody | test("Co-Authored-By: Claude")'
   ```
   Use this fallback for PRs that fail checks 1 and 2.

Discard any PR that fails all three checks — it was not AI-assisted.

If `--since` was given, discard PRs where `mergedAt` is before that date.
If `--iteration` was given, use these date windows to filter `mergedAt`:
- Iteration 1: 2026-03-17 → 2026-03-30
- Iteration 2: 2026-03-31 → 2026-04-13
- Iteration 3: 2026-04-14 → 2026-04-27

---

## Step 2 — Extract per-PR metadata

For each retained PR, extract:

| Field | How to get it |
|---|---|
| **PR** | `.number` |
| **Merged** | `.mergedAt` (date part only, `YYYY-MM-DD`) |
| **Title** | `.title` |
| **Issue** | First `References #N` or `Closes #N` match in `.body`; `—` if absent |
| **Model** | Capture `Model: \`(?P<m>[^`]+)\`` from `.body`; if absent, use `claude-sonnet-4-6` (all pre-tag PRs were Sonnet 4.6) |
| **Story Pts** | See Step 3 |

If `--model` was given, discard rows whose Model field doesn't contain the filter string.

---

## Step 3 — Fetch story points from project board

For each unique issue number collected in Step 2, query the project board:

```bash
gh project item-list 2 --owner SensibleProgramming --format json \
  --jq '.items[] | select(.content.number == <N>) | .storyPoints // "—"'
```

Map each issue number → story points. Use `—` if the issue isn't on the board or has no points set.

---

## Step 4 — Fetch commit stats

For each PR, get the files-changed count:

```bash
gh pr view <number> --repo SensibleProgramming/TournamentOrganizer \
  --json files --jq '.files | length'
```

---

## Step 5 — Render the report

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

Truncate titles at 60 characters with `…` if needed to keep the table readable.

---

## Rules

- Do not include PRs that lack both the `Co-Authored-By: Claude` and `Generated with [Claude Code]` markers — those were not AI-assisted.
- If story points are missing for a PR, use `—` rather than `0` (unknown ≠ zero).
- The Models used summary line must list each distinct model ID with its PR count.
- After printing the report, state the total token cost if visible in the session context; otherwise omit.
