// Riot API client — all server-side calls go through here.
// The API key is read from process.env.RIOT_API_KEY and is NEVER exposed to the client.

const KEY = process.env.RIOT_API_KEY;

// Platform routing values (specific regions) — used for summoner/league/spectator
export const PLATFORM_HOSTS = {
  na1: 'na1.api.riotgames.com',
  euw1: 'euw1.api.riotgames.com',
  eun1: 'eun1.api.riotgames.com',
  kr: 'kr.api.riotgames.com',
  br1: 'br1.api.riotgames.com',
  la1: 'la1.api.riotgames.com',
  la2: 'la2.api.riotgames.com',
  jp1: 'jp1.api.riotgames.com',
  oc1: 'oc1.api.riotgames.com',
  tr1: 'tr1.api.riotgames.com',
  ru: 'ru.api.riotgames.com',
} as const;

// Regional routing values (continents) — used for account/match endpoints
export const REGIONAL_HOSTS = {
  americas: 'americas.api.riotgames.com',
  europe: 'europe.api.riotgames.com',
  asia: 'asia.api.riotgames.com',
  sea: 'sea.api.riotgames.com',
} as const;

export type Platform = keyof typeof PLATFORM_HOSTS;

// Map platform → regional cluster
export function regionalFor(platform: Platform): keyof typeof REGIONAL_HOSTS {
  if (['na1', 'br1', 'la1', 'la2'].includes(platform)) return 'americas';
  if (['euw1', 'eun1', 'tr1', 'ru'].includes(platform)) return 'europe';
  if (['kr', 'jp1'].includes(platform)) return 'asia';
  return 'sea'; // oc1
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  na1: 'NA',
  euw1: 'EUW',
  eun1: 'EUNE',
  kr: 'KR',
  br1: 'BR',
  la1: 'LAN',
  la2: 'LAS',
  jp1: 'JP',
  oc1: 'OCE',
  tr1: 'TR',
  ru: 'RU',
};

// Simple in-memory cache with TTL. Good enough for a small project.
// On Vercel this resets on cold starts, which naturally keeps data fresh.
type CacheEntry = { data: unknown; expires: number };
const cache = new Map<string, CacheEntry>();

async function riotFetch<T>(url: string, ttlMs = 60_000): Promise<T> {
  if (!KEY) {
    throw new Error(
      'RIOT_API_KEY is not set. Add it to .env.local or Vercel environment variables.'
    );
  }

  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  const res = await fetch(url, {
    headers: { 'X-Riot-Token': KEY },
    // Next.js fetch caching — works on Vercel edge
    next: { revalidate: Math.floor(ttlMs / 1000) },
  });

  if (!res.ok) {
    const body = await res.text();
    const err: any = new Error(
      `Riot API ${res.status}: ${res.statusText}${body ? ` — ${body}` : ''}`
    );
    err.status = res.status;
    throw err;
  }

  const data = (await res.json()) as T;
  cache.set(url, { data, expires: Date.now() + ttlMs });
  return data;
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

export async function getMatchIds(
  platform: Platform,
  puuid: string,
  count = 10
): Promise<string[]> {
  const host = REGIONAL_HOSTS[regionalFor(platform)];
  const url = `https://${host}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
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
    styles: Array<{
      description: string;
      style: number;
      selections: Array<{ perk: number }>;
    }>;
  };
  teamPosition?: string;
  visionScore?: number;
}

export interface Match {
  metadata: { matchId: string; participants: string[] };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    gameMode: string;
    gameType: string;
    queueId: number;
    participants: MatchParticipant[];
  };
}

export async function getMatch(platform: Platform, matchId: string): Promise<Match> {
  const host = REGIONAL_HOSTS[regionalFor(platform)];
  const url = `https://${host}/lol/match/v5/matches/${matchId}`;
  return riotFetch<Match>(url, 3_600_000); // matches don't change — cache 1h
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