'use client';

import type { Match } from '@/lib/riot';
import { champIconUrl } from '@/lib/ddragon';
import { kda, winrate } from '@/lib/format';

// Aggregate the user's recent matches by champion and display a compact
// table. Pure client-side — no API calls, just reshapes data we already
// fetched server-side.
export function ChampionSummary({
  matches,
  puuid,
  version,
}: {
  matches: Match[];
  puuid: string;
  version: string;
}) {
  // Build per-champion stats
  type Stat = {
    championName: string;
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    durationSec: number;
  };
  const byChamp = new Map<string, Stat>();

  for (const m of matches) {
    const me = m.info.participants.find((p) => p.puuid === puuid);
    if (!me) continue;
    const key = me.championName;
    const s =
      byChamp.get(key) ??
      {
        championName: key,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        cs: 0,
        durationSec: 0,
      };
    s.games++;
    if (me.win) s.wins++;
    s.kills += me.kills;
    s.deaths += me.deaths;
    s.assists += me.assists;
    s.cs += me.totalMinionsKilled + me.neutralMinionsKilled;
    s.durationSec += m.info.gameDuration;
    byChamp.set(key, s);
  }

  // Sort by games played desc, then by winrate desc as tiebreaker
  const rows = Array.from(byChamp.values())
    .sort((a, b) => {
      if (b.games !== a.games) return b.games - a.games;
      return (b.wins / b.games) - (a.wins / a.games);
    })
    // Show the top 7 — any more gets noisy on a compact dashboard
    .slice(0, 7);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-semibold">Recent champions</h3>
        <p className="text-xs text-gray-500">
          Last {matches.length} game{matches.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="space-y-1">
        {rows.map((r) => {
          const wr = winrate(r.wins, r.games - r.wins);
          const csPerMin = (r.cs / (r.durationSec / 60)).toFixed(1);
          const kdaVal = kda(r.kills, r.deaths, r.assists);
          return (
            <div
              key={r.championName}
              className="grid grid-cols-[36px_minmax(0,1.4fr)_72px_minmax(0,1fr)_60px] gap-2 items-center py-1.5 text-sm hover:bg-panel2/40 rounded px-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={champIconUrl(version, r.championName)}
                alt={r.championName}
                className="w-9 h-9 rounded-md"
              />
              <p className="truncate font-medium text-gray-200" title={r.championName}>
                {r.championName}
              </p>
              <p className="text-xs text-gray-400">
                <span className="text-win">{r.wins}</span>
                <span className="text-gray-600"> / </span>
                <span className="text-loss">{r.games - r.wins}</span>
              </p>
              <p className="text-xs text-gray-400">
                <span className="font-mono">{kdaVal}</span>
                <span className="text-gray-600"> KDA · </span>
                <span>{csPerMin} cs/m</span>
              </p>
              <p
                className={`text-xs font-semibold text-right ${
                  wr >= 60 ? 'text-win' : wr >= 50 ? 'text-accent' : 'text-gray-500'
                }`}
              >
                {wr}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
