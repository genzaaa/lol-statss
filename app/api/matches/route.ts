import { NextRequest, NextResponse } from 'next/server';
import {
  getMatchIds,
  getMatch,
  PLATFORM_HOSTS,
  type Platform,
} from '@/lib/riot';
import { batchWithLimit } from '@/lib/batch';
import { queueIdsForFilter } from '@/lib/ddragon';

// When a specific queue is filtered, restrict to the last ~6 months so we don't
// surface ancient games for queues the player rarely touches (e.g. ARAM).
const SIX_MONTHS_SECONDS = 60 * 60 * 24 * 30 * 6;

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
  // `undefined` means "no filter" (covers the "all" option).
  const queueIds = queueIdsForFilter(queueParam);
  const isFiltered = queueIds !== undefined;
  const startTime = isFiltered
    ? Math.floor(Date.now() / 1000) - SIX_MONTHS_SECONDS
    : undefined;

  try {
    let ids: string[];

    if (!queueIds || queueIds.length === 0) {
      // No filter — single request
      ids = await getMatchIds(region, puuid, { start, count });
    } else if (queueIds.length === 1) {
      // Single queue ID — direct request
      ids = await getMatchIds(region, puuid, {
        start,
        count,
        queue: queueIds[0],
        startTime,
      });
    } else {
      // Multiple queue IDs — Riot's API doesn't accept multiple queue= params,
      // so fan out: one request per queue ID, then merge.
      // We over-fetch (start+count from each) so a player who plays heavily
      // on one variant doesn't drown out the others.
      const perQueueResults = await Promise.all(
        queueIds.map((q) =>
          getMatchIds(region, puuid, {
            start: 0,
            count: start + count,
            queue: q,
            startTime,
          }).catch(() => [] as string[])
        )
      );

      // Match IDs look like "NA1_8123456789" — the trailing decimal number is
      // an auto-incrementing counter, so larger = newer. We extract and sort
      // numerically rather than lexicographically to be safe.
      const merged = Array.from(new Set(perQueueResults.flat()));
      const numericPart = (id: string): number => {
        const m = id.match(/_(\d+)$/);
        return m ? Number(m[1]) : 0;
      };
      merged.sort((a, b) => numericPart(b) - numericPart(a));
      ids = merged.slice(start, start + count);
    }

    // Concurrency-limited match detail fetch
    const matches = await batchWithLimit(ids, 5, (id) =>
      getMatch(region, id).catch(() => null)
    );
    return NextResponse.json({ matches: matches.filter(Boolean) });
  } catch (e: any) {
    const status = e.status ?? 500;
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status });
  }
}
