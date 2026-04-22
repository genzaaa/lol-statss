'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Match } from '@/lib/riot';
import type { Platform } from '@/lib/regions';
import { QUEUE_FILTER_OPTIONS } from '@/lib/ddragon';
import { MatchRow } from './MatchRow';

interface Props {
  region: Platform;
  puuid: string;
  version: string;
  initialMatches: Match[];
  initialQueue?: string; // value from QUEUE_FILTER_OPTIONS, e.g. 'all', 'aram'
}

const PAGE_SIZE = 10;

function readQueueFromParams(
  params: URLSearchParams | null,
  fallback: string
): string {
  const v = params?.get('queue');
  if (!v) return fallback;
  // Validate against known options to avoid junk values
  const known = QUEUE_FILTER_OPTIONS.some((o) => o.value === v);
  return known ? v : fallback;
}

export function MatchList({
  region,
  puuid,
  version,
  initialMatches,
  initialQueue = 'all',
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from URL ?queue= so deep links / refreshes preserve filter
  const [queue, setQueue] = useState<string>(() =>
    readQueueFromParams(searchParams, initialQueue)
  );
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialMatches.length >= PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);

  // Track whether the on-screen list still represents the initial server data.
  // We need this to know when to skip the first refetch on mount.
  const showingInitialServerData = useRef(true);

  const loadPage = useCallback(
    async (nextQueue: string, start: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const qs = new URLSearchParams({
          region,
          puuid,
          start: String(start),
          count: String(PAGE_SIZE),
        });
        if (nextQueue !== 'all') qs.set('queue', nextQueue);

        const res = await fetch(`/api/matches?${qs}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const list: Match[] = data.matches ?? [];
        setMatches((prev) => (append ? [...prev, ...list] : list));
        setHasMore(list.length >= PAGE_SIZE);
        showingInitialServerData.current = false;
      } catch (e: any) {
        setError(e.message || 'Failed to load matches');
        if (!append) setMatches([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [region, puuid]
  );

  // Sync URL ?queue= param without a navigation (no scroll, no reload)
  const syncUrl = useCallback(
    (nextQueue: string) => {
      const newParams = new URLSearchParams(searchParams?.toString() ?? '');
      if (nextQueue === 'all') newParams.delete('queue');
      else newParams.set('queue', nextQueue);
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Refetch whenever the user changes queue.
  // Skip the initial mount if the queue equals the initial queue AND we still
  // have the server-rendered data on screen.
  useEffect(() => {
    if (showingInitialServerData.current && queue === initialQueue) return;
    loadPage(queue, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  function onQueueChange(v: string) {
    setQueue(v);
    syncUrl(v);
  }

  function onLoadMore() {
    if (loadingMore || !hasMore) return;
    loadPage(queue, matches.length, true);
  }

  const queueLabel =
    QUEUE_FILTER_OPTIONS.find((o) => o.value === queue)?.label ?? 'this queue';

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <h2 className="text-lg font-semibold">Match History</h2>
        <select
          value={queue}
          onChange={(e) => onQueueChange(e.target.value)}
          className="ml-auto bg-panel border border-line rounded-md px-3 py-1.5 text-xs focus:border-accent focus:outline-none cursor-pointer"
          aria-label="Filter by queue"
        >
          {QUEUE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-panel/50 border border-line animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-panel border border-loss/40 rounded-lg p-6 text-center text-sm text-gray-400">
          {error}
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-panel border border-line rounded-lg p-6 text-center text-gray-500 text-sm">
          {queue === 'all'
            ? 'No matches found.'
            : `No ${queueLabel} matches in the last 6 months.`}
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <MatchRow
              key={m.metadata.matchId}
              match={m}
              puuid={puuid}
              version={version}
            />
          ))}
        </div>
      )}

      {hasMore && !loading && matches.length > 0 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="bg-panel border border-line hover:border-accent hover:text-accent text-sm px-6 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
