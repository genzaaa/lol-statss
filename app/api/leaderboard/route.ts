import { NextRequest, NextResponse } from 'next/server';
import {
  getChallengerLeague,
  getAccountByPuuid,
  getSummonerById,
  PLATFORM_HOSTS,
  type Platform,
} from '@/lib/riot';
import { batchWithLimit } from '@/lib/batch';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region') as Platform | null;
  const queue = searchParams.get('queue') ?? 'RANKED_SOLO_5x5';

  if (!region) {
    return NextResponse.json(
      { error: 'Missing required param: region' },
      { status: 400 }
    );
  }

  if (!(region in PLATFORM_HOSTS)) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
  }

  try {
    const league = await getChallengerLeague(region, queue);
    const top = [...league.entries]
      .sort((a, b) => b.leaguePoints - a.leaguePoints)
      .slice(0, 50);

    // Resolve each entry's PUUID → Riot ID (gameName#tagLine).
    // Concurrency 5 keeps us well under the 20 req/s cap while still
    // finishing 50 lookups in ~10s on first load. Account lookups cache
    // for 24h (see getAccountByPuuid), so subsequent loads are instant.
    const enriched = await batchWithLimit(top, 5, async (entry) => {
      // Newer endpoint returns puuid directly; older uses summonerId.
      let puuid = entry.puuid;
      if (!puuid && entry.summonerId) {
        try {
          const s = await getSummonerById(region, entry.summonerId);
          puuid = s.puuid;
        } catch {
          // skip if resolution fails
        }
      }
      if (!puuid) return { ...entry, gameName: null, tagLine: null };
      try {
        const account = await getAccountByPuuid(region, puuid);
        return {
          ...entry,
          puuid,
          gameName: account.gameName,
          tagLine: account.tagLine,
        };
      } catch {
        return { ...entry, puuid, gameName: null, tagLine: null };
      }
    });

    return NextResponse.json({
      league: { ...league, entries: enriched },
    });
  } catch (e: any) {
    const status = e.status ?? 500;
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status });
  }
}
