import * as crypto from 'crypto';
import { verifySignature, parsePayload } from '../src/webhook';

describe('verifySignature', () => {
  const secret = 'test-secret';
  const body = Buffer.from('{"test":"payload"}');

  function sig(s: string, b: Buffer): string {
    return 'sha256=' + crypto.createHmac('sha256', s).update(b).digest('hex');
  }

  it('returns true for a valid signature', () => {
    expect(verifySignature(secret, body, sig(secret, body))).toBe(true);
  });

  it('returns false for a tampered body', () => {
    const tampered = Buffer.from('{"test":"tampered"}');
    expect(verifySignature(secret, tampered, sig(secret, body))).toBe(false);
  });

  it('returns false for a wrong secret', () => {
    expect(verifySignature(secret, body, sig('wrong-secret', body))).toBe(false);
  });

  it('returns false for an empty header', () => {
    expect(verifySignature(secret, body, '')).toBe(false);
  });
});

describe('parsePayload', () => {
  function makePayload(overrides: Record<string, unknown> = {}) {
    return {
      action: 'edited',
      projects_v2_item: { node_id: 'PVTI_abc123' },
      changes: {
        field_value: {
          field_name: 'Status',
          to: { name: 'Ready' },
        },
      },
      ...overrides,
    };
  }

  it('triggers for a correct Ready payload', () => {
    expect(parsePayload(makePayload())).toEqual({ shouldTrigger: true, itemId: 'PVTI_abc123' });
  });

  it('does not trigger when to.name is not Ready', () => {
    const p = makePayload();
    (p.changes.field_value as Record<string, unknown>).to = { name: 'In Progress' };
    expect(parsePayload(p).shouldTrigger).toBe(false);
  });

  it('does not trigger when field_name is not Status', () => {
    const p = makePayload();
    (p.changes.field_value as Record<string, unknown>).field_name = 'Assignees';
    expect(parsePayload(p).shouldTrigger).toBe(false);
  });

  it('does not trigger when action is not edited', () => {
    expect(parsePayload(makePayload({ action: 'created' })).shouldTrigger).toBe(false);
  });

  it('does not trigger for an unrelated event shape', () => {
    expect(parsePayload({ action: 'opened', issue: { number: 1 } }).shouldTrigger).toBe(false);
  });

  it('matching is case-insensitive', () => {
    const p = makePayload();
    (p.changes.field_value as Record<string, unknown>).to = { name: 'ready' };
    expect(parsePayload(p)).toEqual({ shouldTrigger: true, itemId: 'PVTI_abc123' });
  });

  it('accepts a custom statusTrigger', () => {
    const p = makePayload();
    (p.changes.field_value as Record<string, unknown>).to = { name: 'In Progress' };
    expect(parsePayload(p, 'In Progress').shouldTrigger).toBe(true);
  });
});
