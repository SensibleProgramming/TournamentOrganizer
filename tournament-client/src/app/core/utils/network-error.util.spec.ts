import { isBackendUnreachable } from './network-error.util';

describe('isBackendUnreachable', () => {
  it.each([
    ['undefined error', undefined],
    ['null error', null],
    ['status 0 (browser-level network failure)', { status: 0 }],
    ['status 404 (static host, no backend deployed)', { status: 404 }],
  ])('returns true for %s', (_label, err) => {
    expect(isBackendUnreachable(err)).toBe(true);
  });

  it.each([
    ['status 400 (validation error)', { status: 400 }],
    ['status 401 (auth error)', { status: 401 }],
    ['status 409 (conflict)', { status: 409 }],
    ['status 500 (server error)', { status: 500 }],
  ])('returns false for %s', (_label, err) => {
    expect(isBackendUnreachable(err)).toBe(false);
  });
});
