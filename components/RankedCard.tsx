'use client';

import type { LeagueEntry } from '@/lib/riot';
import { tierColor, tierIconUrl, winrate } from '@/lib/format';

export function RankedCard({ entry, label }: { entry?: LeagueEntry; label: string }) {
  if (!entry) {
    return (
      <div className="bg-panel border border-line rounded-lg p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-panel2 flex items-center justify-center text-gray-500">
            ?
          </div>
          <div>
            <p className="font-semibold text-gray-400">Unranked</p>
          </div>
        </div>
      </div>
    );
  }

  const color = tierColor(entry.tier);
  const wr = winrate(entry.wins, entry.losses);

  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tierIconUrl(entry.tier)}
          alt={entry.tier}
          className="w-14 h-14 object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="flex-1">
          <p className="font-semibold" style={{ color }}>
            {entry.tier} {entry.rank}
          </p>
          <p className="text-sm text-gray-400">{entry.leaguePoints} LP</p>
          <p className="text-xs text-gray-500 mt-1">
            {entry.wins}W {entry.losses}L ·{' '}
            <span className={wr >= 50 ? 'text-win' : 'text-loss'}>{wr}% WR</span>
          </p>
        </div>
      </div>
    </div>
  );
}
