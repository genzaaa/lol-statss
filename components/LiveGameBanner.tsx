'use client';

import { useEffect, useState } from 'react';
import type { CurrentGame } from '@/lib/riot';
import { champIconUrl, summonerSpellIconUrl, queueName, getChampionMap } from '@/lib/ddragon';
import { formatDuration } from '@/lib/format';

export function LiveGameBanner({
  game,
  puuid,
  version,
}: {
  game: CurrentGame;
  puuid: string;
  version: string;
}) {
  const [champMap, setChampMap] = useState<Record<number, string>>({});
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    getChampionMap().then(setChampMap);
  }, []);

  useEffect(() => {
    // gameStartTime is in ms. If 0, game just started.
    function tick() {
      const start = game.gameStartTime > 0 ? game.gameStartTime : Date.now() - game.gameLength * 1000;
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [game.gameStartTime, game.gameLength]);

  const team1 = game.participants.filter((p) => p.teamId === 100);
  const team2 = game.participants.filter((p) => p.teamId === 200);

  return (
    <div className="bg-gradient-to-r from-win/10 to-accent/10 border border-win/40 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-win opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-win" />
          </span>
          <h2 className="font-semibold">Live Game</h2>
          <span className="text-xs text-gray-400">· {queueName(game.queueConfigId)}</span>
        </div>
        <p className="text-sm text-gray-400 font-mono">{formatDuration(elapsed)}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {[
          { team: team1, label: 'Blue Side', color: 'text-blue-400' },
          { team: team2, label: 'Red Side', color: 'text-red-400' },
        ].map(({ team, label, color }, i) => (
          <div key={i} className="bg-panel/60 rounded-md p-3">
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${color}`}>
              {label}
            </p>
            <div className="space-y-1.5">
              {team.map((p) => (
                <div
                  key={p.puuid}
                  className={`flex items-center gap-2 text-sm ${
                    p.puuid === puuid ? 'bg-accent/10 rounded px-1' : ''
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={champMap[p.championId] ? champIconUrl(version, champMap[p.championId]) : ''}
                    alt=""
                    className="w-8 h-8 rounded bg-panel2"
                  />
                  <div className="flex gap-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={summonerSpellIconUrl(p.spell1Id)}
                      alt=""
                      className="w-4 h-4 rounded bg-panel2"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={summonerSpellIconUrl(p.spell2Id)}
                      alt=""
                      className="w-4 h-4 rounded bg-panel2"
                    />
                  </div>
                  <span
                    className={`truncate ${
                      p.puuid === puuid ? 'text-accent font-semibold' : 'text-gray-300'
                    }`}
                  >
                    {p.riotId || p.summonerName || 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
