import Link from 'next/link';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getRankedByPuuid,
  getMatchIds,
  getMatch,
  PLATFORM_HOSTS,
  PLATFORM_LABELS,
  type Platform,
  type RiotAccount,
  type Summoner,
  type LeagueEntry,
  type Match,
} from '@/lib/riot';
import { getLatestVersion, profileIconUrl, champIconUrl } from '@/lib/ddragon';
import { batchWithLimit } from '@/lib/batch';
import { winrate, tierColor } from '@/lib/format';
import { CompareSearch } from '@/components/CompareSearch';

export const revalidate = 60;

type SP = {
  region?: string;
  a?: string; // "GameName#TAG" (URL-encoded)
  b?: string;
};

type Props = { searchParams: SP };

function parseRiotId(raw?: string): { gameName: string; tagLine: string } | null {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  const idx = decoded.lastIndexOf('#');
  if (idx === -1) return null;
  const gameName = decoded.slice(0, idx).trim();
  const tagLine = decoded.slice(idx + 1).trim();
  if (!gameName || !tagLine) return null;
  return { gameName, tagLine };
}

interface Profile {
  account: RiotAccount;
  summoner: Summoner;
  ranked: LeagueEntry[];
  matches: Match[];
}

async function loadProfile(
  region: Platform,
  gameName: string,
  tagLine: string
): Promise<Profile | { error: string }> {
  try {
    const account = await getAccountByRiotId(region, gameName, tagLine);
    const [summoner, ranked, matchIds] = await Promise.all([
      getSummonerByPuuid(region, account.puuid),
      getRankedByPuuid(region, account.puuid).catch(() => [] as LeagueEntry[]),
      getMatchIds(region, account.puuid, 10).catch(() => [] as string[]),
    ]);
    const matches = await batchWithLimit(matchIds, 5, (id) =>
      getMatch(region, id).catch(() => null)
    );
    return {
      account,
      summoner,
      ranked,
      matches: matches.filter((m): m is Match => m !== null),
    };
  } catch (e: any) {
    return { error: e.message ?? 'Failed to load profile' };
  }
}

export default async function ComparePage({ searchParams }: Props) {
  const region = searchParams.region as Platform | undefined;
  const aId = parseRiotId(searchParams.a);
  const bId = parseRiotId(searchParams.b);

  // Empty state — show the input form and nothing else
  if (!region || !aId || !bId || !(region in PLATFORM_HOSTS)) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">
          Compare <span className="text-accent">summoners</span>
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Side-by-side profile comparison — rank, recent form, top champions.
        </p>
        <CompareSearch />
      </div>
    );
  }

  const version = await getLatestVersion();
  const [aProfile, bProfile] = await Promise.all([
    loadProfile(region, aId.gameName, aId.tagLine),
    loadProfile(region, bId.gameName, bId.tagLine),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Compare on{' '}
            <span className="text-accent">{PLATFORM_LABELS[region]}</span>
          </h1>
        </div>
        <Link
          href="/compare"
          className="text-xs text-gray-400 hover:text-accent transition-colors border border-line rounded-md px-3 py-1.5"
        >
          New comparison
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ProfileColumn
          profile={aProfile}
          region={region}
          version={version}
          fallbackLabel={`${aId.gameName}#${aId.tagLine}`}
        />
        <ProfileColumn
          profile={bProfile}
          region={region}
          version={version}
          fallbackLabel={`${bId.gameName}#${bId.tagLine}`}
        />
      </div>

      {/* Head-to-head row — only if both loaded */}
      {!('error' in aProfile) && !('error' in bProfile) && (
        <>
          <HeadToHead a={aProfile} b={bProfile} />
          <ChampionPoolOverlap a={aProfile} b={bProfile} version={version} />
          <RoleDistributions a={aProfile} b={bProfile} />
          <RecentStreaks a={aProfile} b={bProfile} />
          <BestChampions a={aProfile} b={bProfile} version={version} region={region} />
          <CommonGames a={aProfile} b={bProfile} version={version} region={region} />
        </>
      )}
    </div>
  );
}

function ProfileColumn({
  profile,
  region,
  version,
  fallbackLabel,
}: {
  profile: Profile | { error: string };
  region: Platform;
  version: string;
  fallbackLabel: string;
}) {
  if ('error' in profile) {
    return (
      <div className="bg-panel border border-loss/40 rounded-lg p-5">
        <p className="text-sm text-gray-300 font-semibold">{fallbackLabel}</p>
        <p className="text-xs text-gray-400 mt-2">{profile.error}</p>
      </div>
    );
  }

  const { account, summoner, ranked, matches } = profile;
  const solo = ranked.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  const flex = ranked.find((r) => r.queueType === 'RANKED_FLEX_SR');

  const myGames = matches
    .map((m) => m.info.participants.find((p) => p.puuid === account.puuid))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const recentWins = myGames.filter((p) => p.win).length;
  const recentLosses = myGames.length - recentWins;
  const recentKDA = myGames.length
    ? (
        myGames.reduce((s, p) => s + p.kills + p.assists, 0) /
        Math.max(1, myGames.reduce((s, p) => s + p.deaths, 0))
      ).toFixed(2)
    : '—';

  // Top 3 champions by games played
  const champCounts = new Map<string, { games: number; wins: number }>();
  for (const g of myGames) {
    const c = champCounts.get(g.championName) ?? { games: 0, wins: 0 };
    c.games++;
    if (g.win) c.wins++;
    champCounts.set(g.championName, c);
  }
  const topChamps = Array.from(champCounts.entries())
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 3);

  const profileHref = `/summoner/${region}/${encodeURIComponent(
    account.gameName
  )}-${encodeURIComponent(account.tagLine)}`;

  return (
    <div className="bg-panel border border-line rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profileIconUrl(version, summoner.profileIconId)}
          alt=""
          className="w-14 h-14 rounded-lg border-2 border-accent/40"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={profileHref}
            className="font-bold text-lg truncate hover:text-accent transition-colors block"
          >
            {account.gameName}
            <span className="text-gray-500 font-normal"> #{account.tagLine}</span>
          </Link>
          <p className="text-xs text-gray-500">Level {summoner.summonerLevel}</p>
        </div>
      </div>

      {/* Solo queue */}
      <RankRow label="Solo/Duo" entry={solo} />
      <RankRow label="Flex" entry={flex} />

      {/* Recent form */}
      <div className="border-t border-line pt-3">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Last {myGames.length || 10} games
        </p>
        {myGames.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent games</p>
        ) : (
          <div className="flex items-baseline gap-3 text-sm">
            <span>
              <span className="text-win font-semibold">{recentWins}W</span>
              <span className="text-gray-500"> · </span>
              <span className="text-loss font-semibold">{recentLosses}L</span>
            </span>
            <span className="text-gray-400 text-xs">
              {winrate(recentWins, recentLosses)}% WR · {recentKDA} KDA
            </span>
          </div>
        )}
      </div>

      {/* Top champions */}
      {topChamps.length > 0 && (
        <div className="border-t border-line pt-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Most played recently
          </p>
          <div className="space-y-1.5">
            {topChamps.map(([name, c]) => {
              const wr = winrate(c.wins, c.games - c.wins);
              return (
                <div key={name} className="flex items-center gap-2 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={champIconUrl(version, name)}
                    alt={name}
                    className="w-7 h-7 rounded"
                  />
                  <span className="text-gray-200 flex-1 truncate">{name}</span>
                  <span className="text-xs text-gray-400 font-mono">
                    {c.games}g
                  </span>
                  <span
                    className={`text-xs font-semibold w-10 text-right ${
                      wr >= 60 ? 'text-win' : wr >= 50 ? 'text-accent' : 'text-gray-500'
                    }`}
                  >
                    {wr}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RankRow({ label, entry }: { label: string; entry?: LeagueEntry }) {
  if (!entry) {
    return (
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-sm text-gray-500">Unranked</span>
      </div>
    );
  }
  const wr = winrate(entry.wins, entry.losses);
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="text-right">
        <p
          className="text-sm font-semibold"
          style={{ color: tierColor(entry.tier) }}
        >
          {entry.tier} {entry.rank} · {entry.leaguePoints} LP
        </p>
        <p className="text-[10px] text-gray-500">
          {entry.wins}W {entry.losses}L · {wr}% WR
        </p>
      </div>
    </div>
  );
}

// Simple "who's ahead" summary
function HeadToHead({ a, b }: { a: Profile; b: Profile }) {
  const aSolo = a.ranked.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  const bSolo = b.ranked.find((r) => r.queueType === 'RANKED_SOLO_5x5');

  // Simple "who's ahead in each category" comparison
  const rows: Array<{ label: string; a: string; b: string; winner: 'a' | 'b' | 'tie' }> = [];

  // Level
  rows.push({
    label: 'Level',
    a: String(a.summoner.summonerLevel),
    b: String(b.summoner.summonerLevel),
    winner:
      a.summoner.summonerLevel > b.summoner.summonerLevel
        ? 'a'
        : a.summoner.summonerLevel < b.summoner.summonerLevel
        ? 'b'
        : 'tie',
  });

  // Rank — use numeric tier score for fair comparison
  const aTierScore = tierScore(aSolo);
  const bTierScore = tierScore(bSolo);
  rows.push({
    label: 'Solo rank',
    a: aSolo ? `${aSolo.tier} ${aSolo.rank}` : 'Unranked',
    b: bSolo ? `${bSolo.tier} ${bSolo.rank}` : 'Unranked',
    winner:
      aTierScore > bTierScore ? 'a' : aTierScore < bTierScore ? 'b' : 'tie',
  });

  // Recent WR
  const aGames = a.matches
    .map((m) => m.info.participants.find((p) => p.puuid === a.account.puuid))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const bGames = b.matches
    .map((m) => m.info.participants.find((p) => p.puuid === b.account.puuid))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const aWr = aGames.length
    ? Math.round((aGames.filter((g) => g.win).length / aGames.length) * 100)
    : 0;
  const bWr = bGames.length
    ? Math.round((bGames.filter((g) => g.win).length / bGames.length) * 100)
    : 0;
  rows.push({
    label: 'Recent WR',
    a: aGames.length ? `${aWr}%` : '—',
    b: bGames.length ? `${bWr}%` : '—',
    winner: aWr > bWr ? 'a' : aWr < bWr ? 'b' : 'tie',
  });

  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Head to head
      </h3>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[minmax(0,1fr)_100px_minmax(0,1fr)] gap-2 items-center text-sm"
          >
            <p
              className={`text-right ${
                r.winner === 'a' ? 'text-accent font-semibold' : 'text-gray-400'
              }`}
            >
              {r.a}
            </p>
            <p className="text-center text-xs text-gray-500 uppercase tracking-wider">
              {r.label}
            </p>
            <p
              className={`text-left ${
                r.winner === 'b' ? 'text-accent font-semibold' : 'text-gray-400'
              }`}
            >
              {r.b}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Convert a LeagueEntry to a numeric score for comparison.
// IRON=1, BRONZE=2, …, CHALLENGER=9. Within a tier, subtract division
// (I=0, II=-0.25, III=-0.5, IV=-0.75). LP adds a small fractional bump.
function tierScore(entry?: LeagueEntry): number {
  if (!entry) return 0;
  const tiers: Record<string, number> = {
    IRON: 1,
    BRONZE: 2,
    SILVER: 3,
    GOLD: 4,
    PLATINUM: 5,
    EMERALD: 6,
    DIAMOND: 7,
    MASTER: 8,
    GRANDMASTER: 8.5,
    CHALLENGER: 9,
  };
  const divs: Record<string, number> = { I: 0, II: -0.25, III: -0.5, IV: -0.75 };
  const base = tiers[entry.tier.toUpperCase()] ?? 0;
  const div = divs[entry.rank] ?? 0;
  const lp = entry.leaguePoints / 1000;
  return base + div + lp;
}

// Helper to pull this player's participant record from each match.
function gamesFor(profile: Profile) {
  return profile.matches
    .map((m) => m.info.participants.find((p) => p.puuid === profile.account.puuid))
    .filter((p): p is NonNullable<typeof p> => !!p);
}

// ================== Champion pool overlap ==================
function ChampionPoolOverlap({
  a,
  b,
  version,
}: {
  a: Profile;
  b: Profile;
  version: string;
}) {
  const aChamps = new Set(gamesFor(a).map((g) => g.championName));
  const bChamps = new Set(gamesFor(b).map((g) => g.championName));
  const shared = [...aChamps].filter((c) => bChamps.has(c));

  const aLabel = a.account.gameName;
  const bLabel = b.account.gameName;

  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Champion pool overlap
      </h3>
      {shared.length === 0 ? (
        <p className="text-xs text-gray-500">
          No champions played by both players in their last 10 games.
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">
            Both {aLabel} and {bLabel} have recently played{' '}
            <span className="text-gray-200 font-semibold">{shared.length}</span>{' '}
            of the same {shared.length === 1 ? 'champion' : 'champions'}:
          </p>
          <div className="flex flex-wrap gap-2">
            {shared.map((c) => (
              <Link
                key={c}
                href={`/champions/${c}`}
                className="flex items-center gap-2 bg-panel2/40 border border-line rounded-md px-2 py-1 hover:border-accent transition-colors group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={champIconUrl(version, c)}
                  alt={c}
                  className="w-6 h-6 rounded"
                />
                <span className="text-xs text-gray-300 group-hover:text-accent transition-colors">
                  {c}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ================== Role distributions ==================
function RoleDistributions({ a, b }: { a: Profile; b: Profile }) {
  // Use teamPosition — it's the post-lane assignment Riot does.
  // Values: TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY, or '' for ARAM/bot lane bugs.
  const roles = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const;
  const labels: Record<(typeof roles)[number], string> = {
    TOP: 'Top',
    JUNGLE: 'Jungle',
    MIDDLE: 'Mid',
    BOTTOM: 'Bot',
    UTILITY: 'Support',
  };

  function countRoles(profile: Profile) {
    const games = gamesFor(profile);
    const map: Record<string, number> = {};
    for (const g of games) {
      const r = (g as any).teamPosition || 'UNKNOWN';
      map[r] = (map[r] ?? 0) + 1;
    }
    return { map, total: games.length };
  }

  const aRoles = countRoles(a);
  const bRoles = countRoles(b);
  if (aRoles.total === 0 && bRoles.total === 0) return null;

  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Role distribution (last {Math.max(aRoles.total, bRoles.total)})
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        <RoleBar
          name={a.account.gameName}
          counts={aRoles.map}
          total={aRoles.total}
          roles={roles}
          labels={labels}
        />
        <RoleBar
          name={b.account.gameName}
          counts={bRoles.map}
          total={bRoles.total}
          roles={roles}
          labels={labels}
        />
      </div>
    </div>
  );
}

function RoleBar({
  name,
  counts,
  total,
  roles,
  labels,
}: {
  name: string;
  counts: Record<string, number>;
  total: number;
  roles: readonly ('TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY')[];
  labels: Record<string, string>;
}) {
  if (total === 0) {
    return (
      <div>
        <p className="text-xs text-gray-400 mb-2 truncate">{name}</p>
        <p className="text-[11px] text-gray-600">No recent games</p>
      </div>
    );
  }
  const colors: Record<string, string> = {
    TOP: 'bg-orange-500',
    JUNGLE: 'bg-emerald-500',
    MIDDLE: 'bg-purple-500',
    BOTTOM: 'bg-red-500',
    UTILITY: 'bg-blue-500',
  };
  return (
    <div>
      <p className="text-xs text-gray-300 mb-2 truncate" title={name}>
        {name}
      </p>
      <div className="flex h-3 rounded-full overflow-hidden bg-panel2 mb-2">
        {roles.map((r) => {
          const pct = ((counts[r] ?? 0) / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={r}
              className={colors[r]}
              style={{ width: `${pct}%` }}
              title={`${labels[r]}: ${counts[r]}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
        {roles.map((r) => {
          const n = counts[r] ?? 0;
          if (n === 0) return null;
          return (
            <span key={r} className="flex items-center gap-1 text-gray-400">
              <span className={`w-2 h-2 rounded-full ${colors[r]}`} />
              {labels[r]} {n}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ================== Recent streaks — last-10 W/L sequence ==================
function RecentStreaks({ a, b }: { a: Profile; b: Profile }) {
  function streak(profile: Profile) {
    // Matches are already ordered newest-first from the Riot API.
    return gamesFor(profile).map((g) => g.win);
  }
  const aSeq = streak(a);
  const bSeq = streak(b);
  if (aSeq.length === 0 && bSeq.length === 0) return null;

  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Recent form (newest → oldest)
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        <StreakRow name={a.account.gameName} results={aSeq} />
        <StreakRow name={b.account.gameName} results={bSeq} />
      </div>
    </div>
  );
}

function StreakRow({ name, results }: { name: string; results: boolean[] }) {
  const wins = results.filter(Boolean).length;
  const losses = results.length - wins;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs text-gray-300 truncate" title={name}>
          {name}
        </p>
        <p className="text-[11px] text-gray-500">
          <span className="text-win font-semibold">{wins}W</span>{' '}
          <span className="text-loss font-semibold">{losses}L</span>
        </p>
      </div>
      {results.length === 0 ? (
        <p className="text-[11px] text-gray-600">No recent games</p>
      ) : (
        <div className="flex gap-1">
          {results.map((win, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                win ? 'bg-win/20 text-win' : 'bg-loss/20 text-loss'
              }`}
              title={`Game ${i + 1}: ${win ? 'Win' : 'Loss'}`}
            >
              {win ? 'W' : 'L'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================== Best champion by WR (min 2 games) ==================
function BestChampions({
  a,
  b,
  version,
  region,
}: {
  a: Profile;
  b: Profile;
  version: string;
  region: Platform;
}) {
  function best(profile: Profile) {
    const games = gamesFor(profile);
    const stats = new Map<string, { games: number; wins: number; kda: number }>();
    for (const g of games) {
      const s = stats.get(g.championName) ?? { games: 0, wins: 0, kda: 0 };
      s.games++;
      if (g.win) s.wins++;
      const deaths = Math.max(1, g.deaths);
      s.kda += (g.kills + g.assists) / deaths;
      stats.set(g.championName, s);
    }
    // Require at least 2 games to dampen small-sample luck.
    const candidates = Array.from(stats.entries()).filter(
      ([, s]) => s.games >= 2
    );
    if (candidates.length === 0) return null;
    // Sort by WR then KDA as tiebreaker
    candidates.sort((x, y) => {
      const xWr = x[1].wins / x[1].games;
      const yWr = y[1].wins / y[1].games;
      if (xWr !== yWr) return yWr - xWr;
      return y[1].kda / y[1].games - x[1].kda / x[1].games;
    });
    const [name, s] = candidates[0];
    return {
      name,
      games: s.games,
      wr: Math.round((s.wins / s.games) * 100),
      avgKda: (s.kda / s.games).toFixed(2),
    };
  }

  const aBest = best(a);
  const bBest = best(b);
  if (!aBest && !bBest) return null;

  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Best champion (2+ games)
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        <BestChampCard name={a.account.gameName} best={aBest} version={version} />
        <BestChampCard name={b.account.gameName} best={bBest} version={version} />
      </div>
    </div>
  );
}

function BestChampCard({
  name,
  best,
  version,
}: {
  name: string;
  best: { name: string; games: number; wr: number; avgKda: string } | null;
  version: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-300 mb-2 truncate" title={name}>
        {name}
      </p>
      {!best ? (
        <p className="text-[11px] text-gray-600">Not enough games</p>
      ) : (
        <Link
          href={`/champions/${best.name}`}
          className="flex items-center gap-3 bg-panel2/40 border border-line rounded-md p-2 hover:border-accent transition-colors group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={champIconUrl(version, best.name)}
            alt={best.name}
            className="w-10 h-10 rounded"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-100 group-hover:text-accent transition-colors truncate">
              {best.name}
            </p>
            <p className="text-[11px] text-gray-500">
              <span className="text-win">{best.wr}%</span> WR · {best.games}{' '}
              games · {best.avgKda} KDA
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}

// ================== Games played against each other ==================
// Scan both players' recent match histories; any match ID that appears in
// both means they were in the same game (either teammates or opponents).
function CommonGames({
  a,
  b,
  version,
  region,
}: {
  a: Profile;
  b: Profile;
  version: string;
  region: Platform;
}) {
  const aIds = new Set(a.matches.map((m) => m.metadata.matchId));
  const shared = b.matches.filter((m) => aIds.has(m.metadata.matchId));
  if (shared.length === 0) return null;

  const rows = shared.map((m) => {
    const aP = m.info.participants.find((p) => p.puuid === a.account.puuid)!;
    const bP = m.info.participants.find((p) => p.puuid === b.account.puuid)!;
    const sameTeam = aP.teamId === bP.teamId;
    return { match: m, aP, bP, sameTeam };
  });

  const teammatesCount = rows.filter((r) => r.sameTeam).length;
  const opponentsCount = rows.length - teammatesCount;

  return (
    <div className="bg-panel border border-accent/40 rounded-lg p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-accent mb-1">
        Played together
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        Found {rows.length} shared match{rows.length === 1 ? '' : 'es'} in their
        recent histories ({teammatesCount} as teammates, {opponentsCount} as
        opponents).
      </p>
      <div className="space-y-2">
        {rows.map(({ match, aP, bP, sameTeam }) => (
          <div
            key={match.metadata.matchId}
            className="flex items-center gap-3 bg-panel2/40 border border-line rounded-md p-2 text-xs"
          >
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
                sameTeam
                  ? 'text-accent bg-accent/10 border-accent/30'
                  : 'text-yellow-300 bg-yellow-500/10 border-yellow-400/30'
              }`}
            >
              {sameTeam ? 'Together' : 'vs'}
            </span>
            <ChampPill name={aP.championName} won={aP.win} version={version} />
            <span className="text-gray-600">—</span>
            <ChampPill name={bP.championName} won={bP.win} version={version} />
            <Link
              href={`/summoner/${region}/${encodeURIComponent(
                a.account.gameName
              )}-${encodeURIComponent(a.account.tagLine)}#${match.metadata.matchId}`}
              className="ml-auto text-[10px] text-gray-500 hover:text-accent transition-colors"
            >
              View →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChampPill({
  name,
  won,
  version,
}: {
  name: string;
  won: boolean;
  version: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={champIconUrl(version, name)}
        alt={name}
        className={`w-6 h-6 rounded border ${
          won ? 'border-win/40' : 'border-loss/40'
        }`}
      />
      <span className={`${won ? 'text-win' : 'text-loss'} font-medium`}>
        {name}
      </span>
    </div>
  );
}
