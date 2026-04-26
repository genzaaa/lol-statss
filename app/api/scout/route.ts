import { NextRequest, NextResponse } from 'next/server';
import {
  getRankedByPuuid,
  getMatchIds,
  getMatch,
  PLATFORM_HOSTS,
  type Platform,
} from '@/lib/riot';
import { batchWithLimit } from '@/lib/batch';

// Given up to 10 PUUIDs, return each one's solo-queue rank plus recent
// win/loss counts over the last 10 ranked games. Used by the live-game
// scout panel and the compare page.
//
// Concurrency is carefully bounded: 10 players * (1 ranked call + 1 match-ids
// call + up to 10 match detail calls) = up to 120 Riot calls per request.
// We cap at 5 parallel top-level jobs and within each job use modest fetches
// to stay under the 100-per-2-minute limit.

interface ScoutResult {
  puuid: string;
  tier?: string;
  rank?: string;
  lp?: number;
  wins?: number;
  losses?: number;
  hotStreak?: boolean;
  recentWins?: number;
  recentLosses?: number;
  /** Most-played champion across the last 10 ranked games */
  topChampion?: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const region = body.region as Platform | undefined;
  const puuids = (body.puuids as string[] | undefined) ?? [];

  if (!region || !(region in PLATFORM_HOSTS)) {
    return NextResponse.json({ error: 'Invalid or missing region' }, { status: 400 });
  }
  if (!Array.isArray(puuids) || puuids.length === 0) {
    return NextResponse.json({ error: 'Missing puuids[]' }, { status: 400 });
  }
  if (puuids.length > 10) {
    return NextResponse.json({ error: 'At most 10 PUUIDs per request' }, { status: 400 });
  }

  const results = await batchWithLimit<string, ScoutResult>(
    puuids,
    5,
    async (puuid) => {
      try {
        // Ranked first (cheap, 1 call)
        const ranked = await getRankedByPuuid(region, puuid).catch(() => []);
        const solo = ranked.find((r) => r.queueType === 'RANKED_SOLO_5x5');

        // Last 10 ranked match IDs
        const ids = await getMatchIds(region, puuid, {
          count: 10,
          queue: 420,
        }).catch(() => []);

        // Match details (5 parallel)
        const matches = await batchWithLimit(ids, 5, (id) =>
          getMatch(region, id).catch(() => null)
        );

        let recentWins = 0;
        let recentLosses = 0;
        const champCounts: Record<string, number> = {};
        for (const m of matches) {
          if (!m) continue;
          const me = m.info.participants.find((p) => p.puuid === puuid);
          if (!me) continue;
          if (me.win) recentWins++;
          else recentLosses++;
          champCounts[me.championName] = (champCounts[me.championName] ?? 0) + 1;
        }
        const topChampion = Object.entries(champCounts).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0];

        return {
          puuid,
          tier: solo?.tier,
          rank: solo?.rank,
          lp: solo?.leaguePoints,
          wins: solo?.wins,
          losses: solo?.losses,
          hotStreak: solo?.hotStreak,
          recentWins,
          recentLosses,
          topChampion,
        };
      } catch (e: any) {
        return { puuid, error: e.message ?? 'Unknown error' };
      }
    }
  );

  return NextResponse.json({ results });
}
