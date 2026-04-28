// Riot API client — all server-side calls go through here.
// The API key is read from process.env.RIOT_API_KEY and is NEVER exposed to the client.
import 'server-only';

import {
  PLATFORM_HOSTS,
  REGIONAL_HOSTS,
  regionalFor,
  PLATFORM_LABELS,
  type Platform,
} from './regions';

export { PLATFORM_HOSTS, REGIONAL_HOSTS, regionalFor, PLATFORM_LABELS };
export type { Platform };

const KEY = process.env.RIOT_API_KEY;

// All Riot API responses go through lib/kv-cache.ts which provides
// two-tier caching (in-memory + Vercel KV). The KV layer is opt-in via
// env vars; if unconfigured the fallback is just in-memory per instance.

import { cached } from './kv-cache';

/**
 * Sleep for the given milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Perform the actual Riot API request, with rate-limit-aware retry.
 *
 * Riot returns 429 with a Retry-After header (seconds) when we hit a
 * limit. We respect that header up to a sane maximum (3 attempts, max
 * 5 second wait). Beyond that we surface the 429 to the caller.
 *
 * Other transient errors (502/503/504) get one quick retry.
 */
async function riotFetchRaw<T>(url: string): Promise<T> {
  if (!KEY) {
    throw new Error(
      'RIOT_API_KEY is not set. Add it to .env.local or Vercel environment variables.'
    );
  }

  const MAX_ATTEMPTS = 3;
  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      headers: { 'X-Riot-Token': KEY },
      // We're already caching at the KV layer; tell Next.js not to re-cache.
      cache: 'no-store',
    });

    if (res.ok) {
      return (await res.json()) as T;
    }

    if (res.status === 429) {
      // Rate limited. Riot returns Retry-After in seconds.
      const retryAfter = parseInt(res.headers.get('retry-after') ?? '1', 10);
      const waitMs = Math.min(retryAfter * 1000, 5000);
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(waitMs);
        continue;
      }
      // Out of retries — propagate
    } else if (res.status >= 502 && res.status <= 504) {
      // Transient gateway error — retry once with brief backoff
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(500);
        continue;
      }
    }

    // Permanent error or out of retries — throw
    const body = await res.text();
    const err: any = new Error(
      `Riot API ${res.status}: ${res.statusText}${body ? ` — ${body}` : ''}`
    );
    err.status = res.status;
    err.isRateLimit = res.status === 429;
    throw err;
  }

  throw lastError ?? new Error('riotFetchRaw: exhausted retries');
}

/**
 * Cached Riot API fetch.
 *
 * Wraps the raw fetch with a two-tier cache (in-memory + Vercel KV) so
 * repeat requests for the same URL are served from cache. Pick a TTL
 * appropriate to the endpoint — see TTL constants in lib/kv-cache.ts.
 *
 * Backwards-compatible signature: legacy callers passed ttlMs in
 * milliseconds. We continue to accept that for compatibility, converting
 * to seconds for the cache layer.
 */
async function riotFetch<T>(url: string, ttlMs = 60_000): Promise<T> {
  const ttlSec = Math.max(1, Math.floor(ttlMs / 1000));
  return cached(url, ttlSec, () => riotFetchRaw<T>(url));
}

// ========================= Account / Summoner =========================

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface Summoner {
  id: string;           // encrypted summoner ID
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
}

export async function getAccountByRiotId(
  platform: Platform,
  gameName: string,
  tagLine: string
): Promise<RiotAccount> {
  const host = REGIONAL_HOSTS[regionalFor(platform)];
  const url = `https://${host}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    gameName
  )}/${encodeURIComponent(tagLine)}`;
  return riotFetch<RiotAccount>(url, 300_000); // 5 min
}

export async function getAccountByPuuid(
  platform: Platform,
  puuid: string
): Promise<RiotAccount> {
  const host = REGIONAL_HOSTS[regionalFor(platform)];
  const url = `https://${host}/riot/account/v1/accounts/by-puuid/${puuid}`;
  // Cache names aggressively — they rarely change
  return riotFetch<RiotAccount>(url, 24 * 60 * 60 * 1000);
}

export async function getSummonerById(
  platform: Platform,
  summonerId: string
): Promise<Summoner> {
  const host = PLATFORM_HOSTS[platform];
  const url = `https://${host}/lol/summoner/v4/summoners/${summonerId}`;
  return riotFetch<Summoner>(url, 24 * 60 * 60 * 1000);
}

export async function getSummonerByPuuid(
  platform: Platform,
  puuid: string
): Promise<Summoner> {
  const host = PLATFORM_HOSTS[platform];
  const url = `https://${host}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  return riotFetch<Summoner>(url, 300_000);
}

// ========================= Ranked =========================

export interface LeagueEntry {
  leagueId: string;
  queueType: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR' | string;
  tier: string;
  rank: string;
  summonerId: string;
  puuid?: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export async function getRankedBySummonerId(
  platform: Platform,
  summonerId: string
): Promise<LeagueEntry[]> {
  const host = PLATFORM_HOSTS[platform];
  const url = `https://${host}/lol/league/v4/entries/by-summoner/${summonerId}`;
  return riotFetch<LeagueEntry[]>(url, 120_000);
}

// Newer PUUID-based ranked endpoint — preferred when available
export async function getRankedByPuuid(
  platform: Platform,
  puuid: string
): Promise<LeagueEntry[]> {
  const host = PLATFORM_HOSTS[platform];
  const url = `https://${host}/lol/league/v4/entries/by-puuid/${puuid}`;
  return riotFetch<LeagueEntry[]>(url, 120_000);
}

// Challenger / Grandmaster / Master leaderboards
export interface LeagueList {
  leagueId: string;
  tier: string;
  name: string;
  queue: string;
  entries: Array<{
    summonerId?: string;
    puuid?: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    rank: string;
    hotStreak: boolean;
    veteran: boolean;
    freshBlood: boolean;
    inactive: boolean;
  }>;
}

export async function getChallengerLeague(
  platform: Platform,
  queue = 'RANKED_SOLO_5x5'
): Promise<LeagueList> {
  const host = PLATFORM_HOSTS[platform];
  const url = `https://${host}/lol/league/v4/challengerleagues/by-queue/${queue}`;
  return riotFetch<LeagueList>(url, 600_000); // 10 min
}

// ========================= Match History =========================

export interface GetMatchIdsOptions {
  start?: number;
  count?: number;
  queue?: number; // queue id filter (e.g. 420 for ranked solo)
  type?: 'ranked' | 'normal' | 'tourney' | 'tutorial';
  startTime?: number; // epoch SECONDS — only return matches after this time
  endTime?: number;   // epoch SECONDS
}

export async function getMatchIds(
  platform: Platform,
  puuid: string,
  options: GetMatchIdsOptions | number = {}
): Promise<string[]> {
  // Back-compat: old signature was (platform, puuid, count: number)
  const opts: GetMatchIdsOptions =
    typeof options === 'number' ? { count: options } : options;
  const { start = 0, count = 10, queue, type, startTime, endTime } = opts;

  const host = REGIONAL_HOSTS[regionalFor(platform)];
  const params = new URLSearchParams({
    start: String(start),
    count: String(Math.min(count, 100)),
  });
  if (queue !== undefined) params.set('queue', String(queue));
  if (type) params.set('type', type);
  if (startTime !== undefined) params.set('startTime', String(startTime));
  if (endTime !== undefined) params.set('endTime', String(endTime));

  const url = `https://${host}/lol/match/v5/matches/by-puuid/${puuid}/ids?${params}`;
  return riotFetch<string[]>(url, 60_000);
}

// Match details — structure is large; we only type the fields we use.
export interface MatchParticipant {
  puuid: string;
  summonerName: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  championName: string;
  championId: number;
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  champLevel: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  summoner1Id: number;
  summoner2Id: number;
  perks?: {
    statPerks?: { defense: number; flex: number; offense: number };
    styles: Array<{
      description: string; // 'primaryStyle' | 'subStyle'
      style: number;       // rune tree id (e.g. 8100 = Domination)
      selections: Array<{ perk: number; var1: number; var2: number; var3: number }>;
    }>;
  };
  teamPosition?: string;
  individualPosition?: string;
  visionScore?: number;
  wardsPlaced?: number;
  wardsKilled?: number;
  visionWardsBoughtInGame?: number;
  totalDamageDealtToChampions?: number;
  totalDamageTaken?: number;
  damageSelfMitigated?: number;
  totalHeal?: number;
  totalHealsOnTeammates?: number;
  damageDealtToObjectives?: number;
  damageDealtToTurrets?: number;
  turretKills?: number;
  inhibitorKills?: number;
  firstBloodKill?: boolean;
  firstBloodAssist?: boolean;
  firstTowerKill?: boolean;
  firstTowerAssist?: boolean;
  largestMultiKill?: number;
  pentaKills?: number;
  quadraKills?: number;
  tripleKills?: number;
  doubleKills?: number;
  longestTimeSpentLiving?: number;
  timeCCingOthers?: number;
  totalTimeCCDealt?: number;
  goldSpent?: number;
  challenges?: Record<string, number>;
}

export interface MatchTeam {
  teamId: number;
  win: boolean;
  bans?: Array<{ championId: number; pickTurn: number }>;
  objectives?: {
    baron?: { first: boolean; kills: number };
    dragon?: { first: boolean; kills: number };
    champion?: { first: boolean; kills: number };
    tower?: { first: boolean; kills: number };
    inhibitor?: { first: boolean; kills: number };
    riftHerald?: { first: boolean; kills: number };
    horde?: { first: boolean; kills: number };   // void grubs
  };
}

export interface Match {
  metadata: { matchId: string; participants: string[] };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    gameMode: string;
    gameType: string;
    gameVersion?: string;
    queueId: number;
    platformId?: string;
    participants: MatchParticipant[];
    teams?: MatchTeam[];
  };
}

export async function getMatch(platform: Platform, matchId: string): Promise<Match> {
  const host = REGIONAL_HOSTS[regionalFor(platform)];
  const url = `https://${host}/lol/match/v5/matches/${matchId}`;
  return riotFetch<Match>(url, 7 * 24 * 60 * 60 * 1000); // 7d — matches are immutable
}

// ========================= Match Timeline =========================

export interface TimelineEvent {
  type: string;
  timestamp: number;
  participantId?: number;
  killerId?: number;
  victimId?: number;
  assistingParticipantIds?: number[];
  position?: { x: number; y: number };
  itemId?: number;
  skillSlot?: number;
  monsterType?: string;
  monsterSubType?: string;
  buildingType?: string;
  laneType?: string;
  teamId?: number;
  killType?: string;
  bounty?: number;
  shutdownBounty?: number;
  killerTeamId?: number;
}

export interface TimelineFrame {
  timestamp: number;
  events: TimelineEvent[];
  participantFrames: Record<string, {
    participantId: number;
    currentGold: number;
    totalGold: number;
    goldPerSecond: number;
    level: number;
    xp: number;
    minionsKilled: number;
    jungleMinionsKilled: number;
    position: { x: number; y: number };
    championStats?: Record<string, number>;
    damageStats?: Record<string, number>;
  }>;
}

export interface MatchTimeline {
  metadata: { matchId: string; participants: string[] };
  info: {
    frameInterval: number;
    gameId: number;
    participants: Array<{ participantId: number; puuid: string }>;
    frames: TimelineFrame[];
  };
}

export async function getMatchTimeline(
  platform: Platform,
  matchId: string
): Promise<MatchTimeline> {
  const host = REGIONAL_HOSTS[regionalFor(platform)];
  const url = `https://${host}/lol/match/v5/matches/${matchId}/timeline`;
  return riotFetch<MatchTimeline>(url, 7 * 24 * 60 * 60 * 1000); // 7d — immutable
}

// ========================= Champion Mastery =========================

export interface ChampionMastery {
  puuid: string;
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  chestGranted: boolean;
  tokensEarned: number;
}

export async function getTopMasteries(
  platform: Platform,
  puuid: string,
  count = 10
): Promise<ChampionMastery[]> {
  const host = PLATFORM_HOSTS[platform];
  const url = `https://${host}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`;
  return riotFetch<ChampionMastery[]>(url, 60 * 60 * 1000); // 1h
}

export async function getMasteryScore(
  platform: Platform,
  puuid: string
): Promise<number> {
  const host = PLATFORM_HOSTS[platform];
  const url = `https://${host}/lol/champion-mastery/v4/scores/by-puuid/${puuid}`;
  return riotFetch<number>(url, 60 * 60 * 1000); // 1h
}

// ========================= Live Game =========================

export interface CurrentGame {
  gameId: number;
  gameStartTime: number;
  gameLength: number;
  gameMode: string;
  mapId: number;
  queueConfigId: number;
  participants: Array<{
    puuid: string;
    teamId: number;
    championId: number;
    riotId?: string;
    summonerName?: string;
    spell1Id: number;
    spell2Id: number;
  }>;
}

export async function getCurrentGame(
  platform: Platform,
  puuid: string
): Promise<CurrentGame | null> {
  const host = PLATFORM_HOSTS[platform];
  const url = `https://${host}/lol/spectator/v5/active-games/by-summoner/${puuid}`;
  try {
    return await riotFetch<CurrentGame>(url, 30_000);
  } catch (e: any) {
    if (e.status === 404) return null; // not in game
    throw e;
  }
}
