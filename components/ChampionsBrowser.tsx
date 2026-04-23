'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ChampionSummary } from '@/lib/ddragon';
import { champIconUrl } from '@/lib/ddragon';

// Roles we expose in the filter. Data Dragon's `tags` array uses these
// canonical strings, so we don't need any translation.
const ROLE_OPTIONS = [
  { value: 'all',      label: 'All roles' },
  { value: 'Assassin', label: 'Assassin' },
  { value: 'Fighter',  label: 'Fighter' },
  { value: 'Mage',     label: 'Mage' },
  { value: 'Marksman', label: 'Marksman' },
  { value: 'Support',  label: 'Support' },
  { value: 'Tank',     label: 'Tank' },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]['value'];

interface Props {
  champions: ChampionSummary[];
  version: string;
}

export function ChampionsBrowser({ champions, version }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(() => searchParams?.get('q') ?? '');
  const [role, setRole] = useState<RoleValue>(() => {
    const r = searchParams?.get('role');
    if (r && ROLE_OPTIONS.some((o) => o.value === r)) return r as RoleValue;
    return 'all';
  });

  // Debounced URL sync so ?q=&role= is shareable
  useEffect(() => {
    const t = setTimeout(() => {
      const newParams = new URLSearchParams();
      if (query.trim()) newParams.set('q', query.trim());
      if (role !== 'all') newParams.set('role', role);
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return champions.filter((c) => {
      if (role !== 'all' && !c.tags.includes(role)) return false;
      if (!q) return true;
      if (c.name.toLowerCase().includes(q)) return true;
      if (c.title.toLowerCase().includes(q)) return true;
      if (c.id.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [champions, query, role]);

  return (
    <div className="space-y-4">
      {/* Search + role filter row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search champion…"
            className="w-full bg-panel border border-line rounded-lg px-4 py-2.5 text-sm pl-10 focus:border-accent focus:outline-none"
            aria-label="Search champions"
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

        <div className="flex bg-panel border border-line rounded-lg overflow-hidden">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              className={`px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                role === opt.value
                  ? 'bg-accent text-ink'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-panel2'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Showing {filtered.length} of {champions.length} champions
      </p>

      {filtered.length === 0 ? (
        <div className="bg-panel border border-line rounded-lg p-8 text-center text-sm text-gray-400">
          No champions match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/champions/${c.id}`}
              className="group flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-panel2/60 transition-colors"
              title={`${c.name} — ${c.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={champIconUrl(version, c.id)}
                alt={c.name}
                className="w-14 h-14 rounded-md border-2 border-line group-hover:border-accent transition-colors"
              />
              <span className="text-xs text-gray-200 group-hover:text-accent transition-colors truncate w-full text-center">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
