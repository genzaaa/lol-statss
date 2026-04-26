import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PROS, type Pro, type ProAccount } from '@/lib/pros';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getRankedByPuuid,
  getMatchIds,
  getMatch,
  PLATFORM_LABELS,
  type Platform,
  type LeagueEntry,
} from '@/lib/riot';
import { getLatestVersion, profileIconUrl, champIconUrl } from '@/lib/ddragon';
import { winrate, tierColor } from '@/lib/format';
import { batchWithLimit } from '@/lib/batch';

export const revalidate = 600; // 10 minutes — pros' SoloQ activity changes during the day

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pro = PROS.find((p) => p.slug === params.slug);
  if (!pro) return { title: 'Pro not found' };
  return {
    title: `${pro.name} (${pro.team}) — LoL Stats`,
    description: `${pro.name}'s SoloQ accounts across regions, current rank, and recent activity.`,
  };
}

interface ResolvedAccount {
  account: ProAccount;
  /** True when the Riot API confirmed this account exists. */
  resolved: boolean;
  /** Error message if the lookup failed. */
  error?: string;
  /** The PUUID, if resolved. */
  puuid?: string;
  /** Profile icon ID from summoner endpoint. */
  profileIconId?: number;
  /** Summoner level. */
  summonerLevel?: number;
  /** Solo queue rank if available. */
  solo?: LeagueEntry;
  /** Total matches found in last query (used as an activity indicator). */
  recentMatchCount?: number;
  /** Recent match IDs — used to fetch and aggregate champion stats. */
  matchIds?: string[];
}

/** Resolve one account against the Riot API. */
async function resolveAccount(acc: ProAccount): Promise<ResolvedAccount> {
  try {
    const account = await getAccountByRiotId(acc.region, acc.gameName, acc.tagLine);
    // Run the rest in parallel — they're independent.
    // We grab 15 match IDs per account so champion-pool aggregation has
    // a meaningful sample. Champion pools combine matches across all
    // resolved accounts.
    const [summoner, ranked, matchIds] = await Promise.all([
      getSummonerByPuuid(acc.region, account.puuid).catch(() => null),
      getRankedByPuuid(acc.region, account.puuid).catch(() => [] as LeagueEntry[]),
      getMatchIds(acc.region, account.puuid, 15).catch(() => [] as string[]),
    ]);
    const solo = ranked.find((r) => r.queueType === 'RANKED_SOLO_5x5');
    return {
      account: acc,
      resolved: true,
      puuid: account.puuid,
      profileIconId: summoner?.profileIconId,
      summonerLevel: summoner?.summonerLevel,
      solo,
      recentMatchCount: matchIds.length,
      matchIds,
    };
  } catch (e: any) {
    return {
      account: acc,
      resolved: false,
      error: e?.message ?? 'Failed to resolve account',
    };
  }
}

// ============== Champion pool aggregation ==============

interface ChampStat {
  championKey: string; // Data Dragon string ID, e.g. "Aatrox"
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  /** True when at least one of the games was Solo/Duo (queue 420). */
  hasSolo: boolean;
}

/**
 * Across all resolved accounts, fetch recent matches and aggregate by
 * champion. Returns a sorted list (most-played first).
 *
 * Cap on matches fetched per pro to keep request count bounded.
 * Solo/Duo and Flex are included by default; we tag Solo/Duo separately
 * so callers can filter if desired.
 */
async function aggregateChampionPool(
  resolved: ResolvedAccount[]
): Promise<{ champs: ChampStat[]; matchesScanned: number }> {
  // Collect (region, matchId, puuid) triples — we need the puuid to find
  // *this player's* participant entry in each match.
  const tasks: Array<{ region: Platform; matchId: string; puuid: string }> = [];
  for (const r of resolved) {
    if (!r.resolved || !r.puuid || !r.matchIds) continue;
    for (const id of r.matchIds) {
      tasks.push({ region: r.account.region, matchId: id, puuid: r.puuid });
    }
  }

  // Hard cap to keep request count bounded. 30 matches across all accounts
  // is enough for a meaningful champion pool while staying friendly to the
  // free-tier rate limit (~100 req / 2 min).
  const capped = tasks.slice(0, 30);

  const matches = await batchWithLimit(capped, 4, async (t) => {
    try {
      const m = await getMatch(t.region, t.matchId);
      const me = m.info.participants.find((p) => p.puuid === t.puuid);
      if (!me) return null;
      return {
        match: m,
        me,
      };
    } catch {
      return null;
    }
  });

  const valid = matches.filter(
    (x): x is NonNullable<typeof x> => x !== null
  );

  const stats = new Map<string, ChampStat>();
  for (const { match, me } of valid) {
    const queueId = match.info.queueId;
    // Filter to ranked queues only for the pool view — pro champion pools
    // are most meaningful on ranked SoloQ and Flex. Other queues (ARAM,
    // URF, normals) are excluded to keep the data clean.
    if (queueId !== 420 && queueId !== 440) continue;

    const key = me.championName;
    const cur = stats.get(key) ?? {
      championKey: key,
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      hasSolo: false,
    };
    cur.games++;
    if (me.win) cur.wins++;
    cur.kills += me.kills;
    cur.deaths += me.deaths;
    cur.assists += me.assists;
    if (queueId === 420) cur.hasSolo = true;
    stats.set(key, cur);
  }

  const champs = Array.from(stats.values()).sort((a, b) => {
    if (a.games !== b.games) return b.games - a.games;
    return b.wins / b.games - a.wins / a.games;
  });

  return { champs, matchesScanned: valid.length };
}

export default async function ProPage({ params }: Props) {
  const pro = PROS.find((p) => p.slug === params.slug);
  if (!pro) notFound();

  // Resolve all accounts in parallel, with concurrency limit so a pro
  // with 6 accounts doesn't burn 6 API requests in 100ms.
  const [version, resolved] = await Promise.all([
    getLatestVersion(),
    batchWithLimit(pro.accounts, 3, resolveAccount),
  ]);

  // Aggregate champion pool from recent matches across all accounts.
  // This adds another batch of API calls but stays within rate limit
  // thanks to the cap inside aggregateChampionPool.
  const { champs, matchesScanned } = await aggregateChampionPool(resolved);

  // Group accounts by region for clean rendering
  const byRegion = new Map<Platform, ResolvedAccount[]>();
  for (const r of resolved) {
    const arr = byRegion.get(r.account.region) ?? [];
    arr.push(r);
    byRegion.set(r.account.region, arr);
  }

  // Order regions sensibly
  const regionOrder: Platform[] = [
    'kr', 'euw1', 'na1', 'eun1', 'br1', 'la1', 'la2', 'tr1', 'jp1', 'ru', 'oc1',
  ];
  const orderedRegions = regionOrder.filter((r) => byRegion.has(r));

  const totalResolved = resolved.filter((r) => r.resolved).length;

  return (
    <div className="space-y-6">
      <Link
        href="/pros"
        className="inline-block text-xs text-gray-400 hover:text-accent transition-colors"
      >
        ← All pros
      </Link>

      {/* Header */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-1">{pro.name}</h1>
            <p className="text-sm text-gray-400">
              <span className="text-gray-200">{pro.team}</span>
              <span className="text-gray-600"> · </span>
              <span>{pro.role}</span>
              <span className="text-gray-600"> · </span>
              <span>{pro.country}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Accounts
            </p>
            <p className="text-2xl font-semibold">
              <span className="text-win">{totalResolved}</span>
              <span className="text-gray-600 text-sm font-normal">
                {' '}
                / {pro.accounts.length}
              </span>
            </p>
            <p className="text-[10px] text-gray-500">verified live</p>
          </div>
        </div>
      </div>

      {totalResolved === 0 && (
        <div className="bg-panel border border-loss/30 rounded-lg p-5 text-sm text-gray-300">
          <p className="font-semibold mb-2 text-loss">
            No accounts could be verified.
          </p>
          <p className="text-xs text-gray-400">
            Either the Riot API is unreachable, all accounts have been
            renamed, or this pro's listed accounts are out of date. The data
            in <code className="bg-panel2 px-1 py-0.5 rounded text-[10px]">lib/pros.ts</code> may need refreshing.
          </p>
        </div>
      )}

      {/* Champion pool — aggregated from recent ranked matches across accounts */}
      {champs.length > 0 && (
        <ChampionPoolSection
          pro={pro}
          champs={champs}
          matchesScanned={matchesScanned}
          version={version}
        />
      )}

      {/* Sections per region */}
      {orderedRegions.map((region) => {
        const accounts = byRegion.get(region)!;
        return (
          <section key={region}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
              {PLATFORM_LABELS[region]}
              <span className="text-gray-600 font-normal ml-2">
                ({accounts.length})
              </span>
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {accounts.map((acc, i) => (
                <AccountCard
                  key={`${region}-${i}`}
                  resolved={acc}
                  version={version}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Honest footer */}
      <p className="text-[11px] text-gray-600 pt-2 border-t border-line">
        Account data is verified live against the Riot API on each page load.
        Accounts that fail to resolve may have been renamed or be on a region
        not listed. Source: hand-curated from lolpros.gg, OP.GG pro tags, and
        DPM.LOL. <em>Not affiliated with Riot Games.</em>
      </p>
    </div>
  );
}

function AccountCard({
  resolved,
  version,
}: {
  resolved: ResolvedAccount;
  version: string;
}) {
  const { account } = resolved;
  const profileHref = `/summoner/${account.region}/${encodeURIComponent(
    account.gameName
  )}-${encodeURIComponent(account.tagLine)}`;

  if (!resolved.resolved) {
    return (
      <div className="bg-panel border border-line rounded-lg p-4 opacity-60">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <p className="font-mono text-sm text-gray-300 truncate">
            {account.gameName}
            <span className="text-gray-500"> #{account.tagLine}</span>
          </p>
          <span className="text-[10px] uppercase tracking-wider text-loss">
            Unresolved
          </span>
        </div>
        <p className="text-[11px] text-gray-500">
          {resolved.error ?? 'Account not found'}
        </p>
      </div>
    );
  }

  const wr = resolved.solo
    ? winrate(resolved.solo.wins, resolved.solo.losses)
    : null;

  return (
    <Link
      href={profileHref}
      className="block bg-panel border border-line rounded-lg p-4 hover:border-accent transition-colors group"
    >
      <div className="flex items-center gap-3">
        {resolved.profileIconId !== undefined ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profileIconUrl(version, resolved.profileIconId)}
            alt=""
            className="w-12 h-12 rounded-md flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-panel2 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-gray-100 truncate group-hover:text-accent transition-colors">
            {account.gameName}
            <span className="text-gray-500 font-normal"> #{account.tagLine}</span>
          </p>
          {resolved.summonerLevel !== undefined && (
            <p className="text-[10px] text-gray-500">
              Level {resolved.summonerLevel}
              {resolved.recentMatchCount !== undefined && resolved.recentMatchCount > 0 && (
                <span className="text-gray-600"> · {resolved.recentMatchCount} recent matches</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Rank row */}
      <div className="mt-3 pt-3 border-t border-line flex items-baseline justify-between">
        {resolved.solo ? (
          <>
            <p
              className="text-sm font-semibold"
              style={{ color: tierColor(resolved.solo.tier) }}
            >
              {resolved.solo.tier} {resolved.solo.rank}
            </p>
            <p className="text-[11px] text-gray-500">
              {resolved.solo.leaguePoints} LP
              {wr !== null && (
                <span className="text-gray-600"> · {wr}% WR ({resolved.solo.wins}W {resolved.solo.losses}L)</span>
              )}
            </p>
          </>
        ) : (
          <p className="text-[11px] text-gray-500">Unranked Solo/Duo</p>
        )}
      </div>
    </Link>
  );
}

// ============== Champion pool section ==============

function ChampionPoolSection({
  pro,
  champs,
  matchesScanned,
  version,
}: {
  pro: Pro;
  champs: ChampStat[];
  matchesScanned: number;
  version: string;
}) {
  // Show top 8 by games — the long tail isn't useful in a compact view
  const top = champs.slice(0, 8);
  const totalGames = champs.reduce((s, c) => s + c.games, 0);
  const totalWins = champs.reduce((s, c) => s + c.wins, 0);
  const overallWr = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  return (
    <section>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Recent SoloQ activity
          <span className="text-gray-600 font-normal ml-2">
            ({matchesScanned} ranked games)
          </span>
        </h2>
        <p className="text-[11px] text-gray-500">
          Across all of {pro.name}'s resolved accounts ·{' '}
          <span className="text-gray-300">{overallWr}% overall WR</span>
        </p>
      </div>

      {top.length === 0 ? (
        <div className="bg-panel border border-line rounded-lg p-5 text-sm text-gray-400">
          No recent ranked games found.
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-lg p-3 space-y-1">
          {top.map((c) => (
            <ChampStatRow key={c.championKey} stat={c} version={version} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-600 mt-2">
        Solo/Duo and Flex queues only · last 15 games per account, scanned across all resolved accounts.
      </p>
    </section>
  );
}

function ChampStatRow({
  stat,
  version,
}: {
  stat: ChampStat;
  version: string;
}) {
  const wr = Math.round((stat.wins / stat.games) * 100);
  const kdaNumerator = stat.kills + stat.assists;
  const kdaDeaths = Math.max(1, stat.deaths);
  const kda = (kdaNumerator / kdaDeaths).toFixed(2);
  const wrColor = wr >= 60 ? 'text-win' : wr >= 50 ? 'text-gray-200' : 'text-loss';

  return (
    <Link
      href={`/champions/${stat.championKey}`}
      className="grid grid-cols-[40px_minmax(0,1fr)_auto] gap-3 items-center px-2 py-2 rounded hover:bg-panel2/60 transition-colors group"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={champIconUrl(version, stat.championKey)}
        alt={stat.championKey}
        className="w-10 h-10 rounded"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-100 group-hover:text-accent transition-colors truncate">
          {stat.championKey}
          {stat.hasSolo && (
            <span className="ml-2 text-[9px] uppercase tracking-wider text-accent/80 font-normal">
              Solo/Duo
            </span>
          )}
        </p>
        <p className="text-[11px] text-gray-500">
          {stat.games} {stat.games === 1 ? 'game' : 'games'} ·{' '}
          {(kdaNumerator / stat.games).toFixed(1)}/
          {(stat.deaths / stat.games).toFixed(1)} avg ·{' '}
          {kda} KDA
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${wrColor}`}>{wr}%</p>
        <p className="text-[10px] text-gray-500">
          {stat.wins}W {stat.games - stat.wins}L
        </p>
      </div>
    </Link>
  );
}
