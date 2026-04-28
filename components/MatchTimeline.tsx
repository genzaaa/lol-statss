'use client';

import { useEffect, useState } from 'react';
import type { Match, MatchParticipant, Platform } from '@/lib/riot';
import { champIconUrl } from '@/lib/ddragon';
import type { ReducedTimeline } from '@/app/api/match-timeline/route';

interface Props {
  region: Platform;
  matchId: string;
  match: Match;
  version: string;
}

export function MatchTimeline({ region, matchId, match, version }: Props) {
  const [data, setData] = useState<ReducedTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/match-timeline?region=${encodeURIComponent(
      region
    )}&matchId=${encodeURIComponent(matchId)}`;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ReducedTimeline;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load timeline');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [region, matchId]);

  if (loading) {
    return (
      <div className="bg-panel border border-line rounded-md p-4 text-sm text-gray-400">
        Loading timeline…
      </div>
    );
  }
  if (error) {
    // 429 = Riot rate-limited us. After deploying the KV cache this should
    // be rare, but surface a user-friendly hint when it does happen.
    const isRateLimit = /429/.test(error);
    return (
      <div className="bg-panel border border-line rounded-md p-4 text-sm">
        <p className={isRateLimit ? 'text-yellow-300' : 'text-loss'}>
          {isRateLimit
            ? 'Hit our API rate limit. Try again in a few seconds.'
            : `Couldn't load timeline: ${error}`}
        </p>
        {isRateLimit && (
          <p className="text-[11px] text-gray-500 mt-1">
            Riot dev keys allow ~100 requests / 2 min. Cached timelines load instantly the next time.
          </p>
        )}
      </div>
    );
  }
  if (!data || data.frames.length === 0) {
    return (
      <div className="bg-panel border border-line rounded-md p-4 text-sm text-gray-500">
        No timeline data available for this match.
      </div>
    );
  }

  // Merge in champion IDs from the match data so the kill-participation chart
  // can show champion icons.
  const participantsWithChamps = data.participants.map((p) => {
    const matchP = match.info.participants[p.participantId - 1];
    return {
      ...p,
      championName: matchP?.championName ?? 'Unknown',
      summonerName: matchP?.riotIdGameName ?? matchP?.summonerName ?? '?',
    };
  });

  return (
    <div className="space-y-4 mt-3">
      <GoldDiffChart frames={data.frames} events={data.events} />
      <ObjectivesBand events={data.events} durationSec={data.durationSec} />
      <KillParticipation
        participants={participantsWithChamps}
        version={version}
      />
    </div>
  );
}

// =================== Gold Differential Chart ===================
// SVG line chart of (blueGold - redGold) over time, with kill markers
// rendered as little dots along the X axis.

function GoldDiffChart({
  frames,
  events,
}: {
  frames: ReducedTimeline['frames'];
  events: ReducedTimeline['events'];
}) {
  // Chart dimensions — viewBox in arbitrary units, scales to container width
  const W = 800;
  const H = 200;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 30;
  const PAD_LEFT = 50;
  const PAD_RIGHT = 12;
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const maxMinute = frames[frames.length - 1]?.minute ?? 1;

  // Compute gold diff series and Y-axis scale
  const diffs = frames.map((f) => f.blueGold - f.redGold);
  const maxAbs = Math.max(1, ...diffs.map((d) => Math.abs(d)));
  // Round up to next nice multiple of 1000
  const yMax = Math.ceil(maxAbs / 1000) * 1000;

  function xAt(minute: number) {
    return PAD_LEFT + (minute / maxMinute) * innerW;
  }
  function yAt(diff: number) {
    // Center is 0; positive (blue ahead) = up, negative = down
    return PAD_TOP + innerH / 2 - (diff / yMax) * (innerH / 2);
  }

  // Build the line path
  const path = frames
    .map((f, i) => {
      const x = xAt(f.minute);
      const y = yAt(f.blueGold - f.redGold);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Area fill paths — split positive (blue lead) from negative (red lead)
  // for two-color shading
  const blueArea =
    `M${xAt(frames[0].minute)},${yAt(0)} ` +
    frames
      .map((f) => {
        const diff = Math.max(0, f.blueGold - f.redGold);
        return `L${xAt(f.minute).toFixed(1)},${yAt(diff).toFixed(1)}`;
      })
      .join(' ') +
    ` L${xAt(frames[frames.length - 1].minute)},${yAt(0)} Z`;

  const redArea =
    `M${xAt(frames[0].minute)},${yAt(0)} ` +
    frames
      .map((f) => {
        const diff = Math.min(0, f.blueGold - f.redGold);
        return `L${xAt(f.minute).toFixed(1)},${yAt(diff).toFixed(1)}`;
      })
      .join(' ') +
    ` L${xAt(frames[frames.length - 1].minute)},${yAt(0)} Z`;

  // X-axis tick marks every 5 minutes
  const xTicks: number[] = [];
  for (let m = 0; m <= maxMinute; m += 5) xTicks.push(m);

  return (
    <div className="bg-panel border border-line rounded-md p-4">
      <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
        Gold differential
        <span className="text-gray-600 font-normal ml-2">
          blue lead → top, red lead → bottom
        </span>
      </h4>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
        style={{ maxHeight: 220 }}
      >
        {/* Grid: zero line */}
        <line
          x1={PAD_LEFT}
          x2={W - PAD_RIGHT}
          y1={yAt(0)}
          y2={yAt(0)}
          stroke="rgb(75 85 99)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        {/* Y-axis labels */}
        <text
          x={PAD_LEFT - 6}
          y={yAt(yMax) + 4}
          textAnchor="end"
          fill="rgb(96 165 250)"
          fontSize="10"
        >
          +{(yMax / 1000).toFixed(0)}k
        </text>
        <text
          x={PAD_LEFT - 6}
          y={yAt(0) + 4}
          textAnchor="end"
          fill="rgb(156 163 175)"
          fontSize="10"
        >
          0
        </text>
        <text
          x={PAD_LEFT - 6}
          y={yAt(-yMax) + 4}
          textAnchor="end"
          fill="rgb(248 113 113)"
          fontSize="10"
        >
          −{(yMax / 1000).toFixed(0)}k
        </text>
        {/* X-axis tick labels */}
        {xTicks.map((m) => (
          <g key={m}>
            <line
              x1={xAt(m)}
              x2={xAt(m)}
              y1={H - PAD_BOTTOM}
              y2={H - PAD_BOTTOM + 3}
              stroke="rgb(75 85 99)"
              strokeWidth="1"
            />
            <text
              x={xAt(m)}
              y={H - PAD_BOTTOM + 14}
              textAnchor="middle"
              fill="rgb(107 114 128)"
              fontSize="10"
            >
              {m}m
            </text>
          </g>
        ))}
        {/* Area fills */}
        <path d={blueArea} fill="rgb(96 165 250)" fillOpacity="0.15" />
        <path d={redArea} fill="rgb(248 113 113)" fillOpacity="0.15" />
        {/* Line */}
        <path d={path} fill="none" stroke="rgb(229 231 235)" strokeWidth="1.5" />
        {/* Kill markers along the X axis */}
        {events
          .filter((e) => e.category === 'kill')
          .map((e, i) => (
            <circle
              key={i}
              cx={xAt(e.minute)}
              cy={H - PAD_BOTTOM - 4}
              r="2.5"
              fill={e.teamId === 100 ? 'rgb(96 165 250)' : 'rgb(248 113 113)'}
              opacity="0.7"
            >
              <title>
                Kill at {e.minute.toFixed(1)}m by{' '}
                {e.teamId === 100 ? 'Blue' : 'Red'}
              </title>
            </circle>
          ))}
      </svg>
    </div>
  );
}

// =================== Objectives Band ===================
// Horizontal lanes per objective category; markers placed at minute they fell.

function ObjectivesBand({
  events,
  durationSec,
}: {
  events: ReducedTimeline['events'];
  durationSec: number;
}) {
  const maxMin = Math.max(1, durationSec / 60);

  // Categories in display order (top to bottom)
  const cats: Array<{
    key: ReducedTimeline['events'][number]['category'];
    label: string;
    icon: string;
  }> = [
    { key: 'dragon', label: 'Dragon', icon: '🐉' },
    { key: 'herald', label: 'Herald', icon: '👁' },
    { key: 'baron', label: 'Baron', icon: '🐲' },
    { key: 'atakhan', label: 'Atakhan', icon: '☠' },
    { key: 'tower', label: 'Tower', icon: '🏰' },
    { key: 'inhibitor', label: 'Inhib', icon: '⛓' },
  ];

  const W = 800;
  const ROW_H = 24;
  const PAD_LEFT = 70;
  const PAD_RIGHT = 12;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 24;
  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const H = PAD_TOP + cats.length * ROW_H + PAD_BOTTOM;

  function xAt(minute: number) {
    return PAD_LEFT + (minute / maxMin) * innerW;
  }

  // Build per-category event lists
  const byCat = new Map<typeof cats[number]['key'], typeof events>();
  for (const c of cats) byCat.set(c.key, []);
  for (const e of events) {
    if (byCat.has(e.category)) byCat.get(e.category)!.push(e);
  }

  // X-axis ticks every 5 minutes
  const xTicks: number[] = [];
  for (let m = 0; m <= maxMin; m += 5) xTicks.push(m);

  return (
    <div className="bg-panel border border-line rounded-md p-4">
      <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
        Objectives timeline
      </h4>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
        style={{ maxHeight: H + 20 }}
      >
        {cats.map((c, i) => {
          const y = PAD_TOP + i * ROW_H + ROW_H / 2;
          const items = byCat.get(c.key) ?? [];
          return (
            <g key={c.key}>
              <text
                x={PAD_LEFT - 8}
                y={y + 4}
                textAnchor="end"
                fill="rgb(156 163 175)"
                fontSize="10"
              >
                {c.label}
              </text>
              <line
                x1={PAD_LEFT}
                x2={W - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="rgb(55 65 81)"
                strokeWidth="1"
              />
              {items.map((ev, k) => (
                <circle
                  key={k}
                  cx={xAt(ev.minute)}
                  cy={y}
                  r="5"
                  fill={ev.teamId === 100 ? 'rgb(96 165 250)' : 'rgb(248 113 113)'}
                  stroke="rgb(17 24 39)"
                  strokeWidth="1.5"
                >
                  <title>
                    {c.label}
                    {ev.subtype ? ` (${formatSubtype(ev.subtype)})` : ''} at{' '}
                    {ev.minute.toFixed(1)}m —{' '}
                    {ev.teamId === 100 ? 'Blue' : ev.teamId === 200 ? 'Red' : '?'}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
        {/* X-axis tick labels at the bottom */}
        {xTicks.map((m) => (
          <g key={m}>
            <line
              x1={xAt(m)}
              x2={xAt(m)}
              y1={H - PAD_BOTTOM}
              y2={H - PAD_BOTTOM + 3}
              stroke="rgb(55 65 81)"
              strokeWidth="1"
            />
            <text
              x={xAt(m)}
              y={H - PAD_BOTTOM + 14}
              textAnchor="middle"
              fill="rgb(107 114 128)"
              fontSize="10"
            >
              {m}m
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function formatSubtype(s: string): string {
  // Riot's monsterSubType for dragons: "FIRE_DRAGON", "EARTH_DRAGON", etc.
  // Tower laneType: "MID_LANE", "TOP_LANE", "BOT_LANE"
  return s.replace(/_/g, ' ').toLowerCase();
}

// =================== Kill Participation ===================
// Per-player K/D/A bars, separated by team.

function KillParticipation({
  participants,
  version,
}: {
  participants: Array<{
    participantId: number;
    teamId: number;
    championName: string;
    summonerName: string;
    kills: number;
    deaths: number;
    assists: number;
  }>;
  version: string;
}) {
  const blue = participants.filter((p) => p.teamId === 100);
  const red = participants.filter((p) => p.teamId === 200);

  // Scale bars to the highest single value across both teams
  const maxKDA = Math.max(
    1,
    ...participants.map((p) => p.kills + p.deaths + p.assists)
  );

  return (
    <div className="bg-panel border border-line rounded-md p-4">
      <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
        Kill participation
      </h4>
      <div className="grid md:grid-cols-2 gap-4">
        <PlayerKDAList players={blue} maxKDA={maxKDA} side="blue" version={version} />
        <PlayerKDAList players={red} maxKDA={maxKDA} side="red" version={version} />
      </div>
    </div>
  );
}

function PlayerKDAList({
  players,
  maxKDA,
  side,
  version,
}: {
  players: Array<{
    championName: string;
    summonerName: string;
    kills: number;
    deaths: number;
    assists: number;
  }>;
  maxKDA: number;
  side: 'blue' | 'red';
  version: string;
}) {
  return (
    <div>
      <p
        className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${
          side === 'blue' ? 'text-blue-400' : 'text-red-400'
        }`}
      >
        {side === 'blue' ? 'Blue side' : 'Red side'}
      </p>
      <div className="space-y-1.5">
        {players.map((p, i) => {
          const total = p.kills + p.deaths + p.assists;
          const pct = (total / maxKDA) * 100;
          const kPct = total > 0 ? (p.kills / total) * 100 : 0;
          const dPct = total > 0 ? (p.deaths / total) * 100 : 0;
          // assists fill the remainder
          return (
            <div key={i} className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={champIconUrl(version, p.championName)}
                alt={p.championName}
                className="w-6 h-6 rounded flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <p className="text-[11px] text-gray-300 truncate" title={p.summonerName}>
                    {p.summonerName}
                  </p>
                  <p className="text-[10px] font-mono text-gray-500 flex-shrink-0">
                    <span className="text-gray-100">{p.kills}</span>
                    /<span className="text-loss">{p.deaths}</span>
                    /<span className="text-gray-300">{p.assists}</span>
                  </p>
                </div>
                <div
                  className="h-1.5 rounded-full bg-panel2 overflow-hidden flex"
                  style={{ width: `${pct}%`, minWidth: 2 }}
                  title={`${p.kills}K / ${p.deaths}D / ${p.assists}A`}
                >
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${kPct}%` }}
                  />
                  <div
                    className="h-full bg-loss"
                    style={{ width: `${dPct}%` }}
                  />
                  <div className="h-full bg-gray-400 flex-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
