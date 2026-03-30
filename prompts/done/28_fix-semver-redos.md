# Fix: Vulnerable npm dependency — semver ReDoS (GHSA-c2qf-rxjj-qqgw)

> **GitHub Issue:** [#84 — [Security][CRITICAL] Vulnerable npm dependency: semver — ReDoS](https://github.com/SensibleProgramming/TournamentOrganizer/issues/84)
> **Story Points:** 1 · Model: `haiku`

## Context

The `semver` npm package (a transitive dependency in `tournament-client/`) contains a ReDoS vulnerability (GHSA-c2qf-rxjj-qqgw). A crafted version string causes exponential regex backtracking, blocking the Node.js event loop. This affects the Angular build toolchain and any server-side Node usage.

---

## Dependencies

- None

---

## Files Modified

**Modified:**
- `tournament-client/package.json` — semver version constraint updated (via npm)
- `tournament-client/package-lock.json` — lockfile updated

---

## Requirements

- The `semver` package (direct or transitive) must resolve to a version **≥ 7.5.2** (the first patched release for this CVE) in `package-lock.json`.
- `npm audit` run from `tournament-client/` must report **0 high/critical vulnerabilities** related to `semver` after the fix.
- The Angular build (`npm run build`) must still succeed with 0 errors.
- All existing frontend Jest unit tests must still pass.

---

## Fix Steps

This is a dependency upgrade only — no application code changes required.

1. From `tournament-client/`, run:
   ```bash
   npm audit fix
   ```
2. If `semver` is still below 7.5.2, force-upgrade:
   ```bash
   npm install semver@latest --save-dev
   npm audit fix --force
   ```
3. Verify with:
   ```bash
   npm audit --audit-level=high
   ```
   Expected output: no `semver` vulnerabilities at high or critical severity.

4. Confirm the build still passes:
   ```bash
   npm run build
   ```

---

## Backend Unit Tests

None — this is a frontend dependency fix only.

---

## Frontend Unit Tests (Jest)

No new tests required. Run the full existing suite to confirm nothing broke:

```bash
npx jest --config jest.config.js
```

All pre-existing tests must still pass.

---

## Frontend E2E Tests (Playwright)

No new E2E tests required. The fix touches only the dependency tree, not application behaviour.

---

## Verification Checklist

- [ ] `npm audit --audit-level=high` from `tournament-client/` — 0 semver-related high/critical findings
- [ ] `/build` — 0 errors on both .NET and Angular
- [ ] `npx jest --config jest.config.js` from `tournament-client/` — all pre-existing tests pass

---
## Prompt Refinement Suggestions

### Token Efficiency
- The "Fix Steps" section prescribes exact shell commands the agent would run anyway — this is redundant with the Requirements section and wastes tokens. The Requirements alone (version ≥ 7.5.2, 0 audit findings, build passes) are sufficient; the agent can determine the correct commands from them.
- The "Backend Unit Tests" and "Frontend E2E Tests" sections add no value for a dependency-only fix and can be removed to reduce prompt length.

### Anticipated Questions (pre-answer these to skip back-and-forth)
- Q: Is `semver` a direct or transitive dependency? → Suggested answer: Transitive. Check `npm ls semver` to confirm current version and dependents before upgrading.
- Q: Should `npm audit fix --force` be used if it results in breaking changes? → Suggested answer: Only if `npm audit fix` alone does not resolve it. Review the diff of `package.json` for any major-version bumps before committing.
- Q: Are there other high/critical audit findings unrelated to `semver`? → Suggested answer: Fix only the `semver` finding; do not fix unrelated issues in this PR.

### Missing Context
- The current `semver` version resolved in the lockfile is not stated — running `npm ls semver` first would confirm whether the fix is even needed (the audit tool may have already fixed it in a prior run).
- No mention of whether `overrides` (npm v8+ lockfile overrides) should be used as a fallback if `semver` cannot be upgraded via `npm audit fix` because the dependent package pins it tightly.

### Optimized Prompt (optional rewrite)
> Upgrade the transitive `semver` npm dependency in `tournament-client/` to ≥ 7.5.2 to resolve GHSA-c2qf-rxjj-qqgw (ReDoS). Run `npm audit fix` from `tournament-client/`; if semver is still below 7.5.2 add an `overrides` entry in `package.json` pinning `"semver": ">=7.5.2"`. Do **not** fix unrelated audit findings. Verify: `npm audit --audit-level=high` shows 0 semver findings, `npm run build` succeeds, and `npx jest --config jest.config.js` all pass.
---
