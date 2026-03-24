import * as http from 'http';
import * as dotenv from 'dotenv';
import { verifySignature, parsePayload } from './webhook';
import { createQueue } from './queue';
import { runImplementNext } from './runner';

dotenv.config();

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';
const REPO_PATH = process.env.REPO_PATH ?? '';
const STATUS_TRIGGER = process.env.STATUS_TRIGGER ?? 'Ready';

if (!WEBHOOK_SECRET) {
  console.error('FATAL: WEBHOOK_SECRET is required');
  process.exit(1);
}
if (!REPO_PATH) {
  console.error('FATAL: REPO_PATH is required');
  process.exit(1);
}

const queue = createQueue();

const server = http.createServer((req, res) => {
  const ts = () => new Date().toISOString();

  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    const rawBody = Buffer.concat(chunks);
    const signatureHeader = req.headers['x-hub-signature-256'] as string ?? '';

    if (!verifySignature(WEBHOOK_SECRET, rawBody, signatureHeader)) {
      console.warn(`[server ${ts()}] 401 — invalid signature`);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid signature' }));
      return;
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const result = parsePayload(body, STATUS_TRIGGER);

    if (!result.shouldTrigger) {
      console.log(`[server ${ts()}] 200 — ignored (no trigger match)`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ignored: true }));
      return;
    }

    console.log(`[server ${ts()}] 202 — queuing /implement-next (itemId: ${result.itemId ?? 'unknown'})`);
    queue.enqueue(() => runImplementNext(REPO_PATH));

    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ queued: true, itemId: result.itemId }));
  });
});

server.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT} | repo: ${REPO_PATH} | trigger status: ${STATUS_TRIGGER}`);
});
