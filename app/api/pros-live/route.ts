import 'server-only';
import { NextResponse } from 'next/server';
import { PROS } from '@/lib/pros';
import {
  getAccountByRiotId,
  getCurrentGame,
  type Platform,
} from '@/lib/riot';
import { batchWithLimit } from '@/lib/batch';
import { getLatestVersion, getAllChampions } from '@/lib/ddragon';
import { getLiveStreams } from '@/lib/twitch';

// Refresh cadence — 60 seconds. Riot dev keys allow ~100 req / 2 min,
// and we issue ~1 request per pro to check live status (after PUUIDs are
// cached). 60s gives generous headroom even with 55+ pros.
export const revalidate = 60;

export interface LivePro {
  slug: string;
  name: string;
  team: string;
  role: string;
  /** Riot region — used by the client to deep-link to the live game page */
  region: Platform;
  /** Riot ID parts — for deep-link */
  gameName: string;
  tagLine: string;
  /** Numeric champion ID from the spectator endpoint */
  championId: number;
  /** Champion string key (e.g. "Aatrox") — resolved server-side */
  championKey: string;
  /** Queue ID — 420 = Solo, 440 = Flex, 450 = ARAM */
  queueId: number;
  /** Game length in seconds */
  gameLength: number;
  /** Twitch login if this pro is also currently streaming on Twitch.
   *  When present, the client can render an embedded player instead
   *  of (or in addition to) the spectate-script download. */
  twitchUsername?: string;
  /** Number of viewers on the stream right now. */
  twitchViewers?: number;
}

// Module-level cache of resolved PUUIDs so we don't pay the account-by-riot-id
// cost every 60 seconds. The cache survives the lifetime of the serverless
// container (which is short) but is re-populated lazily.
const puuidCache = new Map<string, string>();

function puuidKey(region: Platform, gameName: string, tagLine: string) {
  return `${region}:${gameName}#${tagLine}`;
}

async function resolvePuuid(
  region: Platform,
  gameName: string,
  tagLine: string
): Promise<string | null> {
  const key = puuidKey(region, gameName, tagLine);
  const cached = puuidCache.get(key);
  if (cached) return cached;
  try {
    const account = await getAccountByRiotId(region, gameName, tagLine);
    puuidCache.set(key, account.puuid);
    return account.puuid;
  } catch {
    return null;
  }
}

/**
 * Check ONE pro's primary account for an active game.
 * Returns a LivePro entry if they're in a game, otherwise null.
 */
async function checkPro(
  pro: typeof PROS[number],
  champByKey: Map<number, string>
): Promise<LivePro | null> {
  // Use the first listed account — usually the primary, listed first.
  const acc = pro.accounts[0];
  if (!acc) return null;

  const puuid = await resolvePuuid(acc.region, acc.gameName, acc.tagLine);
  if (!puuid) return null;

  let game;
  try {
    game = await getCurrentGame(acc.region, puuid);
  } catch {
    return null;
  }
  if (!game) return null;

  // Find this pro's participant entry
  const me = game.participants.find((p) => p.puuid === puuid);
  if (!me) return null;

  return {
    slug: pro.slug,
    name: pro.name,
    team: pro.team,
    role: pro.role,
    region: acc.region,
    gameName: acc.gameName,
    tagLine: acc.tagLine,
    championId: me.championId,
    championKey: champByKey.get(me.championId) ?? 'Unknown',
    queueId: game.queueConfigId,
    gameLength: game.gameLength,
  };
}

export async function GET() {
  // Fetch the static stuff first; both are cached aggressively by ddragon.ts
  const [version, champions] = await Promise.all([
    getLatestVersion(),
    getAllChampions(),
  ]);

  // Build numeric ID → string ID map (e.g. 266 → "Aatrox") for the spectator
  // endpoint, which only returns numeric IDs.
  const champByKey = new Map<number, string>();
  for (const c of champions) {
    const numericKey = Number(c.key);
    if (!Number.isNaN(numericKey)) champByKey.set(numericKey, c.id);
  }

  // Concurrency limit of 5 — friendly to Riot's API and avoids spike-burst
  // rate limiting. With ~55 pros that's ~11 sequential batches.
  const results = await batchWithLimit(PROS, 5, (p) => checkPro(p, champByKey));
  const live = results.filter((r): r is LivePro => r !== null);

  // Twitch enrichment: for any LivePro whose pro entry has a twitchUsername,
  // check if they're currently streaming. Cheap — one batched Twitch
  // request, cached 60s. Silently skipped if Twitch creds aren't set.
  const liveSlugs = new Set(live.map((l) => l.slug));
  const twitchCandidates: string[] = [];
  for (const pro of PROS) {
    if (liveSlugs.has(pro.slug) && pro.twitchUsername) {
      twitchCandidates.push(pro.twitchUsername);
    }
  }
  if (twitchCandidates.length > 0) {
    try {
      const streams = await getLiveStreams(twitchCandidates);
      const byLogin = new Map(streams.map((s) => [s.user_login, s]));
      for (const livePro of live) {
        const pro = PROS.find((p) => p.slug === livePro.slug);
        const twitch = pro?.twitchUsername
          ? byLogin.get(pro.twitchUsername.toLowerCase())
          : undefined;
        if (twitch) {
          livePro.twitchUsername = pro!.twitchUsername;
          livePro.twitchViewers = twitch.viewer_count;
        }
      }
    } catch (e: any) {
      // Twitch is best-effort — failures shouldn't break the whole route.
      console.warn('[pros-live] Twitch enrichment failed:', e?.message ?? e);
    }
  }

  return NextResponse.json(
    {
      checked: PROS.length,
      live,
      version,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        // Cache aggressively at the edge too
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
