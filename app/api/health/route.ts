import 'server-only';
import { NextResponse } from 'next/server';
import { cached, TTL } from '@/lib/kv-cache';
import { isTwitchConfigured } from '@/lib/twitch';
import { getLatestVersion } from '@/lib/ddragon';

export const dynamic = 'force-dynamic';

/**
 * Probes every external dependency the site relies on and returns a JSON
 * health report. Useful for confirming Redis, Riot API, and Twitch are
 * configured and reachable after a deploy.
 *
 * Open this URL in a browser:
 *   /api/health
 *
 * Each section is "ok" / "skip" / "error" with a short detail message.
 */
export async function GET() {
  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
  };

  // === Riot API key ===
  if (!process.env.RIOT_API_KEY) {
    report.riotApiKey = { status: 'error', detail: 'RIOT_API_KEY env var not set' };
  } else {
    const len = process.env.RIOT_API_KEY.length;
    // Riot dev keys are typically RGAPI-XXXXX-... (~40 chars). Production
    // keys have the same shape. We don't print the key, just sanity-check
    // its length.
    report.riotApiKey = {
      status: len > 30 ? 'ok' : 'error',
      detail: len > 30 ? `set (${len} chars)` : `suspiciously short (${len} chars)`,
    };
  }

  // === Redis cache ===
  // We exercise the cache layer by writing and reading a probe key. If
  // Redis is configured and working, the second write should hit the
  // cache and not call the fetcher again.
  if (!process.env.REDIS_URL) {
    report.redis = {
      status: 'skip',
      detail: 'REDIS_URL env var not set — falling back to in-memory cache',
    };
  } else {
    try {
      const probeKey = 'health:probe';
      const stamp = Date.now();
      let calls = 0;
      // First call should miss and populate the cache
      const v1 = await cached(probeKey, 60, async () => {
        calls++;
        return stamp;
      });
      // Second call should hit and return the same value
      const v2 = await cached(probeKey, 60, async () => {
        calls++;
        return Date.now(); // different value, but we should NOT see it
      });
      if (v1 === v2 && calls === 1) {
        report.redis = { status: 'ok', detail: 'two-tier cache is working (write+read)' };
      } else {
        report.redis = {
          status: 'error',
          detail: `cache appears broken: v1=${v1}, v2=${v2}, fetcher_calls=${calls}`,
        };
      }
    } catch (e: any) {
      report.redis = {
        status: 'error',
        detail: e?.message ?? 'unknown error during probe',
      };
    }
  }

  // === Data Dragon ===
  try {
    const version = await getLatestVersion();
    report.ddragon = { status: 'ok', detail: `latest version: ${version}` };
  } catch (e: any) {
    report.ddragon = {
      status: 'error',
      detail: e?.message ?? 'failed to fetch Data Dragon version',
    };
  }

  // === Twitch ===
  if (!isTwitchConfigured()) {
    report.twitch = {
      status: 'skip',
      detail: 'TWITCH_CLIENT_ID/SECRET not set — Twitch features disabled',
    };
  } else {
    // We don't probe Twitch beyond config — a real OAuth round trip would
    // count against rate limits and isn't necessary for a health check.
    report.twitch = { status: 'ok', detail: 'credentials present' };
  }

  // === Overall ===
  const statuses = [
    report.riotApiKey,
    report.redis,
    report.ddragon,
    report.twitch,
  ].map((s) => s.status);
  const anyError = statuses.includes('error');
  const allOkOrSkip = statuses.every((s) => s === 'ok' || s === 'skip');

  return NextResponse.json(
    {
      ...report,
      overall: anyError ? 'degraded' : allOkOrSkip ? 'healthy' : 'unknown',
    },
    {
      status: anyError ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
