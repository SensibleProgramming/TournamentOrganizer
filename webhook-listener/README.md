# webhook-listener

Local service that listens for GitHub Project board webhooks and automatically queues
a `/implement-next` Claude Code run whenever an item moves to **Ready** status.

---

## Prerequisites

- **Node.js >= 20**
- **`claude` CLI** installed and authenticated (`claude --version` should work)
- **ngrok** (or similar) to expose your local port to GitHub

---

## Install

```bash
cd webhook-listener
npm install
```

---

## Configure

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP server port |
| `WEBHOOK_SECRET` | *(required)* | GitHub webhook HMAC secret (you choose this value) |
| `REPO_PATH` | *(required)* | Absolute path to the repo root, e.g. `C:/Dev/AI/TournamentOrganizer` |
| `STATUS_TRIGGER` | `Ready` | Project board status name that triggers a run (case-insensitive) |

---

## Expose locally with ngrok

```bash
ngrok http 3001
```

Copy the **Forwarding** URL (e.g. `https://abc123.ngrok-free.app`). You will use it in the next step.

---

## Configure the GitHub webhook

1. Go to **your repo → Settings → Webhooks → Add webhook**
2. **Payload URL**: `https://<ngrok-url>/webhook`
3. **Content type**: `application/json`
4. **Secret**: same value as `WEBHOOK_SECRET` in your `.env`
5. **Which events?** → *Let me select individual events*
   - Uncheck **Push**
   - Check **Projects v2 items** (scroll down to find it)
6. Click **Add webhook**

---

## Start the service

```bash
npm run dev
```

You should see:

```
[server] Listening on port 3001 | repo: C:/Dev/AI/TournamentOrganizer | trigger status: Ready
```

---

## Testing locally with curl

Generate a test payload and its HMAC signature in one command:

```bash
PAYLOAD='{"action":"edited","projects_v2_item":{"node_id":"PVTI_test"},"changes":{"field_value":{"field_name":"Status","to":{"name":"Ready"}}}}'
SECRET="your-webhook-secret-here"
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/.*= /sha256=/')

curl -s -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIG" \
  -d "$PAYLOAD"
# Expected: {"queued":true,"itemId":"PVTI_test"}

# Test invalid signature
curl -s -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=badhash" \
  -d "$PAYLOAD"
# Expected: 401 {"error":"Invalid signature"}

# Test non-Ready status (ignored)
PAYLOAD2='{"action":"edited","projects_v2_item":{"node_id":"PVTI_test"},"changes":{"field_value":{"field_name":"Status","to":{"name":"In Progress"}}}}'
SIG2=$(echo -n "$PAYLOAD2" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/.*= /sha256=/')
curl -s -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIG2" \
  -d "$PAYLOAD2"
# Expected: {"ignored":true}
```

---

## Run tests

```bash
npm test
```

## Type-check

```bash
npm run build
```
