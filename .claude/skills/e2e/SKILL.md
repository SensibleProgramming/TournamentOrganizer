---
name: e2e
description: Run Playwright end-to-end tests for the Angular frontend. Report pass/fail results and any actionable errors.
---

Run Playwright end-to-end tests for the Angular frontend. Report pass/fail results and any actionable errors.

## Usage
- `/e2e` — run all E2E tests under `tournament-client/e2e/`
- `/e2e stores` — run only the store tests (`e2e/stores/`)
- `/e2e <path-or-pattern>` — run a specific file or folder, e.g. `/e2e e2e/stores/store-list.spec.ts`

## Prerequisites
The Angular dev server must be reachable at `http://localhost:4200`. The `webServer` block in `playwright.config.ts` starts it automatically if not already running (`reuseExistingServer: true` if it is).

The .NET API does **not** need to be running — all API calls in E2E tests are intercepted by `page.route()` mocks.

## Steps

1. Dispatch to the `e2e-runner` agent (sonnet). Pass it `$ARGUMENTS` as the spec path/pattern (or nothing to run the full suite).
2. The agent runs `.claude/scripts/run-e2e.ps1 [-Spec <pattern>]` and reports: total counts (passed/failed/skipped), and for each **failed** test — test name, file path, the assertion that failed (Expected/Received), and any relevant error/stack hint.
3. **On failure — diagnose and fix.** The agent:
   - Selector not found / timeout → reads the component template and checks for the expected ARIA role, label, or text; adjusts the spec's selector.
   - Network/route error → verifies the `page.route()` mock covers the request URL pattern.
   - TypeScript compile error → fixes the type issue in the spec or helper file.
   - Re-runs the affected spec after any fix to confirm it passes before proceeding.
4. Do not open the HTML report unless the user explicitly asks (`npm run e2e:report`).
