---
name: check-zone
description: Audit Angular component files for missing cdr.detectChanges() calls in a zoneless (Zone.js-free) Angular app. Use after any frontend CRUD change.
---

Audit Angular component files for missing `cdr.detectChanges()` calls in a zoneless (Zone.js-free) Angular app.

## Usage
- `/check-zone <file-or-glob>` — audit one or more specific component files
- `/check-zone` (no argument) — audit all `*.component.ts` files under `tournament-client/src/app/features/`

## Background
This project uses Angular 21 with **zoneless change detection** (no Zone.js). Without Zone.js, Angular never automatically triggers change detection. Every method that mutates component state must explicitly call `this.cdr.detectChanges()` after the mutation, or the template will not update.

## Steps

1. Dispatch to the `zone-auditor` agent (haiku). Pass it `$ARGUMENTS` (file/glob) if provided.
2. The agent runs `.claude/scripts/check-zone.mjs [path...]` — a deterministic TypeScript-AST scan (not an LLM eyeball pass) that finds every `this.*` assignment or mutating array call (`.push`, `.splice`, etc.) whose enclosing method/callback never calls `this.cdr.detectChanges()`, plus components missing the `ChangeDetectorRef` import/injection entirely.
3. Relay the script's findings: for each file, ✅ clean or ⚠️ with the flagged method, line number, and the specific mutation(s) missing coverage.
4. **Offer to fix.** If the user agrees, the agent adds `this.cdr.detectChanges()` at the end of each flagged block via `Edit`. It does not add a duplicate call if one already exists later in the same block.

## Note on false negatives vs. real gaps
The script flags a mutation whenever `this.cdr.detectChanges()` doesn't appear anywhere in the same enclosing function/callback — it does not special-case "this method runs before Angular's first paint so it's technically safe" reasoning. If a finding looks like an intentional exception, say so explicitly rather than silently accepting or rejecting the fix; this project's own [docs/claude/frontend-rules.md](../../../docs/claude/frontend-rules.md) states the rule as unconditional ("every method that assigns to `this.*` ... including `ngOnInit` and other lifecycle hooks"), so treat findings as real unless the user says otherwise.
