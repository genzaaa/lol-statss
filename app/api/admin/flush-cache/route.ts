import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { flushAll } from '@/lib/kv-cache';

export const dynamic = 'force-dynamic';

/**
 * Admin endpoint: flush the Redis cache.
 *
 * Use when Redis hits OOM ('OOM command not allowed when used memory >
 * maxmemory') or when you want a clean slate after deploying a change
 * to the cache schema.
 *
 * Auth model:
 *   - Requires the ADMIN_TOKEN env var to be set on the deployment.
 *   - Caller must pass ?token=<exact-value> in the URL.
 *   - Constant-time comparison via Buffer comparison (resists timing attacks).
 *
 * Fail-closed: if ADMIN_TOKEN is not set, every request is rejected.
 * This means accidentally deploying without the env var leaves no
 * unauthenticated wide-open flush button.
 *
 * Usage:
 *   curl 'https://lol-statss.vercel.app/api/admin/flush-cache?token=YOUR_TOKEN'
 *   Or just open that URL in a browser.
 *
 * Response:
 *   200 with { ok: true, info: '...' }   on success
 *   401 if token is missing or wrong
 *   500 if ADMIN_TOKEN env var is not set
 *   503 if Redis isn't configured or the FLUSHDB command failed
 */
export async function GET(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'ADMIN_TOKEN env var not set on the deployment. Set it in Vercel env vars before using this endpoint.',
      },
      { status: 500 }
    );
  }

  const provided = new URL(req.url).searchParams.get('token') ?? '';

  // Constant-time compare to resist timing attacks. Buffer.compare returns
  // 0 only when the byte sequences are identical AND the same length.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && Buffer.compare(a, b) === 0;
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: 'invalid or missing token' },
      { status: 401 }
    );
  }

  const result = await flushAll();
  return NextResponse.json(result, {
    status: result.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
