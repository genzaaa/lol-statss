// Persistent response cache backed by Vercel Marketplace Redis.
//
// This module wraps async data-fetchers with a cache so we don't re-fetch
// the same Riot API endpoint when many users view the same profile.
//
// Two-tier:
//   1. Local in-memory cache (per serverless instance) for blistering reads
//   2. Redis (cross-instance, persistent) for durable caching
//
// If REDIS_URL isn't set, we silently fall back to in-memory only. This
// keeps local dev simple and means the site doesn't break before you
// provision Redis — you just don't get cross-instance caching.

import 'server-only';
import type { RedisClientType } from 'redis';

// Lazy import + module-level connection. Serverless functions reuse the
// module instance across invocations within the same warm container, so
// caching the client here amortizes the connect() cost.
let redisPromise: Promise<RedisClientType | null> | null = null;
let redisDisabled = false;

async function getRedis(): Promise<RedisClientType | null> {
  if (redisDisabled) return null;
  if (redisPromise) return redisPromise;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.log('[cache] REDIS_URL not set — using in-memory only');
    redisDisabled = true;
    return null;
  }

  console.log('[cache] connecting to Redis...');

  redisPromise = (async () => {
    try {
      const { createClient } = await import('redis');
      const client = createClient({
        url,
        // Short-lived requests — don't hang forever if Redis is unreachable
        socket: { connectTimeout: 3000, reconnectStrategy: false },
      }) as RedisClientType;
      // Quietly handle errors — we never want Redis problems to surface as
      // user-facing 500s. The cache is a perf optimization, not the source
      // of truth.
      client.on('error', (err) => {
        // First error: log and disable for this container's lifetime.
        // Reconnecting on every request would amplify problems.
        console.warn('[redis-cache] client error:', err?.message ?? err);
      });
      await client.connect();
      console.log('[cache] Redis connected successfully');
      return client;
    } catch (e: any) {
      console.warn(
        '[redis-cache] failed to connect, falling back to in-memory:',
        e?.message ?? e
      );
      redisDisabled = true;
      return null;
    }
  })();

  return redisPromise;
}

// In-memory cache as a fallback / first-tier. Reset on cold start, which
// is fine — Redis is the durable layer.
interface MemEntry {
  value: any;
  expiresAt: number;
}
const mem = new Map<string, MemEntry>();

const MAX_MEM_ENTRIES = 500;

function memSet(key: string, value: any, ttlMs: number) {
  // Simple eviction: when we hit the cap, drop the 50 oldest by expiresAt.
  if (mem.size >= MAX_MEM_ENTRIES) {
    const entries = Array.from(mem.entries()).sort(
      (a, b) => a[1].expiresAt - b[1].expiresAt
    );
    for (let i = 0; i < 50; i++) mem.delete(entries[i][0]);
  }
  mem.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function memGet(key: string): any | null {
  const entry = mem.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    mem.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Wrap a fetcher with read-through caching.
 *
 * @param key - Stable cache key (typically the URL or a derived form)
 * @param ttlSec - Cache TTL in seconds. Pick a value that reflects how
 *   often the underlying data changes; see the suggested TTLs at the
 *   bottom of this file.
 * @param fetcher - Async function that produces the value on cache miss.
 *
 * Behavior:
 * - First checks in-memory cache (per-instance, fastest)
 * - Then checks Redis (cross-instance)
 * - On miss, calls fetcher() and writes to BOTH layers
 * - Errors from Redis are logged but don't block the request — we just
 *   fall through to the fetcher
 */
export async function cached<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // 1. Memory hit?
  const memHit = memGet(key);
  if (memHit !== null) {
    return memHit as T;
  }

  // 2. Redis hit?
  const client = await getRedis();
  if (client) {
    try {
      const raw = await client.get(key);
      if (raw !== null && raw !== undefined) {
        try {
          const parsed = JSON.parse(raw) as T;
          // Backfill memory so subsequent reads in this instance are fast
          memSet(key, parsed, ttlSec * 1000);
          return parsed;
        } catch {
          // Bad JSON — treat as miss and refetch
        }
      }
    } catch (e: any) {
      console.warn('[redis-cache] read failed:', e?.message ?? e);
    }
  }

  // 3. Miss — call fetcher
  const value = await fetcher();

  // Write to both layers. Don't await Redis write — it's nice-to-have;
  // if it fails we still served the value.
  memSet(key, value, ttlSec * 1000);
  if (client) {
    client
      .set(key, JSON.stringify(value), { EX: ttlSec })
      .catch((e: any) =>
        console.warn('[redis-cache] write failed:', e?.message ?? e)
      );
  }

  return value;
}

/**
 * Manually invalidate a cache key. Used after mutations or when fresh
 * data is required (e.g. user clicks "refresh").
 */
export async function invalidate(key: string): Promise<void> {
  mem.delete(key);
  const client = await getRedis();
  if (client) {
    try {
      await client.del(key);
    } catch (e: any) {
      console.warn('[redis-cache] delete failed:', e?.message ?? e);
    }
  }
}

// =============== Suggested TTLs ===============
//
// These are exported as constants so callers don't have to make up numbers.

export const TTL = {
  /** Match data: immutable once the game is over. Cache for a week. */
  MATCH: 7 * 24 * 60 * 60,
  /** Match list (matchIds): could change every game. 5 minutes. */
  MATCH_IDS: 5 * 60,
  /** Account info (puuid): rarely changes. 24h. */
  ACCOUNT: 24 * 60 * 60,
  /** Summoner profile (level, icon): changes slowly. 1h. */
  SUMMONER: 60 * 60,
  /** Ranked entries (LP, tier): changes frequently. 5 minutes. */
  RANKED: 5 * 60,
  /** Champion mastery: changes per game. 1h. */
  MASTERY: 60 * 60,
  /** Active game: must be fresh. 30s — barely cached. */
  CURRENT_GAME: 30,
  /** Challenger league: top of ladder. 5 minutes. */
  LEAGUE: 5 * 60,
} as const;
