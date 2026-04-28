'use client';

import Link from 'next/link';
import type { Match, MatchParticipant } from '@/lib/riot';
import { champIconUrl } from '@/lib/ddragon';

interface Props {
  matches: Match[];
  puuid: string;
  version: string;
}

// Riot's `teamPosition` values, in display order
const POSITIONS = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const;
type Position = (typeof POSITIONS)[number];

const POSITION_LABEL: Record<Position, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'Bot',
  UTILITY: 'Support',
};

const POSITION_COLOR: Record<Position, string> = {
  TOP: 'bg-orange-500',
  JUNGLE: 'bg-emerald-500',
  MIDDLE: 'bg-purple-500',
  BOTTOM: 'bg-red-500',
  UTILITY: 'bg-blue-500',
};

// Ranked queue IDs we consider for stats. Both Solo/Duo (420) and Flex
// (440). Other queues (ARAM, normals, Arena) have weird position data
// and would skew the breakdown.
const RANKED_QUEUES = new Set([420, 440]);

// Minimum games required for a champion to be considered for "best" or
// "worst" — stops a single-game lucky pick from dominating.
const MIN_CHAMP_GAMES = 3;

interface ChampStat {
  championKey: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
}

/**
 * Pulls this player's participant entry from each match. Returns a
 * filtered list of (match, participant) pairs limited to ranked queues
 * with valid teamPosition data.
 */
function rankedGames(
  matches: Match[],
  puuid: string
): Array<{ match: Match; me: MatchParticipant }> {
  const out: Array<{ match: Match; me: MatchParticipant }> = [];
  for (const m of matches) {
    if (!RANKED_QUEUES.has(m.info.queueId)) continue;
    const me = m.info.participants.find((p) => p.puuid === puuid);
    if (!me) continue;
    out.push({ match: m, me });
  }
  return out;
}

export function ProfileStats({ matches, puuid, version }: Props) {
  const ranked = rankedGames(matches, puuid);

  // If there are no ranked games at all, hide the panel entirely. Showing
  // "0 ranked games" with empty bars would just be noise.
  if (ranked.length === 0) return null;

  // ===== Per-position breakdown =====
  const posStats = new Map<Position, { games: number; wins: number }>();
  let positionedGames = 0;
  for (const { me } of ranked) {
    const pos = me.teamPosition as Position | '' | undefined;
    if (!pos || !POSITIONS.includes(pos as Position)) continue;
    positionedGames++;
    const cur = posStats.get(pos as Position) ?? { games: 0, wins: 0 };
    cur.games++;
    if (me.win) cur.wins++;
    posStats.set(pos as Position, cur);
  }

  // ===== Champion stats =====
  const champStats = new Map<string, ChampStat>();
  for (const { me } of ranked) {
    const cur = champStats.get(me.championName) ?? {
      championKey: me.championName,
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
    };
    cur.games++;
    if (me.win) cur.wins++;
    cur.kills += me.kills;
    cur.deaths += me.deaths;
    cur.assists += me.assists;
    champStats.set(me.championName, cur);
  }

  const champCandidates = Array.from(champStats.values()).filter(
    (c) => c.games >= MIN_CHAMP_GAMES
  );
  champCandidates.sort((a, b) => b.wins / b.games - a.wins / a.games);
  const bestChamp = champCandidates[0] ?? null;
  const worstChamp =
    champCandidates.length >= 2
      ? champCandidates[champCandidates.length - 1]
      : null;

  // ===== Aggregate summary numbers =====
  let totalK = 0;
  let totalD = 0;
  let totalA = 0;
  let totalCS = 0;
  let totalDur = 0;
  let totalWins = 0;
  for (const { match, me } of ranked) {
    totalK += me.kills;
    totalD += me.deaths;
    totalA += me.assists;
    totalCS += me.totalMinionsKilled + me.neutralMinionsKilled;
    totalDur += match.info.gameDuration;
    if (me.win) totalWins++;
  }
  const games = ranked.length;
  const overallWr = Math.round((totalWins / games) * 100);
  const avgKDA = ((totalK + totalA) / Math.max(1, totalD)).toFixed(2);
  const avgCS = (totalCS / games).toFixed(0);
  const avgCSPerMin = (totalCS / Math.max(1, totalDur / 60)).toFixed(1);
  const avgDurMin = Math.round(totalDur / games / 60);

  // ===== Streak detection =====
  // Matches are returned newest-first by Riot. Walk forward until a result
  // flips. Streak length = how many consecutive games with the same result.
  const sequence = ranked.map(({ me }) => me.win);
  let streakLen = 0;
  let streakWin = false;
  if (sequence.length > 0) {
    streakWin = sequence[0];
    for (const w of sequence) {
      if (w === streakWin) streakLen++;
      else break;
    }
  }
  // Only call out a streak if it's meaningful
  const showStreak = streakLen >= 3;

  // ===== Trend (form) =====
  // Compare win rate of first half (older) vs second half (newer) of the
  // sample. If newer half is meaningfully better, mark "improving" (↗).
  // Need at least 8 games for the comparison to be remotely meaningful.
  let trend: 'up' | 'down' | 'flat' | null = null;
  if (sequence.length >= 8) {
    // Note: sequence is newest-first, so the "second half" indexes are
    // actually the older games.
    const half = Math.floor(sequence.length / 2);
    const newer = sequence.slice(0, half);
    const older = sequence.slice(half);
    const newerWr = newer.filter(Boolean).length / newer.length;
    const olderWr = older.filter(Boolean).length / older.length;
    const diff = newerWr - olderWr;
    if (diff > 0.15) trend = 'up';
    else if (diff < -0.15) trend = 'down';
    else trend = 'flat';
  }

  return (
    <div className="bg-panel border border-line rounded-lg p-4 space-y-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Ranked stats
          <span className="text-gray-600 font-normal ml-2">
            (last {games} games)
          </span>
        </h3>
        {showStreak && (
          <span
            className={`text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${
              streakWin
                ? 'text-win bg-win/10 border-win/30'
                : 'text-loss bg-loss/10 border-loss/30'
            }`}
          >
            {streakLen}-game {streakWin ? 'win' : 'loss'} streak
          </span>
        )}
      </div>

      {/* Top stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCell
          label="Win rate"
          value={`${overallWr}%`}
          sub={`${totalWins}W ${games - totalWins}L`}
          accent={overallWr >= 55 ? 'win' : overallWr < 45 ? 'loss' : 'neutral'}
          trend={trend}
        />
        <StatCell
          label="Avg KDA"
          value={avgKDA}
          sub={`${(totalK / games).toFixed(1)}/${(totalD / games).toFixed(
            1
          )}/${(totalA / games).toFixed(1)}`}
        />
        <StatCell
          label="CS / game"
          value={avgCS}
          sub={`${avgCSPerMin}/min`}
        />
        <StatCell
          label="Avg duration"
          value={`${avgDurMin}m`}
          sub={`${games} ranked games`}
        />
      </div>

      {/* Per-position breakdown */}
      {positionedGames > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">
            By role
          </p>
          <div className="space-y-1.5">
            {POSITIONS.filter((p) => posStats.has(p)).map((p) => {
              const s = posStats.get(p)!;
              const wr = Math.round((s.wins / s.games) * 100);
              const playPct = (s.games / positionedGames) * 100;
              return (
                <div
                  key={p}
                  className="grid grid-cols-[64px_minmax(0,1fr)_72px] gap-2 items-center text-xs"
                >
                  <span className="text-gray-300">{POSITION_LABEL[p]}</span>
                  <div className="h-2 rounded-full bg-panel2 overflow-hidden flex">
                    <div
                      className={`${POSITION_COLOR[p]}`}
                      style={{ width: `${playPct}%` }}
                      title={`Played ${s.games} games as ${POSITION_LABEL[p]}`}
                    />
                  </div>
                  <span className="text-right text-gray-400 font-mono tabular-nums">
                    <span
                      className={
                        wr >= 55
                          ? 'text-win'
                          : wr < 45
                            ? 'text-loss'
                            : 'text-gray-200'
                      }
                    >
                      {wr}%
                    </span>{' '}
                    <span className="text-gray-600">({s.games})</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Best / worst champion */}
      {(bestChamp || worstChamp) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {bestChamp ? (
            <ChampCallout
              label="Best champion"
              accent="win"
              stat={bestChamp}
              version={version}
            />
          ) : (
            <PlaceholderCallout label="Best champion" />
          )}
          {worstChamp && bestChamp && worstChamp.championKey !== bestChamp.championKey ? (
            <ChampCallout
              label="Needs work"
              accent="loss"
              stat={worstChamp}
              version={version}
            />
          ) : (
            <PlaceholderCallout label="Needs work" />
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-600">
        Solo/Duo and Flex queues only. Best/worst champion requires{' '}
        {MIN_CHAMP_GAMES}+ games. Trend compares first half vs second half of
        the sample.
      </p>
    </div>
  );
}

function StatCell({
  label,
  value,
  sub,
  accent,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: 'win' | 'loss' | 'neutral';
  trend?: 'up' | 'down' | 'flat' | null;
}) {
  const valColor =
    accent === 'win'
      ? 'text-win'
      : accent === 'loss'
        ? 'text-loss'
        : 'text-gray-100';
  return (
    <div className="bg-panel2/40 border border-line rounded-md p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`text-xl font-semibold ${valColor} flex items-center gap-1`}>
        {value}
        {trend === 'up' && (
          <span className="text-win text-sm" title="Improving over the sample">
            ↗
          </span>
        )}
        {trend === 'down' && (
          <span className="text-loss text-sm" title="Declining over the sample">
            ↘
          </span>
        )}
      </p>
      <p className="text-[10px] text-gray-500">{sub}</p>
    </div>
  );
}

function ChampCallout({
  label,
  accent,
  stat,
  version,
}: {
  label: string;
  accent: 'win' | 'loss';
  stat: ChampStat;
  version: string;
}) {
  const wr = Math.round((stat.wins / stat.games) * 100);
  const kda = ((stat.kills + stat.assists) / Math.max(1, stat.deaths)).toFixed(
    2
  );
  return (
    <Link
      href={`/champions/${stat.championKey}`}
      className={`flex items-center gap-3 p-2.5 rounded-md bg-panel2/40 border ${
        accent === 'win' ? 'border-win/30' : 'border-loss/30'
      } hover:border-accent transition-colors group`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={champIconUrl(version, stat.championKey)}
        alt={stat.championKey}
        className="w-10 h-10 rounded flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">
          {label}
        </p>
        <p className="text-sm font-semibold text-gray-100 group-hover:text-accent transition-colors truncate">
          {stat.championKey}
        </p>
        <p className="text-[11px] text-gray-500">
          <span className={accent === 'win' ? 'text-win' : 'text-loss'}>
            {wr}%
          </span>{' '}
          · {stat.games} games · {kda} KDA
        </p>
      </div>
    </Link>
  );
}

function PlaceholderCallout({ label }: { label: string }) {
  return (
    <div className="p-2.5 rounded-md bg-panel2/20 border border-line text-center text-[11px] text-gray-500">
      <p className="text-[10px] uppercase tracking-wider">{label}</p>
      <p className="mt-1">Need {MIN_CHAMP_GAMES}+ games on a champion</p>
    </div>
  );
}
