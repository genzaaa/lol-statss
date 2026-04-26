'use client';

import { useState } from 'react';
import type { Match, MatchParticipant } from '@/lib/riot';
import {
  champIconUrl,
  itemIconUrl,
  summonerSpellIconUrl,
  queueName,
} from '@/lib/ddragon';
import { formatDuration, timeAgo, kda } from '@/lib/format';
import { computeBadges, BADGE_TONE_CLASSES } from '@/lib/badges';
import { MatchDetail } from './MatchDetail';

export function MatchRow({
  match,
  puuid,
  version,
}: {
  match: Match;
  puuid: string;
  version: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const me = match.info.participants.find((p) => p.puuid === puuid);
  if (!me) return null;

  const win = me.win;
  const team1 = match.info.participants.filter((p) => p.teamId === 100);
  const team2 = match.info.participants.filter((p) => p.teamId === 200);
  const csTotal = me.totalMinionsKilled + me.neutralMinionsKilled;
  const csPerMin = (csTotal / (match.info.gameDuration / 60)).toFixed(1);
  const items = [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5];
  const ward = me.item6;
  const badges = computeBadges(match, puuid);

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-colors ${
        win ? 'bg-win/5 border-win/30' : 'bg-loss/5 border-loss/30'
      }`}
    >
      <div className="flex">
        {/* Left accent bar */}
        <div className={`w-1 flex-shrink-0 ${win ? 'bg-win' : 'bg-loss'}`} />

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 p-3 flex flex-col md:flex-row md:items-center gap-3 text-left hover:bg-white/5 transition-colors"
          aria-expanded={expanded}
        >
          {/* Game meta */}
          <div className="md:w-24 flex md:flex-col justify-between md:justify-center gap-1">
            <p className="text-xs font-semibold text-gray-300">
              {queueName(match.info.queueId)}
            </p>
            <p className="text-xs text-gray-500">{timeAgo(match.info.gameCreation)}</p>
            <div className="h-px bg-line hidden md:block my-1" />
            <p className={`text-xs font-bold ${win ? 'text-win' : 'text-loss'}`}>
              {win ? 'Victory' : 'Defeat'}
            </p>
            <p className="text-xs text-gray-500">
              {formatDuration(match.info.gameDuration)}
            </p>
          </div>

          {/* Champion + spells */}
          <div className="flex items-center gap-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={champIconUrl(version, me.championName)}
                alt={me.championName}
                className="w-14 h-14 rounded-md"
              />
              <span className="absolute -bottom-1 -right-1 bg-ink/90 text-[10px] px-1 rounded">
                {me.champLevel}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={summonerSpellIconUrl(me.summoner1Id)}
                alt=""
                className="w-6 h-6 rounded bg-panel2"
                onError={(e) =>
                  ((e.currentTarget as HTMLImageElement).style.opacity = '0')
                }
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={summonerSpellIconUrl(me.summoner2Id)}
                alt=""
                className="w-6 h-6 rounded bg-panel2"
                onError={(e) =>
                  ((e.currentTarget as HTMLImageElement).style.opacity = '0')
                }
              />
            </div>
          </div>

          {/* KDA block */}
          <div className="md:w-28">
            <p className="text-base font-semibold">
              {me.kills} <span className="text-gray-600">/</span>{' '}
              <span className="text-loss">{me.deaths}</span>{' '}
              <span className="text-gray-600">/</span> {me.assists}
            </p>
            <p className="text-xs text-gray-400">
              {kda(me.kills, me.deaths, me.assists)} KDA
            </p>
            <p className="text-xs text-gray-500">
              {csTotal} CS ({csPerMin}/m)
            </p>
          </div>

          {/* Items */}
          <div className="flex gap-1">
            {items.map((id, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded bg-panel2 border border-line overflow-hidden"
              >
                {id ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={itemIconUrl(version, id)} alt="" className="w-full h-full" />
                ) : null}
              </div>
            ))}
            <div className="w-7 h-7 rounded-full bg-panel2 border border-line overflow-hidden">
              {ward ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={itemIconUrl(version, ward)} alt="" className="w-full h-full" />
              ) : null}
            </div>
          </div>

          {/* Badges (centered column, wrapping) */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 md:max-w-[220px]">
              {badges.slice(0, 4).map((b) => (
                <span
                  key={b.id}
                  title={b.tooltip}
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border ${BADGE_TONE_CLASSES[b.tone]}`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Teams */}
          <div className="hidden lg:grid grid-cols-2 gap-x-3 gap-y-0.5 ml-auto text-xs">
            {[team1, team2].map((team, ti) => (
              <div key={ti} className="flex flex-col gap-0.5">
                {team.map((p) => (
                  <TeamMember
                    key={p.puuid}
                    p={p}
                    version={version}
                    highlight={p.puuid === puuid}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Expand caret */}
          <div className="ml-auto md:ml-2 text-gray-400 text-xs select-none">
            <span
              className={`inline-block transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              ▼
            </span>
          </div>
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-line">
          <MatchDetail match={match} puuid={puuid} version={version} />
        </div>
      )}
    </div>
  );
}

function TeamMember({
  p,
  version,
  highlight,
}: {
  p: MatchParticipant;
  version: string;
  highlight: boolean;
}) {
  const name = p.riotIdGameName || p.summonerName || 'Unknown';
  return (
    <div className="flex items-center gap-1.5 truncate">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={champIconUrl(version, p.championName)}
        alt={p.championName}
        className="w-4 h-4 rounded-sm"
      />
      <span
        className={`truncate ${highlight ? 'text-accent font-semibold' : 'text-gray-400'}`}
      >
        {name}
      </span>
    </div>
  );
}
