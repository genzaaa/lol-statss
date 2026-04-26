'use client';

import { useEffect, useState } from 'react';
import { getChampionMap, champIconUrl } from '@/lib/ddragon';
import type { Platform } from '@/lib/regions';

interface Mastery {
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  chestGranted: boolean;
  tokensEarned: number;
}

// Color ramp by mastery level
function masteryColor(level: number): string {
  if (level >= 10) return '#f4c874'; // Challenger gold
  if (level >= 8) return '#9d48e0';  // Master purple
  if (level >= 7) return '#576bce';  // Diamond blue
  if (level >= 5) return '#2ec27e';  // Emerald green
  if (level >= 4) return '#cd8837';  // Gold bronze
  return '#8c5630';                  // Bronze
}

export function MasteryPanel({
  region,
  puuid,
  version,
}: {
  region: Platform;
  puuid: string;
  version: string;
}) {
  const [masteries, setMasteries] = useState<Mastery[] | null>(null);
  const [score, setScore] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [championMap, setChampionMap] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;

    getChampionMap().then((m) => !cancelled && setChampionMap(m));

    fetch(`/api/mastery?region=${region}&puuid=${puuid}&count=10`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
        } else {
          setMasteries(data.masteries ?? []);
          setScore(data.score ?? 0);
        }
      })
      .catch((e) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
    };
  }, [region, puuid]);

  if (error) {
    return (
      <div className="bg-panel border border-line rounded-lg p-4 text-sm text-gray-500">
        Could not load mastery data.
      </div>
    );
  }

  if (masteries === null) {
    return (
      <div className="bg-panel border border-line rounded-lg p-4 text-sm text-gray-500">
        Loading mastery…
      </div>
    );
  }

  if (masteries.length === 0) {
    return (
      <div className="bg-panel border border-line rounded-lg p-4 text-sm text-gray-500">
        No mastery data available.
      </div>
    );
  }

  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-semibold">Top champions</h3>
        {score > 0 && (
          <p className="text-xs text-gray-500">
            Total mastery score: <span className="text-accent font-semibold">{score}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {masteries.map((m) => {
          const name = championMap[m.championId] ?? '';
          return (
            <div
              key={m.championId}
              className="bg-panel2/50 border border-line rounded-md p-2 flex flex-col items-center gap-1.5"
            >
              <div className="relative">
                {name ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={champIconUrl(version, name)}
                    alt={name}
                    className="w-14 h-14 rounded-md border-2"
                    style={{ borderColor: masteryColor(m.championLevel) }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-panel2" />
                )}
                <span
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-ink"
                  style={{ background: masteryColor(m.championLevel) }}
                >
                  {m.championLevel}
                </span>
              </div>
              <p className="text-xs font-medium text-center truncate w-full" title={name}>
                {name || `Champ ${m.championId}`}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">
                {m.championPoints.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
