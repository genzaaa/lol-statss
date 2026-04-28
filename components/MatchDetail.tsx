'use client';

import { useEffect, useState } from 'react';
import type { Match, MatchParticipant, Platform } from '@/lib/riot';
import {
  champIconUrl,
  itemIconUrl,
  summonerSpellIconUrl,
  runeIconUrl,
  roleLabel,
} from '@/lib/ddragon';
import { kda } from '@/lib/format';
import { MatchTimeline } from './MatchTimeline';

// Extract the Platform from the match ID prefix.
// Match IDs look like "EUW1_1234567890" or "KR_1234567890".
function platformFromMatchId(matchId: string): Platform | null {
  const prefix = matchId.split('_')[0]?.toLowerCase();
  if (!prefix) return null;
  // Must match one of the keys of PLATFORM_HOSTS
  const known: Platform[] = [
    'br1', 'eun1', 'euw1', 'jp1', 'kr', 'la1', 'la2',
    'na1', 'oc1', 'tr1', 'ru',
  ];
  if ((known as string[]).includes(prefix)) return prefix as Platform;
  return null;
}

export function MatchDetail({
  match,
  puuid,
  version,
}: {
  match: Match;
  puuid: string;
  version: string;
}) {
  const [showTimeline, setShowTimeline] = useState(false);
  const region = platformFromMatchId(match.metadata.matchId);

  const blue = match.info.participants.filter((p) => p.teamId === 100);
  const red = match.info.participants.filter((p) => p.teamId === 200);
  const blueTeam = match.info.teams?.find((t) => t.teamId === 100);
  const redTeam = match.info.teams?.find((t) => t.teamId === 200);

  // Max damage for bar scaling — across both teams for apples-to-apples
  const maxDmg = Math.max(
    1,
    ...match.info.participants.map((p) => p.totalDamageDealtToChampions ?? 0)
  );
  const maxTaken = Math.max(
    1,
    ...match.info.participants.map((p) => p.totalDamageTaken ?? 0)
  );

  return (
    <div className="bg-panel2/40 p-3 md:p-4 space-y-4">
      {/* Objectives strip */}
      {(blueTeam || redTeam) && (
        <div className="grid md:grid-cols-2 gap-3">
          <TeamObjectives team={blueTeam} label="Blue side" side="blue" />
          <TeamObjectives team={redTeam} label="Red side" side="red" />
        </div>
      )}

      {/* Team tables */}
      <div className="space-y-3">
        <TeamTable
          team={blue}
          version={version}
          puuid={puuid}
          maxDmg={maxDmg}
          maxTaken={maxTaken}
          label="Blue side"
          side="blue"
          won={blueTeam?.win ?? blue[0]?.win ?? false}
        />
        <TeamTable
          team={red}
          version={version}
          puuid={puuid}
          maxDmg={maxDmg}
          maxTaken={maxTaken}
          label="Red side"
          side="red"
          won={redTeam?.win ?? red[0]?.win ?? false}
        />
      </div>

      {/* Bans */}
      {(blueTeam?.bans?.length || redTeam?.bans?.length) && (
        <BansRow blue={blueTeam?.bans ?? []} red={redTeam?.bans ?? []} />
      )}

      {/* Match timeline — lazy-loaded on demand. We only show the toggle if
          we could determine the region from the match ID, since the timeline
          API needs it. */}
      {region && (
        <div>
          {!showTimeline ? (
            <button
              type="button"
              onClick={() => setShowTimeline(true)}
              className="w-full text-xs text-gray-400 hover:text-accent border border-line hover:border-accent rounded-md py-2 transition-colors"
            >
              Show match timeline →
            </button>
          ) : (
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-gray-400">
                  Match timeline
                </p>
                <button
                  type="button"
                  onClick={() => setShowTimeline(false)}
                  className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Hide
                </button>
              </div>
              <MatchTimeline
                region={region}
                matchId={match.metadata.matchId}
                match={match}
                version={version}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Team Objectives ----------------

function TeamObjectives({
  team,
  label,
  side,
}: {
  team?: Match['info']['teams'] extends Array<infer U> | undefined ? U : never;
  label: string;
  side: 'blue' | 'red';
}) {
  if (!team) return null;
  const obj = team.objectives ?? {};
  const items: Array<{ label: string; val: number; icon: string }> = [
    { label: 'Kills', val: obj.champion?.kills ?? 0, icon: '⚔️' },
    { label: 'Towers', val: obj.tower?.kills ?? 0, icon: '🏰' },
    { label: 'Inhibs', val: obj.inhibitor?.kills ?? 0, icon: '🛡️' },
    { label: 'Barons', val: obj.baron?.kills ?? 0, icon: '🐲' },
    { label: 'Dragons', val: obj.dragon?.kills ?? 0, icon: '🔥' },
    { label: 'Heralds', val: obj.riftHerald?.kills ?? 0, icon: '👁️' },
    { label: 'Grubs', val: obj.horde?.kills ?? 0, icon: '🪱' },
  ];
  const sideColor = side === 'blue' ? 'text-blue-300' : 'text-red-300';

  return (
    <div className="bg-panel/60 rounded-md p-3">
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${sideColor}`}>
        {label} {team.win ? <span className="text-win">· Victory</span> : <span className="text-loss">· Defeat</span>}
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-1">
            <span className="text-gray-500" aria-hidden="true">{i.icon}</span>
            <span className="text-gray-400">{i.label}</span>
            <span className="font-semibold text-gray-200">{i.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Per-team participant table ----------------

function TeamTable({
  team,
  version,
  puuid,
  maxDmg,
  maxTaken,
  label,
  side,
  won,
}: {
  team: MatchParticipant[];
  version: string;
  puuid: string;
  maxDmg: number;
  maxTaken: number;
  label: string;
  side: 'blue' | 'red';
  won: boolean;
}) {
  const sideColor = side === 'blue' ? 'text-blue-300' : 'text-red-300';
  return (
    <div className="bg-panel/60 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line">
        <p className={`text-xs font-semibold uppercase tracking-wider ${sideColor}`}>
          {label}
        </p>
        <p className={`text-xs font-bold ${won ? 'text-win' : 'text-loss'}`}>
          {won ? 'Victory' : 'Defeat'}
        </p>
      </div>

      {/* Header row (hidden on mobile) */}
      <div className="hidden md:grid grid-cols-[minmax(0,1.6fr)_72px_64px_minmax(0,1fr)_minmax(0,1fr)_56px_170px] gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-b border-line">
        <div>Player</div>
        <div className="text-center">KDA</div>
        <div className="text-center">CS</div>
        <div>Damage dealt</div>
        <div>Damage taken</div>
        <div className="text-center">Vision</div>
        <div>Items</div>
      </div>

      <div className="divide-y divide-line/60">
        {team.map((p) => (
          <PlayerRow
            key={p.puuid}
            p={p}
            version={version}
            highlight={p.puuid === puuid}
            maxDmg={maxDmg}
            maxTaken={maxTaken}
          />
        ))}
      </div>
    </div>
  );
}

function PlayerRow({
  p,
  version,
  highlight,
  maxDmg,
  maxTaken,
}: {
  p: MatchParticipant;
  version: string;
  highlight: boolean;
  maxDmg: number;
  maxTaken: number;
}) {
  const dmg = p.totalDamageDealtToChampions ?? 0;
  const taken = p.totalDamageTaken ?? 0;
  const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
  const name = p.riotIdGameName || p.summonerName || 'Unknown';
  const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5];
  const ward = p.item6;
  const role = roleLabel(p.teamPosition || p.individualPosition);
  const primaryStyleId = p.perks?.styles?.[0]?.style;
  const keystoneId = p.perks?.styles?.[0]?.selections?.[0]?.perk;
  const subStyleId = p.perks?.styles?.[1]?.style;

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_72px_64px_minmax(0,1fr)_minmax(0,1fr)_56px_170px] gap-2 px-3 py-2 items-center text-xs ${
        highlight ? 'bg-accent/10' : ''
      }`}
    >
      {/* Player + champion + runes */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={champIconUrl(version, p.championName)}
            alt={p.championName}
            className="w-9 h-9 rounded-md"
          />
          <span className="absolute -bottom-1 -right-1 bg-ink/90 text-[9px] px-1 rounded">
            {p.champLevel}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={summonerSpellIconUrl(p.summoner1Id)}
            alt=""
            className="w-4 h-4 rounded bg-panel2"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = '0')}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={summonerSpellIconUrl(p.summoner2Id)}
            alt=""
            className="w-4 h-4 rounded bg-panel2"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = '0')}
          />
        </div>
        {(keystoneId || primaryStyleId) && (
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <RuneIcon runeId={keystoneId ?? primaryStyleId ?? 0} size={16} />
            <RuneIcon runeId={subStyleId ?? 0} size={16} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className={`truncate ${
              highlight ? 'text-accent font-semibold' : 'text-gray-200'
            }`}
          >
            {name}
          </p>
          {role && <p className="text-[10px] text-gray-500">{role}</p>}
        </div>
      </div>

      {/* KDA */}
      <div className="text-center">
        <p className="font-semibold text-gray-200">
          {p.kills}/{p.deaths}/{p.assists}
        </p>
        <p className="text-[10px] text-gray-500">{kda(p.kills, p.deaths, p.assists)}</p>
      </div>

      {/* CS */}
      <div className="text-center text-gray-300">{cs}</div>

      {/* Damage dealt bar */}
      <div>
        <p className="text-[10px] text-gray-400 mb-0.5">{dmg.toLocaleString()}</p>
        <div className="h-1.5 bg-panel2 rounded overflow-hidden">
          <div
            className="h-full bg-loss/70"
            style={{ width: `${Math.min(100, (dmg / maxDmg) * 100)}%` }}
          />
        </div>
      </div>

      {/* Damage taken bar */}
      <div>
        <p className="text-[10px] text-gray-400 mb-0.5">{taken.toLocaleString()}</p>
        <div className="h-1.5 bg-panel2 rounded overflow-hidden">
          <div
            className="h-full bg-blue-400/70"
            style={{ width: `${Math.min(100, (taken / maxTaken) * 100)}%` }}
          />
        </div>
      </div>

      {/* Vision */}
      <div className="text-center text-gray-300">{p.visionScore ?? 0}</div>

      {/* Items */}
      <div className="flex gap-1">
        {items.map((id, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded bg-panel2 border border-line overflow-hidden flex-shrink-0"
          >
            {id ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={itemIconUrl(version, id)} alt="" className="w-full h-full" />
            ) : null}
          </div>
        ))}
        <div className="w-5 h-5 rounded-full bg-panel2 border border-line overflow-hidden flex-shrink-0">
          {ward ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={itemIconUrl(version, ward)} alt="" className="w-full h-full" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------- Runes ----------------

function RuneIcon({ runeId, size }: { runeId: number; size: number }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    let alive = true;
    if (!runeId) return;
    runeIconUrl(runeId).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [runeId]);
  if (!runeId) return null;
  return (
    <div
      className="rounded bg-panel2 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={url} alt="" className="w-full h-full" />
      ) : null}
    </div>
  );
}

// ---------------- Bans ----------------

function BansRow({
  blue,
  red,
}: {
  blue: Array<{ championId: number; pickTurn: number }>;
  red: Array<{ championId: number; pickTurn: number }>;
}) {
  const [championMap, setChampionMap] = useState<Record<number, string>>({});
  useEffect(() => {
    import('@/lib/ddragon').then(({ getChampionMap }) =>
      getChampionMap().then(setChampionMap)
    );
  }, []);

  const Side = ({
    bans,
    label,
    color,
  }: {
    bans: Array<{ championId: number; pickTurn: number }>;
    label: string;
    color: string;
  }) => {
    if (!bans.length) return null;
    return (
      <div className="flex items-center gap-2">
        <span className={`text-[10px] uppercase tracking-wider font-semibold ${color}`}>
          {label} bans
        </span>
        <div className="flex gap-1">
          {bans
            .filter((b) => b.championId > 0)
            .map((b) => {
              const name = championMap[b.championId];
              return (
                <div
                  key={b.pickTurn}
                  className="w-6 h-6 rounded bg-panel2 border border-line overflow-hidden"
                  title={name || undefined}
                >
                  {name ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/15.8.1/img/champion/${name}.png`}
                      alt={name}
                      className="w-full h-full grayscale opacity-80"
                    />
                  ) : null}
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 px-1">
      <Side bans={blue} label="Blue" color="text-blue-300" />
      <Side bans={red} label="Red" color="text-red-300" />
    </div>
  );
}
