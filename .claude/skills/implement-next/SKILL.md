---
name: implement-next
description: Pick a Ready item from the GitHub project board and implement it end-to-end.
---

Pick a "Ready" item from the GitHub project board and implement it end-to-end.

## Step 1 — Pick the issue

If `$ARGUMENTS` contains a GitHub issue number (e.g. `22`), use that issue.

Otherwise, fetch the Ready items from the project board:
```bash
gh project item-list 2 --owner SensibleProgramming --format json \
  | jq -r '.items[] | select(.status == "Ready") | "#" + (.content.number | tostring) + " | " + .title'
```

- If there is exactly one Ready item, use it automatically and tell the user.
- If there are multiple, print the list, ask the user which issue number to work on, then stop and wait.

## Step 2 — Load the issue

Fetch full issue details:
```
gh project item-list 2 --owner SensibleProgramming --format json
```
Find the item whose `content.number` matches the chosen issue number. Extract:
- `ITEM_ID` — the project item `.id`
- `ISSUE_TITLE` — the issue `.title`
- `ISSUE_NUMBER` — the issue `.content.number`
- `ISSUE_BODY` — the full `content.body`

Check whether the issue body contains a `## Prompt file` line with a path like `` `prompts/ignore/NN_<name>.md` ``.

**If the line exists** → set `PROMPT_PATH` to that path and skip to Step 2b.

**If the line is missing** → evaluate whether a prompt file is needed (see criteria below).

### Step 2a — Decide whether to generate a prompt file

**Skip prompt file generation** (go straight to Step 3) when ALL of the following are true:
1. The issue body is already actionable — clear location, clear fix, no ambiguous requirements or design decisions
2. Estimated story points ≤ 2
3. The task is a fix/chore with no new components, DTOs, or test classes to design (e.g. dependency bumps, config changes, typo fixes)

If skipping: derive `SHORT_NAME` as a kebab-case slug of the issue title (strip "feat:", "fix:", "[Security]", etc.) and proceed to Step 3. Treat the issue body as the spec.

**Otherwise → generate the prompt file:**

### Step 2a (continued) — Generate the prompt file (no existing file)

The issue body is a brief spec. Expand it into a full, implementation-ready prompt file using
the project's feature template (`prompts/template/feature-template.md`) as the structure guide.

The generated file must include every section from the template that applies:
- `# Feature: <name>` heading and `> **GitHub Issue:** [#N ...]` link
- Context paragraph
- Requirements bullet list
- Backend section: Models, DTOs, Repository, Service, Controller (with exact method signatures, DTO field names, HTTP verbs, and route paths)
- Frontend section: Models, API service methods, component(s) with selector names and template text used by tests, routing changes
- Backend unit tests: class name + individual test method names (TDD — written before implementation)
- Frontend Jest tests: spec file name + individual `it(...)` descriptions
- Playwright E2E tests: spec file path, helper names, describe-block table
- Verification checklist

Determine the next available prompt file number by listing `prompts/ignore/` and taking
`max(existing NN prefixes) + 1`. Name the file `prompts/ignore/NN_<slug>.md` where `<slug>` is
kebab-case derived from the issue title (strip "feat:", "fix:", etc.).

Write the file. Then, **unless** the issue body was already a detailed spec AND the generated file is ≤ 50 lines, run `/refine-prompt PROMPT_PATH` and apply any clear improvements. Skip refine-prompt for trivial or already-detailed issues to save a round-trip.

**Show the full contents to the user and ask for approval before continuing.**
Wait for explicit confirmation ("looks good", "approved", "go ahead", etc.) or requested edits
before proceeding. If edits are requested, apply them and show again.

Once approved:
- Set `PROMPT_PATH` to the new file path.
- Update the GitHub issue body to append the prompt file reference via the `github-actor` agent (issue-edit mode):
  ```
  gh issue edit ISSUE_NUMBER --repo SensibleProgramming/TournamentOrganizer \
    --body "<original body>

  ## Prompt file
  \`PROMPT_PATH\`"
  ```

### Step 2b — Read the prompt file

Read the file at `PROMPT_PATH` in full. This is the authoritative spec for all implementation work.

Derive `SHORT_NAME` from the prompt file name (strip the leading `NN_` and `.md`, e.g. `store-public-page`).

### Step 2c — Check dependencies

Read the `## Dependencies` section of the prompt file.

- If `None` or the section is absent → proceed to Step 3.
- For each listed issue number `#N`, check whether a PR referencing it has been merged to `dev`:
  ```bash
  gh pr list --base dev --state merged --json number,title,body \
    --jq '.[] | select(.body | test("#N")) | "#\(.number) \(.title)"'
  ```
  - All dependencies merged → proceed to Step 3.
  - Any dependency NOT yet merged → **stop**. Do not create a branch or mark In Progress.
    Report which issue is blocking (e.g. "Skipping #N — depends on #M which is not yet merged to dev.").
    If other Ready items exist, move to the next one and repeat from Step 2.

## Step 3 — Mark "In Progress" on the project board

Estimate story points from the prompt file using this guide:
- 1 — single file, trivial change
- 2 — 2–5 files, no new tests
- 3 — small feature, one layer only (backend OR frontend)
- 5 — full-stack feature, < 20 files, moderate tests
- 8 — full-stack, 20–50 files, multiple services + E2E
- 13 — architectural change or very large cross-cutting feature

Update the prompt file header — add or replace the `> **Story Points:**` line immediately after the `> **GitHub Issue:**` line:
```
> **Story Points:** <estimated-points> · Model: `<haiku|sonnet|opus>`
```
(1–2 pts → haiku, 3–5 pts → sonnet, 8–13 pts → opus)

Dispatch to the `github-actor` agent to run all three board updates via `.claude/scripts/gh-board.ps1`:
```
gh-board.ps1 -Action SetStatus    -Item $ITEM_ID -Value "In Progress"
gh-board.ps1 -Action SetIteration -Item $ITEM_ID -Value <current iteration, e.g. Iteration2>
gh-board.ps1 -Action SetPoints    -Item $ITEM_ID -Value <estimated-points>
```
Determine the current iteration from today's date: Iteration1 = 2026-03-17→2026-03-30, Iteration2 = 2026-03-31→2026-04-13, Iteration3 = 2026-04-14→2026-04-27. If today falls outside all three windows, ask the user which iteration to use rather than guessing.

## Step 4 — Create the feature branch

Check `git status` first. If the current branch has uncommitted changes that aren't part of this task (e.g. leftover WIP from earlier work), don't let `git checkout dev` clobber or silently drag them along — uncommitted changes are not branch-scoped in git, so a later checkout back to that branch can carry them elsewhere too. Stash them explicitly before switching:

```bash
git stash push -u -m "WIP <current-branch> before starting <SHORT_NAME>"
```

Then:

```bash
git checkout dev
git pull TournamentOrganizer dev
git checkout -b feature/<SHORT_NAME>
```

Only restore that stash by returning to the original branch and popping it there once this task's branch work is complete — never pop it while on the new feature branch.

## Step 5 — Implement the feature (TDD)

For bug-fix issues where the root cause isn't already nailed down by the issue body (e.g. it came from an Explore agent's static read of the code, or your own), verify it by actually reproducing the failure at runtime — browser console/network capture, a debug log, a debugger — before writing the fix. A plausible-sounding explanation from reading source is a hypothesis, not a confirmed root cause; code that looks like it should work can still fail silently (e.g. a swallowed exception, a race condition) for a different reason than it appears to.

Follow the requirements in the prompt file exactly. Mandatory order:
1. Write failing tests first (backend xUnit and/or frontend Jest + Playwright E2E)
2. Confirm tests are red
3. Write minimum implementation to make them pass
4. Confirm tests are green
5. Dispatch the `build-runner` agent (runs `.claude/scripts/build-check.ps1`). Fix any errors before continuing.

After any frontend component changes:
- Dispatch the `zone-auditor` agent against the modified component file(s) (runs `.claude/scripts/check-zone.mjs`). Apply any fixes it finds before continuing.
- Dispatch the `e2e-runner` agent against the relevant spec file(s) (runs `.claude/scripts/run-e2e.ps1`). All tests must pass before continuing.

These are now lightweight, non-interactive agent dispatches rather than the flat `/build`/`/check-zone`/`/e2e` skills, so there is no risk of this command pausing mid-flow waiting for an interactive sub-skill to return.

## Step 6 — Move prompt file to done

Only run this if a prompt file was used (skip if prompt file was not generated in Step 2a):
```bash
mv prompts/ignore/<filename>.md prompts/done/<filename>.md
```

## Step 7 — Commit and create PR

Commit all changes on the feature branch. Then dispatch the `github-actor` agent (PR-create mode, following the `create-pr` skill's procedure) to:
1. Push the branch: `git push -u TournamentOrganizer <branch-name>`
2. Check for an existing PR: `gh pr list --head <branch-name> --base dev --json number,url`
3. If none exists, create one: `gh pr create --base dev --title "<title>" --body "<body>"`

PR body must include:
- `References #ISSUE_NUMBER`
- `🤖 Generated with [Claude Code](https://claude.com/claude-code) · Model: \`<model>\`` where `<model>` is from the `> **Story Points:** … · Model: \`…\`` line in the prompt file (or `claude-sonnet-4-6` if no prompt file).

After the PR is created, the same `github-actor` dispatch updates the board status to "In Review":
```
gh-board.ps1 -Action SetStatus -Item $ITEM_ID -Value "In Review"
```

Report the PR URL to the user.

## Rules
- Never commit directly to `dev` or `main`
- The remote is named `TournamentOrganizer` (not `origin`)
- Do not skip any step in the TDD workflow
- Do not consider the task done until build, all tests, zone check, and E2E all pass
- Never start implementation before the prompt file is approved (Step 2a) or read (Step 2b)
- Do not stop until the PR URL has been reported to the user and the project board has been marked In Review
