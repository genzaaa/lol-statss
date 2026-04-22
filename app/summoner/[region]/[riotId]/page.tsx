import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getRankedByPuuid,
  getRankedBySummonerId,
  getMatchIds,
  getMatch,
  getCurrentGame,
  PLATFORM_HOSTS,
  PLATFORM_LABELS,
  type Platform,
  type LeagueEntry,
} from '@/lib/riot';
import { getLatestVersion, profileIconUrl } from '@/lib/ddragon';
import { batchWithLimit } from '@/lib/batch';
import { RankedCard } from '@/components/RankedCard';
import { MatchList } from '@/components/MatchList';
import { MasteryPanel } from '@/components/MasteryPanel';
import { LiveGameBanner } from '@/components/LiveGameBanner';
import { winrate } from '@/lib/format';

// Revalidate the page every 60 seconds
export const revalidate = 60;

type Props = {
  params: { region: string; riotId: string };
};

// Parse the URL slug ("GameName-TAG") into { gameName, tagLine } or null.
function parseSlug(raw: string): { gameName: string; tagLine: string } | null {
  const decoded = decodeURIComponent(raw);
  const dashIdx = decoded.lastIndexOf('-');
  if (dashIdx === -1) return null;
  return {
    gameName: decoded.slice(0, dashIdx),
    tagLine: decoded.slice(dashIdx + 1),
  };
}

// ============================================================
// Open Graph metadata — produces a rich link preview (Discord, Twitter, etc.)
// ============================================================
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const region = params.region as Platform;
  if (!(region in PLATFORM_HOSTS)) {
    return { title: 'Summoner not found' };
  }
  const parsed = parseSlug(params.riotId);
  if (!parsed) return { title: 'Summoner not found' };

  try {
    // These calls hit the same per-URL cache the page uses, so they cost nothing extra
    const account = await getAccountByRiotId(region, parsed.gameName, parsed.tagLine);
    const summoner = await getSummonerByPuuid(region, account.puuid);
    let ranked: LeagueEntry[] = [];
    try {
      ranked = await getRankedByPuuid(region, account.puuid);
    } catch {
      // unranked is fine
    }
    const version = await getLatestVersion();
    const solo = ranked.find((r) => r.queueType === 'RANKED_SOLO_5x5');

    const title = `${account.gameName}#${account.tagLine} · ${PLATFORM_LABELS[region]}`;
    const rankPart = solo
      ? `${solo.tier} ${solo.rank} · ${solo.leaguePoints} LP · ${winrate(
          solo.wins,
          solo.losses
        )}% WR`
      : 'Unranked';
    const description = `Level ${summoner.summonerLevel} · ${rankPart}. View match history, champion mastery, and live game.`;

    const iconUrl = profileIconUrl(version, summoner.profileIconId);

    return {
      title: `${title} — LoL Stats`,
      description,
      openGraph: {
        title,
        description,
        type: 'profile',
        images: [{ url: iconUrl, width: 256, height: 256, alt: account.gameName }],
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: [iconUrl],
      },
    };
  } catch {
    return {
      title: `${parsed.gameName}#${parsed.tagLine} — LoL Stats`,
      description: 'League of Legends summoner profile.',
    };
  }
}

export default async function SummonerPage({ params }: Props) {
  const region = params.region as Platform;
  if (!(region in PLATFORM_HOSTS)) notFound();

  // URL format: GameName-TAG (both URL-encoded)
  const decoded = decodeURIComponent(params.riotId);
  const dashIdx = decoded.lastIndexOf('-');
  if (dashIdx === -1) notFound();
  const gameName = decoded.slice(0, dashIdx);
  const tagLine = decoded.slice(dashIdx + 1);

  let account: Awaited<ReturnType<typeof getAccountByRiotId>>;
  let summoner: Awaited<ReturnType<typeof getSummonerByPuuid>>;
  let version: string;
  let matchIds: string[];

  try {
    account = await getAccountByRiotId(region, gameName, tagLine);

    // Fetch everything else in parallel. Ranked is split out because we try
    // the PUUID endpoint first and fall back to summoner-id if it fails.
    [summoner, matchIds, version] = await Promise.all([
      getSummonerByPuuid(region, account.puuid),
      getMatchIds(region, account.puuid, 10),
      getLatestVersion(),
    ]);
  } catch (e: any) {
    return (
      <ErrorPanel
        title="Could not load summoner"
        message={e.message || 'Something went wrong'}
        region={region}
      />
    );
  }

  // Resolve ranked info — PUUID endpoint is the current one, fall back otherwise
  let ranked: LeagueEntry[];
  try {
    ranked = await getRankedByPuuid(region, account.puuid);
  } catch {
    try {
      ranked = await getRankedBySummonerId(region, summoner.id);
    } catch {
      ranked = [];
    }
  }

  // Live game + match details in parallel
  const [currentGame, initialMatches] = await Promise.all([
    getCurrentGame(region, account.puuid).catch(() => null),
    batchWithLimit(matchIds, 5, (id) => getMatch(region, id).catch(() => null)),
  ]);

  const validMatches = initialMatches.filter(
    (m): m is NonNullable<typeof m> => m !== null
  );

  const solo = ranked.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  const flex = ranked.find((r) => r.queueType === 'RANKED_FLEX_SR');

  // Aggregate recent-game stats
  const myGames = validMatches
    .map((m) => m.info.participants.find((p) => p.puuid === account.puuid))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const recentWins = myGames.filter((p) => p.win).length;
  const recentLosses = myGames.length - recentWins;
  const recentKDA = myGames.length
    ? (
        myGames.reduce((s, p) => s + p.kills + p.assists, 0) /
        Math.max(1, myGames.reduce((s, p) => s + p.deaths, 0))
      ).toFixed(2)
    : '0';

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="bg-panel border border-line rounded-lg p-5 flex items-center gap-4">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profileIconUrl(version, summoner.profileIconId)}
            alt=""
            className="w-20 h-20 rounded-lg border-2 border-accent/40"
          />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-accent text-ink text-[11px] font-bold px-2 py-0.5 rounded-full">
            {summoner.summonerLevel}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{account.gameName}</h1>
            <span className="text-gray-400 text-lg">#{account.tagLine}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {PLATFORM_LABELS[region]} · Level {summoner.summonerLevel}
          </p>
        </div>
        <Link
          href="/"
          className="text-xs text-gray-400 hover:text-accent transition-colors border border-line rounded-md px-3 py-1.5"
        >
          ← New search
        </Link>
      </div>

      {/* Live game banner */}
      {currentGame && (
        <LiveGameBanner game={currentGame} puuid={account.puuid} version={version} />
      )}

      {/* Ranked + recent summary */}
      <div className="grid md:grid-cols-3 gap-3">
        <RankedCard entry={solo} label="Ranked Solo/Duo" />
        <RankedCard entry={flex} label="Ranked Flex" />
        <div className="bg-panel border border-line rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Last {myGames.length || 10} Games
          </p>
          {myGames.length === 0 ? (
            <p className="text-gray-400 text-sm">No recent games</p>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="#232b42"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke={recentWins >= recentLosses ? '#28c76f' : '#ea5455'}
                    strokeWidth="3"
                    strokeDasharray={`${(recentWins / myGames.length) * 94.25} 94.25`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  {winrate(recentWins, recentLosses)}%
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">
                  <span className="text-win">{recentWins}W</span>{' '}
                  <span className="text-loss">{recentLosses}L</span>
                </p>
                <p className="text-xs text-gray-400">{recentKDA} KDA</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Champion mastery */}
      <MasteryPanel region={region} puuid={account.puuid} version={version} />

      {/* Match history with queue filter + pagination */}
      <MatchList
        region={region}
        puuid={account.puuid}
        version={version}
        initialMatches={validMatches}
        initialQueue="all"
      />
    </div>
  );
}

function ErrorPanel({
  title,
  message,
  region,
}: {
  title: string;
  message: string;
  region: string;
}) {
  const isNotFound = /404/.test(message);
  return (
    <div className="max-w-lg mx-auto bg-panel border border-loss/40 rounded-lg p-6 text-center">
      <h1 className="text-xl font-semibold mb-2">{title}</h1>
      <p className="text-gray-400 text-sm mb-4">
        {isNotFound
          ? "We couldn't find that Riot ID on this region. Check the spelling and region."
          : message}
      </p>
      <p className="text-xs text-gray-500 mb-4">Region: {region}</p>
      <Link
        href="/"
        className="inline-block bg-accent text-ink font-semibold px-5 py-2 rounded-md hover:bg-accent/90 transition-colors"
      >
        ← Back to search
      </Link>
    </div>
  );
}
