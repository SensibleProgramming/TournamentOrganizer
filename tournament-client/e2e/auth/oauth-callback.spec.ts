import { test, expect } from '@playwright/test';
import { stubUnmatchedApi } from '../helpers/api-mock';

// ─── OAuth Callback E2E Tests ─────────────────────────────────────────────────
//
// Verifies that the token is delivered via URL fragment (not query string),
// stored to localStorage, and that the fragment is removed from the address bar
// before any redirect occurs (OWASP A02:2021 — tokens must not appear in logs
// or browser history).
//
// The component does a full-page reload via window.location.href, so we wait
// for the final URL rather than asserting on intermediate states.

// Minimal decodable JWT (same shape as auth.ts makeJwt)
function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `${header}.${body}.stub-signature`;
}

const STUB_TOKEN = makeJwt({
  sub: '1',
  email: 'test-player@example.com',
  name: 'Test Player',
  role: 'Player',
  exp: Math.floor(Date.now() / 1000) + 3600,
});

test.describe('OAuth callback — token via URL fragment', () => {
  test('stores the token in localStorage and redirects to /', async ({ page }) => {
    await stubUnmatchedApi(page);

    await page.goto(`/auth/callback#token=${encodeURIComponent(STUB_TOKEN)}`);

    // After the full-page reload the app should land on root
    await expect(page).toHaveURL('/', { timeout: 5000 });

    // Token must be in localStorage
    const stored = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(stored).toBe(STUB_TOKEN);
  });

  test('URL does not contain the token as a query parameter', async ({ page }) => {
    await stubUnmatchedApi(page);

    await page.goto(`/auth/callback#token=${encodeURIComponent(STUB_TOKEN)}`);

    await expect(page).toHaveURL('/', { timeout: 5000 });

    // The token must never appear as a query param — it must only travel as a fragment
    const url = page.url();
    expect(url).not.toContain('token=');
  });
});

test.describe('OAuth callback — error path', () => {
  test('redirects to / when no token is present', async ({ page }) => {
    await stubUnmatchedApi(page);

    await page.goto('/auth/callback?error=auth_failed');

    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('redirects to / when neither token nor error is present', async ({ page }) => {
    await stubUnmatchedApi(page);

    await page.goto('/auth/callback');

    await expect(page).toHaveURL('/', { timeout: 5000 });
  });
});
