import { Page } from '@playwright/test';

/** Build a minimal but decodable JWT — no real signing needed since the
 *  app only base64-decodes the payload (it does not verify the signature). */
function makeJwt(payload: Record<string, unknown>): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `${header}.${body}.stub-signature`;
}

export type Role = 'Administrator' | 'StoreManager' | 'StoreEmployee' | 'Player';

/**
 * Mock POST /api/auth/refresh to return a fake JWT so AuthService's
 * silentRefresh() (the app's real session-restore path) picks it up,
 * the same way it would against a real HttpOnly session cookie.
 *
 * ⚠️ Call this AFTER stubUnmatchedApi (LIFO — last registered wins),
 * so this specific route isn't shadowed by the catch-all.
 */
export async function loginAs(
  page: Page,
  role: Role,
  opts: { id?: number; storeId?: number; playerId?: number; licenseTier?: 'Free' | 'Tier1' | 'Tier2' | 'Tier3' } = {}
): Promise<void> {
  const exp   = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const token = makeJwt({
    sub:      String(opts.id ?? 1),
    email:    `test-${role.toLowerCase()}@example.com`,
    name:     `Test ${role}`,
    role,
    exp,
    ...(opts.storeId     != null ? { storeId:     opts.storeId     } : {}),
    ...(opts.playerId    != null ? { playerId:    opts.playerId    } : {}),
    ...(opts.licenseTier != null ? { licenseTier: opts.licenseTier } : {}),
  });

  await page.route('**/api/auth/refresh', route => {
    route.fulfill({ json: { token } });
  });
}
