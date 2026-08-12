## 1. Component logic

- [x] 1.1 Add `allRoundsComplete(): boolean` to `event-detail.component.ts` near `isRoundComplete()` (~line 715): true when `event.plannedRounds != null && rounds.length >= event.plannedRounds && (lastRound.pods.length === 0 || lastRound.pods.every(pod => getPodState(pod.podId).submitted))`.

## 2. Template

- [x] 2.1 Gate the Pause button in the `@if (event.status === 'InProgress')` block (~lines 87-94) on `!allRoundsComplete()`, leaving End Event unconditional in that block.

## 3. Tests

- [x] 3.1 Jest: Pause hidden — `plannedRounds` reached, last round fully submitted.
- [x] 3.2 Jest: Pause visible — rounds remaining (below `plannedRounds` or last round has unsubmitted pods).
- [x] 3.3 Jest: Pause visible — `plannedRounds` is null, regardless of round count.
- [x] 3.4 Jest: Pause hidden — last round has zero pods and `plannedRounds` reached (0-pod round counts as complete).

## 4. Verification

- [x] 4.1 Run `/check-zone` on `event-detail.component.ts` (zoneless change-detection rule).
- [x] 4.2 `/build` — frontend 0 errors (backend blocked by pre-existing local dev-server file lock, unrelated to this frontend-only change).
- [x] 4.3 E2E (`e2e/events/event-detail.spec.ts`, `Status Actions: Pause hidden when all planned rounds are complete`): hidden+End Event visible, visible w/ rounds remaining, visible w/ unsubmitted last round, visible when `plannedRounds` null. Added `mockGetEventRounds` helper to `e2e/helpers/api-mock.ts`.
- [x] 4.4 Run `/e2e e2e/events/event-detail.spec.ts` — 58/58 pass. Required fixing a pre-existing, repo-wide bug discovered mid-task (same branch, per project convention): `authGuard` checked the token synchronously before `AuthService.silentRefresh()`'s async `/api/auth/refresh` resolved, so every guarded-route navigation raced to `/login`. Fixed with TDD (`auth.guard.spec.ts` new, `auth.service.spec.ts` extended) by adding `AuthService.authReady$` (emits once the initial refresh settles, success or error) and making `authGuard` wait on it before deciding. Also fixed a related bug this surfaced: `LocalStorageContext`'s constructor tried to scope to `currentUser.storeId` but always ran before `silentRefresh()` resolved, so non-admin sessions were stuck on the `to_store_0` namespace — fixed by scoping reactively in `App.ngOnInit`'s `currentUser$` subscription instead. Also fixed `event-detail.spec.ts`'s `loginAs`/`stubUnmatchedApi` mock-registration order (was backwards in every block, per the documented LIFO convention in `api-mock.ts`) which had been silently shadowing the auth mock. Full Jest suite (710) and `/build` (frontend) still green after these fixes.
- [x] 4.5 Note: `e2e/players/players.spec.ts` (and likely other specs) has the same `loginAs`/`stubUnmatchedApi` ordering bug, left unfixed — out of scope here, flagged for a follow-up pass.
