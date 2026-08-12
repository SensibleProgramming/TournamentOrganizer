---
name: check-mock-order
description: Audit Playwright E2E spec files for mocks registered before stubUnmatchedApi, which silently shadows them under Playwright's LIFO route order. Use after writing or editing E2E tests, or when E2E failures look like auth/mock data never applied.
---

Audit E2E spec files for Playwright route-registration-order bugs.

## Usage
- `/check-mock-order <file-or-glob>` — audit one or more specific spec files
- `/check-mock-order` (no argument) — audit all `*.spec.ts` files under `tournament-client/e2e/`

## Background
`page.route()` matches handlers **LIFO** — the most recently registered handler is checked first. `e2e/helpers/api-mock.ts`'s `stubUnmatchedApi()` registers a catch-all (`**/api/**`) that always fulfills with `{}`. If a specific mock (`loginAs`, `mockGetEvent`, etc.) is registered **before** `stubUnmatchedApi` in the same test block, the catch-all — being registered later — silently shadows it: the specific mock never fires, and the test runs against stub data instead of the intended fixture. This is exactly what `loginAs()`'s own JSDoc warns about ("Call this AFTER stubUnmatchedApi"), but nothing enforced it — it was found by hand once (auth-guard investigation, `feature/hide-pause-rounds-complete`) and turned out to affect 148 call sites across 19 files repo-wide.

## Steps

1. Dispatch to the `mock-order-auditor` agent (haiku). Pass it `$ARGUMENTS` (file/glob) if provided.
2. The agent runs `.claude/scripts/check-mock-order.mjs [path...]` — a deterministic TypeScript-AST scan (not an LLM eyeball pass) that finds every call to `loginAs` or a `mock*` helper whose enclosing block registers `stubUnmatchedApi` at a later line.
3. Relay the script's findings: for each file, ✅ clean or ⚠️ with the flagged mock name and line number.
4. **Offer to fix.** If the user agrees, the agent swaps the two calls (pure line-order fix, no other changes) via `Edit`, then re-runs the script to confirm each finding is resolved.

## Note
A finding means the mock is currently a no-op in that test — the test may still be passing "by accident" (e.g. asserting on absence of something, or on stub-data defaults that happen to match). Don't assume a currently-green test is unaffected; re-run it after the fix to confirm it still passes for the right reason.
