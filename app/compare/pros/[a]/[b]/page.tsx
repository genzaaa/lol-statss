import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PROS, type Pro } from '@/lib/pros';
import {
  getAccountByRiotId,
  getMatchIds,
  getMatch,
  PLATFORM_LABELS,
  type Match,
  type Platform,
} from '@/lib/riot';
import { getLatestVersion, champIconUrl } from '@/lib/ddragon';
import { batchWithLimit } from '@/lib/batch';

export const revalidate = 600; // 10 minutes — pros' shared games change rarely

type Props = { params: { a: string; b: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = PROS.find((p) => p.slug === params.a);
  const b = PROS.find((p) => p.slug === params.b);
  if (!a || !b) return { title: 'Pro comparison not found' };
  return {
    title: `${a.name} vs ${b.name} — head-to-head`,
    description: `${a.name} (${a.team}) vs ${b.name} (${b.team}) — shared SoloQ matches and head-to-head record.`,
  };
}

interface ResolvedPro {
  pro: Pro;
  /** All confirmed PUUIDs across all of this pro's accounts (regions) */
  puuids: Array<{ puuid: string; region: Platform; gameName: string; tagLine: string }>;
  /** Recent match IDs across all accounts */
  matchIds: Set<string>;
}

/**
 * Resolve a pro's accounts to PUUIDs and gather their recent match IDs.
 * Hard cap on matches fetched per pro to keep the request count bounded.
 */
async function resolvePro(pro: Pro): Promise<ResolvedPro> {
  // Resolve every account to a PUUID. Failures are silently dropped (account
  // may have been renamed / deleted).
  const resolved = await batchWithLimit(pro.accounts, 3, async (acc) => {
    try {
      const account = await getAccountByRiotId(acc.region, acc.gameName, acc.tagLine);
      return {
        puuid: account.puuid,
        region: acc.region,
        gameName: acc.gameName,
        tagLine: acc.tagLine,
      };
    } catch {
      return null;
    }
  });
  const puuids = resolved.filter((r): r is NonNullable<typeof r> => r !== null);

  // Pull last 20 match IDs per account in parallel.
  const idsPerAccount = await batchWithLimit(puuids, 3, async (entry) => {
    try {
      const ids = await getMatchIds(entry.region, entry.puuid, 20);
      return ids;
    } catch {
      return [] as string[];
    }
  });
  const matchIds = new Set<string>();
  for (const arr of idsPerAccount) for (const id of arr) matchIds.add(id);

  return { pro, puuids, matchIds };
}

interface SharedMatchSummary {
  matchId: string;
  region: Platform;
  /** Who won the match (which side) */
  winningSide: number; // 100 or 200
  /** Whether pro A's team won */
  aWon: boolean;
  /** Whether they were on the same team (then both won or both lost) */
  sameTeam: boolean;
  /** A's champion */
  aChampion: string;
  /** A's KDA */
  aK: number;
  aD: number;
  aA: number;
  /** B's champion */
  bChampion: string;
  bK: number;
  bD: number;
  bA: number;
  gameDuration: number;
  gameEndTimestamp?: number;
  queueId: number;
}

/**
 * For each match ID that appears in BOTH pros' history, fetch the match and
 * extract the head-to-head summary.
 *
 * Cap on total matches fetched to keep request count bounded — even with our
 * cache layer, fetching 50+ matches in one pageload is heavy.
 */
async function findSharedMatches(
  a: ResolvedPro,
  b: ResolvedPro
): Promise<SharedMatchSummary[]> {
  // Set intersection of match IDs
  const shared: string[] = [];
  for (const id of a.matchIds) {
    if (b.matchIds.has(id)) shared.push(id);
  }
  if (shared.length === 0) return [];

  // Hard cap. Pros usually share <10 matches in their last 20 each, so 30
  // is generous headroom.
  const capped = shared.slice(0, 30);

  // We need to know which region to fetch the match from. Match IDs start
  // with the platform prefix (e.g. KR_..., EUW1_...).
  function platformFromMatchId(id: string): Platform | null {
    const prefix = id.split('_')[0]?.toLowerCase();
    const known: Platform[] = [
      'br1', 'eun1', 'euw1', 'jp1', 'kr', 'la1', 'la2', 'na1', 'oc1', 'tr1', 'ru',
    ];
    return (known as string[]).includes(prefix) ? (prefix as Platform) : null;
  }

  const aPuuids = new Set(a.puuids.map((p) => p.puuid));
  const bPuuids = new Set(b.puuids.map((p) => p.puuid));

  const summaries = await batchWithLimit(capped, 4, async (matchId) => {
    const region = platformFromMatchId(matchId);
    if (!region) return null;
    try {
      const match = await getMatch(region, matchId);
      const aPart = match.info.participants.find((p) => aPuuids.has(p.puuid));
      const bPart = match.info.participants.find((p) => bPuuids.has(p.puuid));
      if (!aPart || !bPart) return null;
      const winningSide =
        match.info.teams?.find((t) => t.win)?.teamId ??
        (aPart.win ? aPart.teamId : aPart.teamId === 100 ? 200 : 100);
      return {
        matchId,
        region,
        winningSide,
        aWon: aPart.win,
        sameTeam: aPart.teamId === bPart.teamId,
        aChampion: aPart.championName,
        aK: aPart.kills,
        aD: aPart.deaths,
        aA: aPart.assists,
        bChampion: bPart.championName,
        bK: bPart.kills,
        bD: bPart.deaths,
        bA: bPart.assists,
        gameDuration: match.info.gameDuration,
        gameEndTimestamp: match.info.gameEndTimestamp,
        queueId: match.info.queueId,
      } satisfies SharedMatchSummary;
    } catch {
      return null;
    }
  });

  return summaries
    .filter((s): s is SharedMatchSummary => s !== null)
    .sort((x, y) => (y.gameEndTimestamp ?? 0) - (x.gameEndTimestamp ?? 0));
}

const QUEUE_LABELS: Record<number, string> = {
  420: 'Solo/Duo',
  440: 'Flex',
  450: 'ARAM',
  430: 'Normal',
  400: 'Normal Draft',
  700: 'Clash',
  900: 'URF',
  1700: 'Arena',
};

export default async function ProVsProPage({ params }: Props) {
  const proA = PROS.find((p) => p.slug === params.a);
  const proB = PROS.find((p) => p.slug === params.b);
  if (!proA || !proB) notFound();
  if (proA.slug === proB.slug) {
    return (
      <div className="bg-panel border border-line rounded-lg p-6 text-sm text-gray-400">
        Cannot compare a pro to themselves. Pick two different pros.
      </div>
    );
  }

  const [version, resolvedA, resolvedB] = await Promise.all([
    getLatestVersion(),
    resolvePro(proA),
    resolvePro(proB),
  ]);

  const shared = await findSharedMatches(resolvedA, resolvedB);

  // Aggregate stats
  const totalShared = shared.length;
  const sameTeamCount = shared.filter((s) => s.sameTeam).length;
  const oppositeTeamCount = totalShared - sameTeamCount;
  const aWinsVsB = shared.filter((s) => !s.sameTeam && s.aWon).length;
  const bWinsVsA = oppositeTeamCount - aWinsVsB;
  const aWinsTogether = shared.filter((s) => s.sameTeam && s.aWon).length;
  const aLossesTogether = sameTeamCount - aWinsTogether;

  return (
    <div className="space-y-6">
      <Link
        href="/pros"
        className="inline-block text-xs text-gray-400 hover:text-accent transition-colors"
      >
        ← Browse pros
      </Link>

      {/* Header */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <ProHeader pro={proA} side="left" />
          <span className="text-2xl font-bold text-gray-500">vs</span>
          <ProHeader pro={proB} side="right" />
        </div>
      </div>

      {totalShared === 0 ? (
        <div className="bg-panel border border-line rounded-lg p-5 text-sm text-gray-400">
          <p className="font-semibold mb-2 text-gray-200">
            No shared games found in recent match history.
          </p>
          <p className="text-xs">
            We checked the last 20 matches across all of {proA.name}'s and{' '}
            {proB.name}'s resolved accounts. No matchIds appeared in both.
            They may have crossed paths in older games (outside our window),
            in matches Riot has expired, or simply haven't queued together
            recently.
          </p>
        </div>
      ) : (
        <>
          {/* Aggregate score */}
          <div className="bg-panel border border-line rounded-lg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Head-to-head ({totalShared} shared games)
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <ScoreBox
                label="Against each other"
                count={oppositeTeamCount}
                left={{ name: proA.name, value: aWinsVsB }}
                right={{ name: proB.name, value: bWinsVsA }}
              />
              <ScoreBox
                label="On same team"
                count={sameTeamCount}
                left={{ name: 'Won together', value: aWinsTogether }}
                right={{ name: 'Lost together', value: aLossesTogether }}
              />
            </div>
          </div>

          {/* Match list */}
          <div className="bg-panel border border-line rounded-lg p-4 space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Shared matches
            </h2>
            {shared.map((m) => (
              <SharedMatchRow
                key={m.matchId}
                summary={m}
                proA={proA}
                proB={proB}
                version={version}
              />
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <p className="text-[11px] text-gray-600 pt-2 border-t border-line">
        Built from up to 20 most recent matches per account across all of each
        pro's resolved accounts. Capped at {30} fetched matches per page load.
        Older shared games may exist outside this window.
      </p>
    </div>
  );
}

function ProHeader({ pro, side }: { pro: Pro; side: 'left' | 'right' }) {
  return (
    <div className={side === 'right' ? 'text-right' : ''}>
      <Link
        href={`/pros/${pro.slug}`}
        className="text-2xl font-bold hover:text-accent transition-colors"
      >
        {pro.name}
      </Link>
      <p className="text-xs text-gray-400 mt-0.5">
        {pro.team} · {pro.role}
      </p>
      <p className="text-[10px] text-gray-500">
        {pro.country}
      </p>
    </div>
  );
}

function ScoreBox({
  label,
  count,
  left,
  right,
}: {
  label: string;
  count: number;
  left: { name: string; value: number };
  right: { name: string; value: number };
}) {
  return (
    <div className="bg-panel2/40 border border-line rounded-md p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
        {label} ({count})
      </p>
      {count === 0 ? (
        <p className="text-xs text-gray-500">No games of this type.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-200 truncate">{left.name}</p>
            <p className="text-2xl font-bold">{left.value}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-200 truncate">{right.name}</p>
            <p className="text-2xl font-bold">{right.value}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SharedMatchRow({
  summary,
  proA,
  proB,
  version,
}: {
  summary: SharedMatchSummary;
  proA: Pro;
  proB: Pro;
  version: string;
}) {
  const queueLabel = QUEUE_LABELS[summary.queueId] ?? `Queue ${summary.queueId}`;
  const dateStr = summary.gameEndTimestamp
    ? new Date(summary.gameEndTimestamp).toLocaleDateString()
    : '';
  const tag = summary.sameTeam
    ? summary.aWon
      ? { text: 'Won together', cls: 'text-win' }
      : { text: 'Lost together', cls: 'text-loss' }
    : summary.aWon
      ? { text: `${proA.name} won`, cls: 'text-win' }
      : { text: `${proB.name} won`, cls: 'text-win' };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-center bg-panel2/30 border border-line rounded-md p-2 text-xs">
      {/* Pro A side */}
      <div className="flex items-center gap-2 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={champIconUrl(version, summary.aChampion)}
          alt={summary.aChampion}
          className="w-7 h-7 rounded flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="text-gray-200 truncate">{summary.aChampion}</p>
          <p className="text-[10px] text-gray-500 font-mono">
            {summary.aK}/{summary.aD}/{summary.aA}
          </p>
        </div>
      </div>
      {/* Center metadata */}
      <div className="text-center">
        <p className={`text-[10px] uppercase tracking-wider font-semibold ${tag.cls}`}>
          {tag.text}
        </p>
        <p className="text-[10px] text-gray-500">
          {queueLabel} {dateStr ? `· ${dateStr}` : ''}
        </p>
      </div>
      {/* Pro B side */}
      <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={champIconUrl(version, summary.bChampion)}
          alt={summary.bChampion}
          className="w-7 h-7 rounded flex-shrink-0"
        />
        <div className="min-w-0 text-right">
          <p className="text-gray-200 truncate">{summary.bChampion}</p>
          <p className="text-[10px] text-gray-500 font-mono">
            {summary.bK}/{summary.bD}/{summary.bA}
          </p>
        </div>
      </div>
    </div>
  );
}
