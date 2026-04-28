// Persistent response cache backed by Vercel KV (Redis).
//
// This module wraps async data-fetchers with a cache so we don't re-fetch
// the same Riot API endpoint when many users view the same profile.
//
// Two-tier:
//   1. Local in-memory cache (per serverless instance) for blistering reads
//   2. Vercel KV for cross-instance persistence
//
// If Vercel KV isn't configured (no env vars), we silently fall back to
// in-memory only. This keeps local dev simple and means the site doesn't
// break if you forget to provision KV — you just don't get cross-instance
// caching.

import 'server-only';

// Lazy import — @vercel/kv reads env vars at module load and throws if
// they're missing. We don't want to crash the build for users who haven't
// provisioned KV yet.
let kvClient: typeof import('@vercel/kv').kv | null = null;
let kvImportAttempted = false;

async function getKv() {
  if (kvImportAttempted) return kvClient;
  kvImportAttempted = true;

  // Only attempt to import if the env vars are present. Otherwise we get
  // a noisy warning at module load.
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  try {
    const mod = await import('@vercel/kv');
    kvClient = mod.kv;
    return kvClient;
  } catch (e) {
    // Module not installed or failed to load — fall back to memory-only
    console.warn(
      '[kv-cache] @vercel/kv not available, falling back to in-memory cache'
    );
    return null;
  }
}

// In-memory cache as a fallback / first-tier. Reset on cold start, which
// is fine — KV is the durable layer.
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
 * - Then checks Vercel KV (cross-instance)
 * - On miss, calls fetcher() and writes to BOTH layers
 * - Errors from KV are logged but don't block the request — we just fall
 *   through to the fetcher
 */
export async function cached<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // 1. Memory hit?
  const memHit = memGet(key);
  if (memHit !== null) return memHit as T;

  // 2. KV hit?
  const kv = await getKv();
  if (kv) {
    try {
      const kvHit = await kv.get<T>(key);
      if (kvHit !== null && kvHit !== undefined) {
        // Backfill memory so subsequent reads in this instance are fast
        memSet(key, kvHit, ttlSec * 1000);
        return kvHit;
      }
    } catch (e) {
      // KV down? Continue to fetcher
      console.warn('[kv-cache] KV read failed:', e);
    }
  }

  // 3. Miss — call fetcher
  const value = await fetcher();

  // Write to both layers. Don't await KV write — it's nice-to-have; if
  // it fails we still served the value.
  memSet(key, value, ttlSec * 1000);
  if (kv) {
    kv.set(key, value, { ex: ttlSec }).catch((e) => {
      console.warn('[kv-cache] KV write failed:', e);
    });
  }

  return value;
}

/**
 * Manually invalidate a cache key. Used after mutations or when fresh
 * data is required (e.g. user clicks "refresh").
 */
export async function invalidate(key: string): Promise<void> {
  mem.delete(key);
  const kv = await getKv();
  if (kv) {
    try {
      await kv.del(key);
    } catch (e) {
      console.warn('[kv-cache] KV delete failed:', e);
    }
  }
}

// =============== Suggested TTLs ===============
//
// These are exported as constants so callers don't have to make up numbers.
// The numbers reflect "how stale can this data be without the user noticing
// or caring?" — match data is immutable so we cache it for days; rank
// changes hourly so we cache for minutes.

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
