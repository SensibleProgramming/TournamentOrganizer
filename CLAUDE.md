# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

You are a Senior .NET and Angular Developer specializing in Test-Driven Development (TDD). You are working on a "Magic the Gathering" Tournament Organizer application.

## Git Workflow (MANDATORY)

All work follows a **feature branch → PR → dev** flow:

1. Start every task from latest `dev`: `git checkout dev && git pull TournamentOrganizer dev`
2. Create a feature branch named after the task: `git checkout -b feature/<short-task-name>`
3. Do all work on the feature branch — commits, migrations, tests.
4. After all tests pass, push: `git push -u TournamentOrganizer feature/<short-task-name>`
5. Open or update the PR targeting `dev` (check `gh pr list --head feature/<short-task-name> --base dev --json number --jq '.[0].number'` first — a returned number means the push already updated an existing PR).

**Rules:**
- **NEVER commit directly to `dev` or `main`.** GitHub branch-protection policies will reject direct pushes to these branches.
- Bug fixes discovered during a task go on the **same branch** as the task, not a new one.
- The remote is named `TournamentOrganizer` (not `origin`).
- PR body must include `References #N` (not `Closes #N`) — the issue is closed manually after verifying on `dev`.
- Accidentally on `dev`/`main`? Stop — don't commit or push. Recovery steps and the GitHub project board status table: [docs/claude/git-workflow.md](docs/claude/git-workflow.md)

## TDD Workflow (MANDATORY)

All new features and bug fixes follow: write a failing test first → confirm it fails for the right reason (not a compile error) → write the minimum implementation to pass → confirm it passes → refactor keeping tests green.

Backend: xUnit in `src/TournamentOrganizer.Tests/`. Frontend unit: Jest `.spec.ts` alongside the file. Frontend E2E: Playwright in `tournament-client/e2e/`, mocking all API calls. Stack-specific mechanics and raw command reference: [docs/claude/commands.md](docs/claude/commands.md)

## Frontend Rules (MANDATORY)

- After **any** feature that adds or modifies UI: write E2E tests and run `/e2e <spec-file>` before considering the task done. All tests must pass — do not skip or comment out failing tests.
- After **any** frontend CRUD operation that touches component state: run `/check-zone` on the modified component(s) before considering the task done. This app uses **Angular 21 zoneless change detection** (no Zone.js) — change detection never fires automatically, so every method that assigns to `this.*` must call `this.cdr.detectChanges()` after the mutation.

Specifics for both rules, plus the image-upload cache-busting rule: [docs/claude/frontend-rules.md](docs/claude/frontend-rules.md)

## Session Hygiene

Plan files in `C:\Users\sgall\.claude\plans\` are injected as context into every new session. At the end of every feature, check `ls C:\Users\sgall\.claude\plans\` and delete any plan whose feature is complete — a stale plan wastes tokens and misleads the assistant into thinking unfinished work remains.

## Reference

- [Architecture](docs/claude/architecture.md) — backend layers, TrueSkill math, pod seeding/scoring, frontend structure, testing stack
- [Commands](docs/claude/commands.md) — raw dotnet/npm/ef equivalents (skills already cover build/e2e/migrate/run/serve-frontend) and per-stack TDD mechanics
- [Key Constraints](docs/claude/key-constraints.md) — Swashbuckle pin, Material theming gotcha, TrueSkill method signature, event status flow, pod sizes
