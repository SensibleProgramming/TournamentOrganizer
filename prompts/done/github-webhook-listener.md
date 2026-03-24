# Feature: GitHub Webhook Listener — Auto-Implement on Ready

## Context

When a GitHub Project board item is moved to **Ready** status, this local service automatically
queues a run of `/implement-next` (the Claude Code skill) so implementation starts without manual
intervention. Jobs are processed **sequentially** — if two items move to Ready in quick
succession, the second waits until the first is complete.

This is a **standalone Node.js + TypeScript service** that lives at `webhook-listener/` in the
repo root. It is NOT part of the TournamentOrganizer API or Angular app.

To receive webhooks from GitHub, the local port must be exposed via **ngrok** (setup instructions
in the README the agent writes).

---

## Dependencies

- None — this is a new standalone project.

---

## Files to Create

```
webhook-listener/
  package.json           — scripts: start, dev, test, build
  tsconfig.json          — ES2022 target, strict mode, outDir dist/
  .env.example           — documents required env vars (no secrets)
  .gitignore             — node_modules/, dist/, .env
  src/
    index.ts             — entry point: reads config, starts HTTP server
    webhook.ts           — HMAC-SHA256 signature validation + payload parsing
    queue.ts             — sequential async job queue
    runner.ts            — shells out to `claude -p "/implement-next"`
  tests/
    webhook.test.ts
    queue.test.ts
    runner.test.ts
```

---

## Environment Variables (`.env` / `.env.example`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the HTTP server listens on (avoids 4200 and 5021) |
| `WEBHOOK_SECRET` | *(required)* | GitHub webhook secret — used to verify `X-Hub-Signature-256` |
| `REPO_PATH` | *(required)* | Absolute path to the repo root where `claude` will be invoked |
| `STATUS_TRIGGER` | `Ready` | The project board status name that triggers a run |

---

## Requirements

- **HTTP server** on `$PORT` with a single route: `POST /webhook`
- **Signature validation**: reject any request whose `X-Hub-Signature-256` header does not match
  HMAC-SHA256 of the raw body with `WEBHOOK_SECRET`. Respond `401` on mismatch.
- **Event filtering**: only act on `projects_v2_item` events where:
  - `action === 'edited'`
  - `changes.field_value.field_name === 'Status'`
  - `changes.field_value.to.name === STATUS_TRIGGER` (case-insensitive)
  - All other events/payloads → respond `200 OK` with `{ ignored: true }`
- **Queue**: when the filter matches, enqueue a job. Respond immediately `202 Accepted`.
  The queue processes one job at a time; subsequent jobs wait.
- **Runner**: each job shells out to `claude -p "/implement-next"` with `cwd` set to `REPO_PATH`.
  Inherit `stdio` so output is visible in the terminal. Log start/finish/error with timestamps.
- **Error isolation**: if a job throws or the CLI exits non-zero, log the error and continue
  processing the next queued job (do not crash the server).
- **README.md** at `webhook-listener/README.md` covering:
  1. Prerequisites (`node >= 20`, `claude` CLI installed and authenticated)
  2. Install: `npm install`
  3. Configure: copy `.env.example` to `.env`, fill in values
  4. Expose locally with ngrok: `ngrok http 3001` — copy the Forwarding URL
  5. Configure GitHub webhook:
     - Go to repo (or org) Settings → Webhooks → Add webhook
     - Payload URL: `https://<ngrok-url>/webhook`
     - Content type: `application/json`
     - Secret: same value as `WEBHOOK_SECRET` in `.env`
     - Events: select **Projects v2 item** (under "Let me select individual events")
  6. Start service: `npm run dev`
  7. Testing locally with curl (sample command with valid signature generation)

---

## Implementation Details

### `src/webhook.ts`

```typescript
// Exports two functions:

// verifySignature(secret: string, rawBody: Buffer, signatureHeader: string): boolean
//   — computes HMAC-SHA256(secret, rawBody) and does a timing-safe compare
//     with the header value (strip "sha256=" prefix first)

// parsePayload(body: unknown): { shouldTrigger: boolean; itemId?: string }
//   — checks action, field_value.field_name, field_value.to.name
//   — returns shouldTrigger: true only when all three conditions pass
//   — itemId is changes.project_v2_item.node_id (for logging)
```

### `src/queue.ts`

```typescript
// A simple sequential async queue.
// enqueue(job: () => Promise<void>): void
//   — pushes job onto array; if not currently running, starts draining
// drain(): runs jobs one at a time via await, catches errors per-job
```

### `src/runner.ts`

```typescript
// runImplementNext(repoPath: string): Promise<void>
//   — spawns: claude -p "/implement-next"
//   — options: { cwd: repoPath, stdio: 'inherit', shell: true }
//   — rejects if exit code !== 0
```

### `src/index.ts`

```typescript
// - Loads dotenv
// - Validates required env vars (PORT, WEBHOOK_SECRET, REPO_PATH); exits if missing
// - Creates raw HTTP server (no Express needed — single route)
// - POST /webhook:
//     1. Buffer raw body
//     2. verifySignature → 401 if invalid
//     3. parsePayload → 200 ignored if no trigger
//     4. queue.enqueue(() => runner.runImplementNext(REPO_PATH)) → 202 Accepted
// - All other routes → 404
// - Logs startup: "Listening on port X | repo: Y | trigger status: Z"
```

---

## TDD Order

1. Write `tests/webhook.test.ts` — make it red
2. Implement `src/webhook.ts` — make it green
3. Write `tests/queue.test.ts` — make it red
4. Implement `src/queue.ts` — make it green
5. Write `tests/runner.test.ts` — make it red
6. Implement `src/runner.ts` — make it green
7. Wire together in `src/index.ts`
8. Write README.md

---

## Unit Tests

### `tests/webhook.test.ts`

**`verifySignature`**
- valid signature → returns `true`
- tampered body → returns `false`
- wrong secret → returns `false`
- missing/empty header → returns `false`

**`parsePayload`**
- correct payload (action=edited, field=Status, to.name=Ready) → `{ shouldTrigger: true }`
- status changed to something other than "Ready" → `{ shouldTrigger: false }`
- `field_name` is not "Status" (e.g. "Assignees") → `{ shouldTrigger: false }`
- action is "created" not "edited" → `{ shouldTrigger: false }`
- unrelated event type (e.g. `issues`) → `{ shouldTrigger: false }`
- `STATUS_TRIGGER` matching is case-insensitive (e.g. "ready" matches "Ready")

### `tests/queue.test.ts`

- jobs run sequentially (second starts only after first resolves)
- a failing job does not prevent subsequent jobs from running
- queue drains fully — after all jobs complete, `isRunning` resets to false
- enqueuing while running adds to the backlog correctly

### `tests/runner.test.ts`

- spawns `claude -p "/implement-next"` with `cwd` set to `REPO_PATH`
- resolves when process exits with code 0
- rejects when process exits with non-zero code

Mock `child_process.spawn` — do not invoke the real `claude` CLI in tests.

Run with: `npm test`

---

## Verification Checklist

- [ ] `npm install` — 0 errors
- [ ] `npm test` — all tests pass
- [ ] `npm run build` — TypeScript compiles with 0 errors (`tsc --noEmit`)
- [ ] Manual smoke-test: start with `npm run dev`, send a valid webhook payload via curl
      (see README for the curl command), confirm `202 Accepted` and queue log appears
- [ ] Manual smoke-test: send an invalid signature, confirm `401` response
- [ ] Manual smoke-test: send a non-Ready status change, confirm `200 { ignored: true }`
