## Why

The event status-actions panel on `events/<id>` shows a Pause button any time `event.status === 'InProgress'`, even after every planned round has finished. Pausing a tournament with no remaining rounds is meaningless — there is nothing left to pause — so the button should disappear once the event has completed all its rounds, leaving only End Event.

## What Changes

- Add a derived `allRoundsComplete` check to the event-detail component: true when `event.plannedRounds` is set, the round count has reached it, and the last round is complete (a last round with zero pods also counts as complete).
- Gate the existing Pause button on `event.status === 'InProgress' && !allRoundsComplete`. End Event remains unconditional within that status.
- No change when `event.plannedRounds` is null (open-ended event) — Pause always stays visible in that case.

## Capabilities

### New Capabilities
- `event-status-actions`: UI rules governing which action buttons (Start, Pause, Resume, End Event, Remove) appear in the events/<id> status-actions panel for a given event/round state.

### Modified Capabilities
(none — first spec for this capability)

## Impact

- `tournament-client/src/app/features/events/event-detail.component.ts` — new derived getter/method + template condition on the Pause button (~lines 87-94, near existing `isRoundComplete()` at ~line 715).
- `tournament-client/src/app/features/events/event-detail.component.spec.ts` — new Jest cases for Pause visibility.
- No backend, DTO, or migration changes — `allRoundsComplete` is purely derived client-side from existing `event.plannedRounds`, `rounds`, and pod submission state, matching the pattern already used by `isRoundComplete()`.

**Incidental fix (same branch, per project convention — see tasks.md 4.4):** writing E2E coverage for this change surfaced a pre-existing, repo-wide auth-guard race (`authGuard` checked the token before `AuthService.silentRefresh()`'s async refresh resolved). Fixed via a new `AuthService.authReady$` observable and an async `authGuard`, plus a related `LocalStorageContext` store-scoping bug it exposed, plus a mock-registration-order bug in `event-detail.spec.ts`. These are bug fixes restoring already-intended behavior, not new capabilities — no spec delta added for them.
