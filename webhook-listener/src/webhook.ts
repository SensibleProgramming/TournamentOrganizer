import * as crypto from 'crypto';

export function verifySignature(secret: string, rawBody: Buffer, signatureHeader: string): boolean {
  if (!signatureHeader) return false;

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signatureHeader);
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

interface ParseResult {
  shouldTrigger: boolean;
  itemId?: string;
}

export function parsePayload(body: unknown, statusTrigger = 'Ready'): ParseResult {
  if (typeof body !== 'object' || body === null) return { shouldTrigger: false };

  const payload = body as Record<string, unknown>;

  if (payload.action !== 'edited') return { shouldTrigger: false };

  const changes = payload.changes as Record<string, unknown> | undefined;
  if (!changes) return { shouldTrigger: false };

  const fieldValue = changes.field_value as Record<string, unknown> | undefined;
  if (!fieldValue) return { shouldTrigger: false };

  if (fieldValue.field_name !== 'Status') return { shouldTrigger: false };

  const to = fieldValue.to as Record<string, unknown> | undefined;
  if (!to || typeof to.name !== 'string') return { shouldTrigger: false };

  if (to.name.toLowerCase() !== statusTrigger.toLowerCase()) return { shouldTrigger: false };

  const item = payload.projects_v2_item as Record<string, unknown> | undefined;
  const itemId = typeof item?.node_id === 'string' ? item.node_id : undefined;

  return { shouldTrigger: true, itemId };
}
