/**
 * True when an error indicates the backend itself is unreachable/absent
 * (no status, status 0, or a static-host 404 for an /api/** route) as
 * opposed to a real error surfaced by a live, reachable API. 400/401/409/500+
 * prove the backend processed the request and must still surface as errors.
 */
export function isBackendUnreachable(err: unknown): boolean {
  const status = (err as { status?: number } | null | undefined)?.status;
  return status == null || status === 0 || status === 404;
}
