import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PROS, type Pro } from '@/lib/pros';
import {
  getAccountByRiotId,
  getMatchIds,
  getMatch,
  type Platform,
} from '@/lib/riot';
import { getLatestVersion, champIconUrl, getAllChampions } from '@/lib/ddragon';
import { batchWithLimit } from '@/lib/batch';

// Cache aggressively — pro mastery patterns shift slowly. 1 hour means
// about one user per hour eats the cold-cache cost; everyone else gets
// instant page loads.
export const revalidate = 3600;

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `${params.id} — pro mastery comparison`,
    description: `Recent SoloQ performance on ${params.id} across all tracked pro players.`,
  };
}

interface ProMastery {
  pro: Pro;
  /** SoloQ + Flex games this pro played on the champion in their recent window */
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  /** How many ranked matches we scanned for this pro */
  matchesScanned: number;
}

/**
 * For a single pro, scan their recent matches across all accounts and count
 * games on the target champion. Reuses the same cache path as
 * /pros/<slug> — first load may be slow on cold cache, subsequent loads
 * are fast.
 */
async function masteryForPro(
  pro: Pro,
  championKey: string
): Promise<ProMastery | null> {
  // Resolve all accounts to PUUIDs
  const resolved = await batchWithLimit(pro.accounts, 3, async (acc) => {
    try {
      const account = await getAccountByRiotId(acc.region, acc.gameName, acc.tagLine);
      return { region: acc.region as Platform, puuid: account.puuid };
    } catch {
      return null;
    }
  });
  const accounts = resolved.filter((r): r is NonNullable<typeof r> => r !== null);
  if (accounts.length === 0) return null;

  // Pull recent match IDs per account
  const idsByAccount = await batchWithLimit(accounts, 3, async (a) => {
    try {
      const ids = await getMatchIds(a.region, a.puuid, 20);
      return ids.map((id) => ({ region: a.region, matchId: id, puuid: a.puuid }));
    } catch {
      return [];
    }
  });
  const tasks = idsByAccount.flat();

  // Cap total fetches per pro. With ~55 pros each capped at 30 matches,
  // worst case is 1650 cached lookups. Cache layer makes this fast on
  // warm cache.
  const capped = tasks.slice(0, 30);

  const matches = await batchWithLimit(capped, 4, async (t) => {
    try {
      const m = await getMatch(t.region, t.matchId);
      const me = m.info.participants.find((p) => p.puuid === t.puuid);
      if (!me) return null;
      return { match: m, me };
    } catch {
      return null;
    }
  });
  const valid = matches.filter((x): x is NonNullable<typeof x> => x !== null);

  let games = 0;
  let wins = 0;
  let kills = 0;
  let deaths = 0;
  let assists = 0;
  for (const { match, me } of valid) {
    if (match.info.queueId !== 420 && match.info.queueId !== 440) continue;
    if (me.championName !== championKey) continue;
    games++;
    if (me.win) wins++;
    kills += me.kills;
    deaths += me.deaths;
    assists += me.assists;
  }

  if (games === 0) return null;
  return { pro, games, wins, kills, deaths, assists, matchesScanned: valid.length };
}

export default async function ProMasteryPage({ params }: Props) {
  // Validate champion key by checking it's in the Data Dragon list
  const [version, championMap] = await Promise.all([
    getLatestVersion(),
    getAllChampions(),
  ]);
  const champion = championMap[params.id];
  if (!champion) notFound();

  // Run the aggregation across all pros. This is the expensive part —
  // capped at concurrency 4 across pros to avoid hitting Riot rate
  // limits on cold cache.
  const masteries = await batchWithLimit(PROS, 4, (pro) =>
    masteryForPro(pro, params.id)
  );
  const withGames = masteries.filter((m): m is ProMastery => m !== null);

  // Sort: most games first, ties broken by win rate descending
  withGames.sort((a, b) => {
    if (a.games !== b.games) return b.games - a.games;
    return b.wins / b.games - a.wins / a.games;
  });

  return (
    <div className="space-y-6">
      <Link
        href={`/champions/${params.id}`}
        className="inline-block text-xs text-gray-400 hover:text-accent transition-colors"
      >
        ← {champion.name}
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={champIconUrl(version, params.id)}
          alt={champion.name}
          className="w-16 h-16 rounded"
        />
        <div>
          <h1 className="text-2xl font-bold">{champion.name}</h1>
          <p className="text-sm text-gray-400">Pro mastery comparison</p>
        </div>
      </div>

      {/* Honest framing */}
      <div className="bg-panel border border-line rounded-lg p-3 text-xs text-gray-400">
        <p>
          Recent SoloQ + Flex performance on {champion.name} across all{' '}
          {PROS.length} tracked pros. Sample: up to 30 ranked matches per pro
          across all their resolved accounts. Pros who haven't played{' '}
          {champion.name} recently aren't shown.
        </p>
      </div>

      {withGames.length === 0 ? (
        <div className="bg-panel border border-line rounded-lg p-8 text-center text-sm text-gray-400">
          <p className="font-semibold mb-2 text-gray-200">
            No tracked pro has played {champion.name} recently.
          </p>
          <p className="text-xs">
            We checked the last 30 ranked matches across each pro's resolved
            accounts. None contained {champion.name}. May be a niche pick this
            patch, or the data window may not extend far enough back.
          </p>
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-lg overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_60px_60px_70px] sm:grid-cols-[minmax(0,1fr)_60px_60px_70px_minmax(0,1fr)] gap-3 px-4 py-2 bg-panel2/40 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
            <span>Pro</span>
            <span className="text-right">Games</span>
            <span className="text-right">WR</span>
            <span className="text-right">KDA</span>
            <span className="hidden sm:block">Sample</span>
          </div>
          {withGames.map((m, idx) => (
            <ProMasteryRow
              key={m.pro.slug}
              mastery={m}
              rank={idx + 1}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="text-[11px] text-gray-600">
        Caching: results refresh once per hour. New pro accounts and recent
        matches may take up to that long to appear here. Sample size is
        bounded; pros with deeper champion histories (older matches) aren't
        fully represented.
      </p>
    </div>
  );
}

function ProMasteryRow({ mastery, rank }: { mastery: ProMastery; rank: number }) {
  const { pro, games, wins, kills, deaths, assists, matchesScanned } = mastery;
  const wr = Math.round((wins / games) * 100);
  const kda = ((kills + assists) / Math.max(1, deaths)).toFixed(2);
  const wrColor =
    wr >= 60 ? 'text-win' : wr >= 50 ? 'text-gray-200' : 'text-loss';

  return (
    <Link
      href={`/pros/${pro.slug}`}
      className="grid grid-cols-[minmax(0,1fr)_60px_60px_70px] sm:grid-cols-[minmax(0,1fr)_60px_60px_70px_minmax(0,1fr)] gap-3 px-4 py-2.5 text-sm border-t border-line hover:bg-panel2/40 transition-colors group"
    >
      <span className="min-w-0 flex items-baseline gap-2">
        <span className="text-gray-600 text-[10px] font-mono w-4 flex-shrink-0">
          {rank}
        </span>
        <span className="font-semibold text-gray-100 group-hover:text-accent transition-colors truncate">
          {pro.name}
        </span>
        <span className="text-[11px] text-gray-500 truncate">{pro.team}</span>
      </span>
      <span className="text-right text-gray-200 tabular-nums">{games}</span>
      <span className={`text-right tabular-nums ${wrColor}`}>{wr}%</span>
      <span className="text-right text-gray-300 tabular-nums">{kda}</span>
      <span className="hidden sm:block text-right text-[11px] text-gray-600 tabular-nums">
        {matchesScanned} games scanned
      </span>
    </Link>
  );
}
