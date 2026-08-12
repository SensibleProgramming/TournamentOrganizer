## E2E Rules — Specifics

- Every new component or user-visible behaviour needs at least one E2E describe block
- Role-gating must be covered: if a UI element is hidden for some roles, test both the visible and hidden cases
- Write E2E tests **before** implementation (TDD) — confirm they are red first
- New mock helpers go in `e2e/helpers/api-mock.ts`; new fixture builders use the `make*Dto(overrides?)` pattern
- Register `stubUnmatchedApi` **before** feature-specific mocks so it is the last fallback (LIFO route order)

## Zone Rules — Specifics

This app uses **Angular 21 zoneless change detection** (no Zone.js). Without Zone.js, Angular never triggers change detection automatically.

Every method that assigns to `this.*` properties must call `this.cdr.detectChanges()` after the mutation — including:
- `subscribe()` `next:` and `error:` callbacks
- Synchronous click/event handler methods (e.g. `startEdit()`, `cancelEdit()`)
- `async` methods using `await`
- `ngOnInit` and other lifecycle hooks

## Static Image Uploads (browser cache-busting)

The API always overwrites the same file path on disk. If the URL doesn't change, the browser serves stale cached images.

**Rule:** append `?t=<Date.now()>` every time a component receives an image URL from an API response:
- Upload success handlers (`onLogoSelected`, `onAvatarFileSelected`, etc.)
- `ngOnInit` load success
- `save()` / settings-save success

**Display-only components** (toolbar, leaderboard rows, player list rows): use a `private readonly sessionTs = Date.now()` constant and append `?t=${this.sessionTs}` only when the URL doesn't already contain `?t=`. Never call `Date.now()` in a getter — it fires on every change-detection cycle.
