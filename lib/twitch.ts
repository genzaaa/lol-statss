// Minimal Twitch Helix API client — just enough to look up which streamers
// are currently live.
//
// Auth model: client-credentials grant. We exchange CLIENT_ID + SECRET for
// an app access token, cache it for ~24h (they're valid 60 days), and use
// it for unauthenticated streamer-status queries.
//
// Required env vars:
//   TWITCH_CLIENT_ID
//   TWITCH_CLIENT_SECRET
//
// If either is missing, every function returns silently empty results and
// nothing breaks. The Twitch UI just stays hidden.

import 'server-only';
import { cached, TTL } from './kv-cache';

const HELIX = 'https://api.twitch.tv/helix';
const OAUTH = 'https://id.twitch.tv/oauth2/token';

const CLIENT_ID = process.env.TWITCH_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET ?? '';

export function isTwitchConfigured(): boolean {
  return CLIENT_ID.length > 0 && CLIENT_SECRET.length > 0;
}

interface AppTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Get a cached Twitch app access token. Tokens expire after ~60 days but
 * we cache for 24h to be safe. The `cached` helper handles cross-instance
 * caching via Redis.
 */
async function getAppToken(): Promise<string | null> {
  if (!isTwitchConfigured()) return null;
  return cached('twitch:app-token', 24 * 60 * 60, async () => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    });
    const res = await fetch(OAUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) {
      console.warn('[twitch] failed to get app token:', res.status);
      return '';
    }
    const json = (await res.json()) as AppTokenResponse;
    return json.access_token;
  });
}

export interface TwitchStream {
  /** Twitch's internal user ID */
  user_id: string;
  /** Lowercase login name (the slug used in twitch.tv URLs) */
  user_login: string;
  /** Display name (with original capitalization) */
  user_name: string;
  /** Game ID — `21779` is League of Legends */
  game_id: string;
  game_name: string;
  /** Stream title set by streamer */
  title: string;
  viewer_count: number;
  /** ISO timestamp the stream started */
  started_at: string;
  /** Thumbnail URL with `{width}` and `{height}` placeholders */
  thumbnail_url: string;
  language: string;
}

interface StreamsResponse {
  data: TwitchStream[];
}

/**
 * Look up which Twitch usernames in the given list are currently live.
 *
 * Twitch's /streams endpoint takes up to 100 user_login params per request
 * and returns ONLY the streamers who are currently live. So if you pass
 * 50 usernames and 3 are live, you get 3 results back.
 *
 * Caches results for 60 seconds — enough to dedupe rapid page loads
 * without serving stale-feeling data.
 */
export async function getLiveStreams(
  usernames: string[]
): Promise<TwitchStream[]> {
  if (!isTwitchConfigured() || usernames.length === 0) return [];

  // Dedupe + lowercase for cache-key stability
  const unique = Array.from(new Set(usernames.map((u) => u.toLowerCase())));
  // Sort for stable cache keys
  unique.sort();
  const cacheKey = `twitch:live:${unique.join(',')}`;

  return cached(cacheKey, 60, async () => {
    const token = await getAppToken();
    if (!token) return [];

    // Twitch caps user_login at 100 per request. Chunk if needed.
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 100) {
      chunks.push(unique.slice(i, i + 100));
    }

    const all: TwitchStream[] = [];
    for (const chunk of chunks) {
      const params = new URLSearchParams();
      for (const u of chunk) params.append('user_login', u);
      const url = `${HELIX}/streams?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          'Client-ID': CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        console.warn('[twitch] /streams failed:', res.status);
        continue;
      }
      const json = (await res.json()) as StreamsResponse;
      all.push(...json.data);
    }
    return all;
  });
}
