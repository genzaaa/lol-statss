'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Pro } from '@/lib/pros';
import { PLATFORM_LABELS, type Platform } from '@/lib/regions';

// A league has one or more teams; we display teams grouped under a league
// header. The leagues are just a best-effort grouping; if a team doesn't
// fit any, it gets sorted into "Other".
const LEAGUE_FOR_TEAM: Record<string, string> = {
  'T1': 'LCK',
  'Gen.G': 'LCK',
  'Hanwha Life Esports': 'LCK',
  'G2 Esports': 'LEC',
  'Fnatic': 'LEC',
  'Witchcraft': 'LEC',
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

// How many pros to show in each league before "Show all" is clicked
const DEFAULT_PER_LEAGUE = 4;

export function ProsBrowser({ pros }: { pros: Pro[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize query from URL so /pros?q=faker is shareable
  const [query, setQuery] = useState(() => searchParams?.get('q') ?? '');
  const [expandedLeagues, setExpandedLeagues] = useState<Set<League>>(new Set());

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

  // Group filtered results by league
  const grouped = useMemo(() => {
    const groups = new Map<League, Pro[]>();
    for (const l of LEAGUE_ORDER) groups.set(l, []);
    for (const pro of filtered) {
      const l = leagueFor(pro.team);
      groups.get(l)!.push(pro);
    }
    return groups;
  }, [filtered]);

  const isSearching = query.trim().length > 0;

  const toggleExpand = useCallback((l: League) => {
    setExpandedLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  }, []);

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

      {/* League sections */}
      {LEAGUE_ORDER.map((league) => {
        const prosInLeague = grouped.get(league) ?? [];
        if (prosInLeague.length === 0) return null;

        // When actively searching we always show everything matched.
        // When browsing (no query), limit to DEFAULT_PER_LEAGUE unless expanded.
        const expanded = isSearching || expandedLeagues.has(league);
        const visible = expanded
          ? prosInLeague
          : prosInLeague.slice(0, DEFAULT_PER_LEAGUE);
        const hiddenCount = prosInLeague.length - visible.length;

        return (
          <section key={league}>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                {leagueLabel(league)}
                <span className="text-gray-600 font-normal ml-2">
                  ({prosInLeague.length})
                </span>
              </h2>
              {!isSearching && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => toggleExpand(league)}
                  className="text-xs text-gray-400 hover:text-accent transition-colors"
                >
                  Show all {prosInLeague.length}
                </button>
              )}
              {!isSearching && expanded && prosInLeague.length > DEFAULT_PER_LEAGUE && (
                <button
                  type="button"
                  onClick={() => toggleExpand(league)}
                  className="text-xs text-gray-400 hover:text-accent transition-colors"
                >
                  Show fewer
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-3">
              {visible.map((pro) => (
                <ProCard key={pro.slug} pro={pro} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------------- Pro card ----------------

function ProCard({ pro }: { pro: Pro }) {
  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h3 className="font-semibold text-lg">{pro.name}</h3>
        <RoleBadge role={pro.role} />
      </div>
      <p className="text-xs text-gray-400 mb-3">
        <span className="text-gray-200">{pro.team}</span>
        <span className="text-gray-600"> · </span>
        <span>{pro.country}</span>
      </p>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
          Accounts ({pro.accounts.length})
        </p>
        {pro.accounts.map((acc, i) => {
          const href = `/summoner/${acc.region}/${encodeURIComponent(
            acc.gameName
          )}-${encodeURIComponent(acc.tagLine)}`;
          return (
            <Link
              key={`${pro.slug}-${i}`}
              href={href}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-panel2 text-sm transition-colors group"
            >
              <span className="text-[10px] uppercase font-mono text-gray-500 w-10 flex-shrink-0">
                {PLATFORM_LABELS[acc.region]}
              </span>
              <span className="text-gray-200 truncate group-hover:text-accent transition-colors">
                {acc.gameName}
              </span>
              <span className="text-gray-500 truncate">#{acc.tagLine}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

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
