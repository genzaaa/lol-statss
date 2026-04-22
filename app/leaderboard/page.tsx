'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PLATFORM_LABELS, type Platform } from '@/lib/riot';
import { tierIconUrl, winrate } from '@/lib/format';

const REGIONS = Object.keys(PLATFORM_LABELS) as Platform[];
const QUEUES = [
  { id: 'RANKED_SOLO_5x5', label: 'Solo/Duo' },
  { id: 'RANKED_FLEX_SR', label: 'Flex' },
];

interface Entry {
  summonerId?: string;
  puuid?: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  rank: string;
  hotStreak: boolean;
}

export default function LeaderboardPage() {
  const [region, setRegion] = useState<Platform>('euw1');
  const [queue, setQueue] = useState('RANKED_SOLO_5x5');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/leaderboard?region=${region}&queue=${queue}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setEntries([]);
        } else {
          setEntries(data.league.entries);
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [region, queue]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">
          <span className="text-accent">Challenger</span> Leaderboard
        </h1>
        <p className="text-gray-400 text-sm">Top 50 ranked players in the region</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as Platform)}
          className="bg-panel border border-line rounded-md px-3 py-2 text-sm focus:border-accent focus:outline-none cursor-pointer"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {PLATFORM_LABELS[r]}
            </option>
          ))}
        </select>
        <div className="flex bg-panel border border-line rounded-md overflow-hidden">
          {QUEUES.map((q) => (
            <button
              key={q.id}
              onClick={() => setQueue(q.id)}
              className={`px-4 py-2 text-sm transition-colors ${
                queue === q.id
                  ? 'bg-accent text-ink font-semibold'
                  : 'hover:bg-panel2'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-panel border border-line rounded-lg p-8 text-center text-gray-500">
          Loading leaderboard…
        </div>
      ) : error ? (
        <div className="bg-panel border border-loss/40 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-lg overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] md:grid-cols-[60px_1fr_100px_120px_80px] gap-3 px-4 py-2 text-xs uppercase tracking-wider text-gray-500 border-b border-line">
            <span>#</span>
            <span>Summoner</span>
            <span className="text-right">LP</span>
            <span className="text-right hidden md:block">W / L</span>
            <span className="text-right">WR</span>
          </div>
          {entries.map((e, i) => {
            const wr = winrate(e.wins, e.losses);
            const id = e.summonerId || e.puuid || '';
            const displayId = id ? `${id.slice(0, 8)}…` : `Player #${i + 1}`;
            return (
              <div
                key={id || i}
                className="grid grid-cols-[auto_1fr_auto_auto_auto] md:grid-cols-[60px_1fr_100px_120px_80px] gap-3 px-4 py-3 text-sm items-center border-b border-line/50 last:border-b-0 hover:bg-panel2/40 transition-colors"
              >
                <span
                  className={`font-bold ${
                    i === 0
                      ? 'text-yellow-400'
                      : i === 1
                      ? 'text-gray-300'
                      : i === 2
                      ? 'text-orange-400'
                      : 'text-gray-500'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tierIconUrl('CHALLENGER')}
                    alt=""
                    className="w-6 h-6"
                    onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.display = 'none')}
                  />
                  <span className="truncate font-medium">
                    {displayId}
                    {e.hotStreak && <span className="ml-1 text-orange-400">🔥</span>}
                  </span>
                </div>
                <span className="text-right font-mono text-accent">
                  {e.leaguePoints.toLocaleString()}
                </span>
                <span className="text-right text-xs text-gray-400 hidden md:block">
                  <span className="text-win">{e.wins}</span> /{' '}
                  <span className="text-loss">{e.losses}</span>
                </span>
                <span
                  className={`text-right text-xs font-semibold ${
                    wr >= 55 ? 'text-win' : wr >= 50 ? 'text-accent' : 'text-gray-400'
                  }`}
                >
                  {wr}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        Note: Riot's leaderboard endpoint returns summoner IDs only. Full player names require
        additional lookups per player (rate-limited).{' '}
        <Link href="/" className="text-accent hover:underline">
          Search a specific player →
        </Link>
      </p>
    </div>
  );
}
