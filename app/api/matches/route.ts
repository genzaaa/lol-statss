import { NextRequest, NextResponse } from 'next/server';
import {
  getMatchIds,
  getMatch,
  PLATFORM_HOSTS,
  type Platform,
} from '@/lib/riot';
import { batchWithLimit } from '@/lib/batch';
import { queueIdsForFilter } from '@/lib/ddragon';

// How far back to fetch when a filter is set. Ranked filters use this as a
// hint (via startTime); multi-queue filters (ARAM/Normal/Arena) intentionally
// DON'T pass startTime to Riot because that endpoint occasionally returns an
// empty list when startTime is set, even for active players — see
// https://github.com/RiotGames/developer-relations/issues/571
// Instead, for multi-queue filters we over-fetch IDs and trim newest-first.
const LOOKBACK_FETCH_BUDGET = 40;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region') as Platform | null;
  const puuid = searchParams.get('puuid');
  const count = Math.min(parseInt(searchParams.get('count') ?? '10', 10), 20);
  const start = Math.max(0, parseInt(searchParams.get('start') ?? '0', 10));
  const queueParam = searchParams.get('queue') ?? 'all';

  if (!region || !puuid) {
    return NextResponse.json(
      { error: 'Missing required params: region, puuid' },
      { status: 400 }
    );
  }
  if (!(region in PLATFORM_HOSTS)) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
  }

  // Resolve the filter value (e.g. "aram") to a list of queue IDs (e.g. [450, 2400, 100, 720]).
  // `undefined` means "no filter" (the "all" option).
  const queueIds = queueIdsForFilter(queueParam);

  try {
    let ids: string[];

    if (!queueIds || queueIds.length === 0) {
      // No filter — single request, no startTime
      ids = await getMatchIds(region, puuid, { start, count });
    } else if (queueIds.length === 1) {
      // Single queue ID — direct request. No startTime; just return newest N.
      ids = await getMatchIds(region, puuid, {
        start,
        count,
        queue: queueIds[0],
      });
    } else {
      // Multiple queue IDs — Riot's API doesn't accept multiple queue= params,
      // so fan out one request per queue ID and merge.
      //
      // Over-fetch up to LOOKBACK_FETCH_BUDGET per queue so a recent Mayhem
      // match isn't missed because the player has 30 regular ARAM games queued
      // ahead of it. After merging we slice to the requested page.
      //
      // We deliberately DO NOT pass startTime here — see top-of-file note.
      const perQueueBudget = Math.max(count, Math.min(LOOKBACK_FETCH_BUDGET, start + count * 2));
      const perQueueResults = await Promise.all(
        queueIds.map((q) =>
          getMatchIds(region, puuid, {
            start: 0,
            count: perQueueBudget,
            queue: q,
          }).catch((e) => {
            // Don't let a single failing queue blank the whole result, but do
            // surface the error in server logs so we can diagnose 429s / 5xxs.
            console.warn(`[matches] queue=${q} fetch failed:`, e?.message ?? e);
            return [] as string[];
          })
        )
      );

      // Match IDs look like "NA1_8123456789" — trailing decimal is an auto-
      // incrementing counter, so larger = newer. Extract & sort numerically.
      const merged = Array.from(new Set(perQueueResults.flat()));
      const numericPart = (id: string): number => {
        const m = id.match(/_(\d+)$/);
        return m ? Number(m[1]) : 0;
      };
      merged.sort((a, b) => numericPart(b) - numericPart(a));
      ids = merged.slice(start, start + count);
    }

    // Concurrency-limited match detail fetch (5 parallel requests)
    const matches = await batchWithLimit(ids, 5, (id) =>
      getMatch(region, id).catch(() => null)
    );
    return NextResponse.json({ matches: matches.filter(Boolean) });
  } catch (e: any) {
    const status = e.status ?? 500;
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status });
  }
}
