'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Pro } from '@/lib/pros';

// A league has one or more teams; we display teams grouped under a league
// header. The leagues are just a best-effort grouping; if a team doesn't
// fit any, it gets sorted into "Other".
const LEAGUE_FOR_TEAM: Record<string, string> = {
  // LCK
  'T1': 'LCK',
  'Gen.G': 'LCK',
  'Hanwha Life Esports': 'LCK',
  'KT Rolster': 'LCK',
  'Dplus KIA': 'LCK',
  // LEC
  'G2 Esports': 'LEC',
  'Fnatic': 'LEC',
  'Karmine Corp': 'LEC',
  'Team Heretics': 'LEC',
  'Witchcraft': 'LEC',
  'Los Ratones': 'LEC',
  // LCS
  'Team Liquid': 'LCS',
  'Cloud9': 'LCS',
  'FlyQuest': 'LCS',
  // LPL
  'Bilibili Gaming': 'LPL',
};

const LEAGUE_ORDER = ['LCK', 'LEC', 'LCS', 'LPL', 'Other'] as const;
type League = typeof LEAGUE_ORDER[number];

function leagueFor(team: string): League {
  return (LEAGUE_FOR_TEAM[team] as League) ?? 'Other';
}

function leagueLabel(l: League): string {
  if (l === 'LCK') return 'LCK (Korea)';
  if (l === 'LEC') return 'LEC (Europe)';
  if (l === 'LCS') return 'LCS (North America)';
  if (l === 'LPL') return 'LPL (China)';
  return 'Other';
}

// Default visible pros count per team (typically 5 for a full LCK roster
// without coach, up to ~7 with subs and coach). All shown by default.

export function ProsBrowser({ pros }: { pros: Pro[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize query from URL so /pros?q=faker is shareable
  const [query, setQuery] = useState(() => searchParams?.get('q') ?? '');

  // Debounced URL sync — keeps ?q= in sync but without spamming router.replace
  useEffect(() => {
    const t = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams?.toString() ?? '');
      if (query.trim()) newParams.set('q', query.trim());
      else newParams.delete('q');
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Filtering: case-insensitive match on name, team, country, or any
  // account's gameName/tagLine
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pros;
    return pros.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.team.toLowerCase().includes(q)) return true;
      if (p.country.toLowerCase().includes(q)) return true;
      if (p.role.toLowerCase().includes(q)) return true;
      for (const a of p.accounts) {
        if (a.gameName.toLowerCase().includes(q)) return true;
        if (a.tagLine.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [pros, query]);

  // Group filtered results by league, then by team within each league.
  // Within a team, sort by role for the standard Top→Jungle→Mid→Bot→Support
  // reading order that matches roster pages on OP.GG / Leaguepedia.
  const ROLE_ORDER: Record<string, number> = {
    Top: 0,
    Jungle: 1,
    Mid: 2,
    Bot: 3,
    Support: 4,
    Coach: 5,
  };

  const groupedByLeagueAndTeam = useMemo(() => {
    // Map<League, Map<TeamName, Pro[]>>
    const out = new Map<League, Map<string, Pro[]>>();
    for (const l of LEAGUE_ORDER) out.set(l, new Map());
    for (const pro of filtered) {
      const league = leagueFor(pro.team);
      const teams = out.get(league)!;
      const arr = teams.get(pro.team) ?? [];
      arr.push(pro);
      teams.set(pro.team, arr);
    }
    // Sort each team's roster by role
    for (const teams of out.values()) {
      for (const arr of teams.values()) {
        arr.sort(
          (a, b) =>
            (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99) ||
            a.name.localeCompare(b.name)
        );
      }
    }
    return out;
  }, [filtered]);

  const isSearching = query.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, team, country, or account…"
          className="w-full bg-panel border border-line rounded-lg px-4 py-3 text-sm pl-10 focus:border-accent focus:outline-none"
          aria-label="Search pros"
          autoFocus
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-200 px-2"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="bg-panel border border-line rounded-lg p-8 text-center text-sm text-gray-400">
          No pros matched "{query}".
        </div>
      )}

      {/* League sections — each league has team subsections, each team has its roster */}
      {LEAGUE_ORDER.map((league) => {
        const teamsMap = groupedByLeagueAndTeam.get(league) ?? new Map();
        const teamNames = Array.from(teamsMap.keys()).sort();
        const totalProsInLeague = teamNames.reduce(
          (s, t) => s + (teamsMap.get(t)?.length ?? 0),
          0
        );
        if (totalProsInLeague === 0) return null;

        return (
          <section key={league}>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                {leagueLabel(league)}
                <span className="text-gray-600 font-normal ml-2">
                  ({totalProsInLeague} {totalProsInLeague === 1 ? 'player' : 'players'})
                </span>
              </h2>
            </div>

            {/* One row per team */}
            <div className="space-y-4">
              {teamNames.map((teamName) => {
                const roster = teamsMap.get(teamName) ?? [];
                return (
                  <TeamSection
                    key={teamName}
                    teamName={teamName}
                    roster={roster}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------------- Team section ----------------

function TeamSection({
  teamName,
  roster,
}: {
  teamName: string;
  roster: Pro[];
}) {
  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold text-base">{teamName}</h3>
        <p className="text-[10px] uppercase tracking-wider text-gray-500">
          {roster.length} {roster.length === 1 ? 'player' : 'players'}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {roster.map((pro) => (
          <RosterPlayerCard key={pro.slug} pro={pro} />
        ))}
      </div>
    </div>
  );
}

// Compact player card for the roster grid — focused on identity and role,
// not on the full account list (which lives on /pros/<slug>).
function RosterPlayerCard({ pro }: { pro: Pro }) {
  return (
    <Link
      href={`/pros/${pro.slug}`}
      className="block bg-panel2/40 hover:bg-panel2 border border-line hover:border-accent rounded-md p-2.5 transition-colors group"
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="font-semibold text-sm text-gray-100 group-hover:text-accent transition-colors truncate">
          {pro.name}
        </p>
        <RoleBadge role={pro.role} />
      </div>
      <p className="text-[10px] text-gray-500 truncate" title={pro.country}>
        {pro.country}
      </p>
      <p className="text-[10px] text-gray-600 mt-1">
        {pro.accounts.length} {pro.accounts.length === 1 ? 'account' : 'accounts'}
      </p>
    </Link>
  );
}

// ---------------- Pro card ----------------

function RoleBadge({ role }: { role: Pro['role'] }) {
  const colors: Record<Pro['role'], string> = {
    Top:     'bg-orange-500/15 text-orange-300 border-orange-400/30',
    Jungle:  'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    Mid:     'bg-purple-500/15 text-purple-300 border-purple-400/30',
    Bot:     'bg-red-500/15 text-red-300 border-red-400/30',
    Support: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
    Coach:   'bg-gray-500/15 text-gray-300 border-gray-500/30',
  };
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider border rounded px-2 py-0.5 ${colors[role]}`}
    >
      {role}
    </span>
  );
}
