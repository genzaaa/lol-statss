'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Match } from '@/lib/riot';
import type { Platform } from '@/lib/regions';
import { QUEUE_FILTER_OPTIONS } from '@/lib/ddragon';
import { MatchRow } from './MatchRow';

interface Props {
  region: Platform;
  puuid: string;
  version: string;
  initialMatches: Match[];
  initialQueue?: number | 'all';
}

const PAGE_SIZE = 10;

export function MatchList({
  region,
  puuid,
  version,
  initialMatches,
  initialQueue = 'all',
}: Props) {
  const [queue, setQueue] = useState<number | 'all'>(initialQueue);
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialMatches.length >= PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);

  // When queue changes, reset list and refetch from start
  const loadPage = useCallback(
    async (nextQueue: number | 'all', start: number, append: boolean) => {
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
        if (nextQueue !== 'all') qs.set('queue', String(nextQueue));

        const res = await fetch(`/api/matches?${qs}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const list: Match[] = data.matches ?? [];
        setMatches((prev) => (append ? [...prev, ...list] : list));
        setHasMore(list.length >= PAGE_SIZE);
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

  useEffect(() => {
    // Only refetch when the user actually changes queue (skip the first mount
    // since we already received initialMatches from the server).
    if (queue === initialQueue) return;
    loadPage(queue, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue]);

  function onLoadMore() {
    if (loadingMore || !hasMore) return;
    loadPage(queue, matches.length, true);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <h2 className="text-lg font-semibold">Match History</h2>
        <select
          value={String(queue)}
          onChange={(e) => {
            const v = e.target.value;
            setQueue(v === 'all' ? 'all' : parseInt(v, 10));
          }}
          className="ml-auto bg-panel border border-line rounded-md px-3 py-1.5 text-xs focus:border-accent focus:outline-none cursor-pointer"
          aria-label="Filter by queue"
        >
          {QUEUE_FILTER_OPTIONS.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-panel/50 border border-line animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-panel border border-loss/40 rounded-lg p-6 text-center text-sm text-gray-400">
          {error}
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-panel border border-line rounded-lg p-6 text-center text-gray-500 text-sm">
          No matches found for this queue.
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
