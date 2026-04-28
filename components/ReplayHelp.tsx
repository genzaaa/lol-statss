'use client';

import { useState } from 'react';
import type { Platform } from '@/lib/regions';

interface Props {
  region: Platform;
  matchId: string;
  /** This player's Riot ID — used to deep-link to OP.GG's match detail page */
  gameName: string;
  tagLine: string;
  /** Match end timestamp (epoch ms) — used to estimate if a replay still exists */
  gameEndTimestamp?: number;
}

// Replays auto-expire when League's patch version changes, which is
// roughly every 2 weeks. We use 14 days as a conservative estimate of
// "this replay might still exist."
const REPLAY_EXPIRY_DAYS = 14;

// Map our internal Platform → OP.GG's URL slug. OP.GG uses two-letter
// codes for some regions (na for na1, etc.) and full lowercase for
// others. This map matches what op.gg's URL routing actually accepts.
const OPGG_REGION: Record<Platform, string> = {
  na1: 'na',
  euw1: 'euw',
  eun1: 'eune',
  kr: 'kr',
  jp1: 'jp',
  br1: 'br',
  la1: 'lan',
  la2: 'las',
  oc1: 'oce',
  tr1: 'tr',
  ru: 'ru',
};

export function ReplayHelp({
  region,
  matchId,
  gameName,
  tagLine,
  gameEndTimestamp,
}: Props) {
  const [open, setOpen] = useState(false);

  const opggSlug = OPGG_REGION[region] ?? 'euw';
  const opggMatchUrl = `https://www.op.gg/lol/summoners/${opggSlug}/${encodeURIComponent(
    gameName
  )}-${encodeURIComponent(tagLine)}/matches/${encodeURIComponent(matchId)}`;
  const opggSummonerUrl = `https://www.op.gg/lol/summoners/${opggSlug}/${encodeURIComponent(
    gameName
  )}-${encodeURIComponent(tagLine)}`;

  // Best-effort age estimate. Replays expire on patch boundaries, not at
  // exactly 14 days, so this is just a hint.
  const ageDays = gameEndTimestamp
    ? Math.floor((Date.now() - gameEndTimestamp) / (1000 * 60 * 60 * 24))
    : null;
  const probablyExpired = ageDays !== null && ageDays > REPLAY_EXPIRY_DAYS;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-xs text-gray-400 hover:text-accent border border-line hover:border-accent rounded-md py-2 transition-colors"
      >
        How to watch the replay →
      </button>
    );
  }

  return (
    <div className="bg-panel border border-line rounded-md p-4 space-y-3">
      <div className="flex items-baseline justify-between mb-1">
        <h4 className="text-xs uppercase tracking-wider text-gray-400">
          Watching the replay
        </h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          Hide
        </button>
      </div>

      {/* Honest framing */}
      <p className="text-xs text-gray-400">
        Riot doesn't expose match replays via any public API or URL.
        Replays only exist inside the League client and only for
        approximately {REPLAY_EXPIRY_DAYS} days (current patch only).
        We can't replay older games from this site directly.
      </p>

      {probablyExpired && (
        <p className="text-xs text-loss/80 bg-loss/10 border border-loss/30 rounded px-2 py-1.5">
          This match is approximately {ageDays} days old. The replay has
          most likely expired.
        </p>
      )}

      {/* Steps for finding it in the client */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">
          To watch in League client (if still available)
        </p>
        <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside ml-1">
          <li>Open the League of Legends client</li>
          <li>
            Click your <span className="text-gray-100 font-medium">profile</span>{' '}
            (top right) → <span className="text-gray-100 font-medium">Match History</span>
          </li>
          <li>
            Find the match{' '}
            <code className="bg-panel2/80 px-1 py-0.5 rounded text-[10px] font-mono">
              {matchId}
            </code>
          </li>
          <li>
            Click the download icon, then{' '}
            <span className="text-gray-100 font-medium">Watch Replay</span>
          </li>
        </ol>
      </div>

      {/* OP.GG outbound — the practical alternative */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">
          Or view full match details on OP.GG
        </p>
        <div className="flex flex-col gap-1.5">
          <a
            href={opggMatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-between gap-2 text-xs px-3 py-1.5 rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            <span>Open this match on OP.GG</span>
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a
            href={opggSummonerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-gray-500 hover:text-accent transition-colors"
          >
            …or {gameName}'s full match history on OP.GG →
          </a>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5">
          OP.GG can sometimes show post-game data even after Riot's
          replay expires.
        </p>
      </div>
    </div>
  );
}
