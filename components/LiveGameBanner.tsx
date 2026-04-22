'use client';

import { useEffect, useState } from 'react';
import type { CurrentGame } from '@/lib/riot';
import type { Platform } from '@/lib/regions';
import {
  champIconUrl,
  summonerSpellIconUrl,
  queueName,
  getChampionMap,
} from '@/lib/ddragon';
import { formatDuration, tierColor } from '@/lib/format';

interface ScoutMap {
  [puuid: string]: {
    tier?: string;
    rank?: string;
    lp?: number;
    recentWins?: number;
    recentLosses?: number;
    hotStreak?: boolean;
    topChampion?: string;
  };
}

export function LiveGameBanner({
  game,
  puuid,
  region,
  version,
}: {
  game: CurrentGame;
  puuid: string;
  region: Platform;
  version: string;
}) {
  const [champMap, setChampMap] = useState<Record<number, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [scout, setScout] = useState<ScoutMap>({});
  const [scoutLoading, setScoutLoading] = useState(true);

  useEffect(() => {
    getChampionMap().then(setChampMap);
  }, []);

  useEffect(() => {
    function tick() {
      const start =
        game.gameStartTime > 0
          ? game.gameStartTime
          : Date.now() - game.gameLength * 1000;
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [game.gameStartTime, game.gameLength]);

  // Fetch rank + recent form for every participant in parallel via the
  // scout endpoint. Runs once per mount — a live game is short enough that
  // we don't need to refetch.
  useEffect(() => {
    let cancelled = false;
    setScoutLoading(true);

    const puuids = game.participants.map((p) => p.puuid);
    fetch('/api/scout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region, puuids }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) return;
        const map: ScoutMap = {};
        for (const r of data.results ?? []) {
          map[r.puuid] = r;
        }
        setScout(map);
      })
      .catch(() => {
        // silent — banner still renders fine without scout data
      })
      .finally(() => !cancelled && setScoutLoading(false));

    return () => {
      cancelled = true;
    };
  }, [region, game.participants]);

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
            <div className="space-y-2">
              {team.map((p) => {
                const s = scout[p.puuid];
                const isMe = p.puuid === puuid;
                const displayName = p.riotId || p.summonerName || 'Unknown';
                const recentGames =
                  (s?.recentWins ?? 0) + (s?.recentLosses ?? 0);
                const wr =
                  recentGames > 0
                    ? Math.round(((s?.recentWins ?? 0) / recentGames) * 100)
                    : null;

                return (
                  <div
                    key={p.puuid}
                    className={`flex items-center gap-2 text-sm ${
                      isMe ? 'bg-accent/10 rounded px-1 py-1' : ''
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        champMap[p.championId]
                          ? champIconUrl(version, champMap[p.championId])
                          : ''
                      }
                      alt=""
                      className="w-8 h-8 rounded bg-panel2 flex-shrink-0"
                    />
                    <div className="flex gap-0.5 flex-shrink-0">
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 truncate">
                        <span
                          className={`truncate ${
                            isMe ? 'text-accent font-semibold' : 'text-gray-200'
                          }`}
                        >
                          {displayName}
                        </span>
                        {s?.hotStreak && (
                          <span
                            title="Hot streak"
                            className="text-[10px]"
                            aria-label="Hot streak"
                          >
                            🔥
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        {s?.tier ? (
                          <span
                            className="font-semibold"
                            style={{ color: tierColor(s.tier) }}
                          >
                            {s.tier.slice(0, 1)}
                            {s.rank ? ` ${s.rank}` : ''}
                            {typeof s.lp === 'number' ? ` · ${s.lp} LP` : ''}
                          </span>
                        ) : scoutLoading ? (
                          <span className="text-gray-600">…</span>
                        ) : (
                          <span className="text-gray-600">Unranked</span>
                        )}
                        {recentGames > 0 && (
                          <span className="text-gray-500">
                            <span className="text-win">{s!.recentWins}</span>
                            <span className="text-gray-600">/</span>
                            <span className="text-loss">{s!.recentLosses}</span>
                            {wr !== null && (
                              <span
                                className={`ml-1 ${
                                  wr >= 55
                                    ? 'text-win'
                                    : wr >= 50
                                    ? 'text-accent'
                                    : 'text-gray-500'
                                }`}
                              >
                                ({wr}%)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
