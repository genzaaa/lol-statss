'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PROS, type Pro } from '@/lib/pros';

interface Props {
  currentPro: Pro;
}

/**
 * Compact dropdown that navigates to /compare/pros/<currentPro>/<chosen>
 * when the user selects another pro. Filters by team / region for
 * easier navigation in a 55+ pro list.
 */
export function CompareToPicker({ currentPro }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  // Other pros only — never offer to compare a pro with themselves
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PROS.filter((p) => {
      if (p.slug === currentPro.slug) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q)
      );
    }).slice(0, 12);
  }, [search, currentPro.slug]);

  function pick(other: Pro) {
    router.push(`/compare/pros/${currentPro.slug}/${other.slug}`);
  }

  return (
    <section className="bg-panel border border-line rounded-lg p-4">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Compare {currentPro.name} to…
        </h2>
        <span className="text-[11px] text-gray-500">
          Find shared SoloQ matches and head-to-head record
        </span>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, team, or country…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full bg-panel2 border border-line rounded-md px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-accent"
        />
        {open && candidates.length > 0 && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-panel2 border border-line rounded-md shadow-lg max-h-64 overflow-y-auto">
            {candidates.map((p) => (
              <button
                key={p.slug}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-panel/60 transition-colors flex items-baseline justify-between gap-2 border-b border-line last:border-0"
              >
                <span>
                  <span className="font-semibold text-gray-100">{p.name}</span>
                  <span className="text-gray-500 ml-2 text-xs">
                    {p.team} · {p.role}
                  </span>
                </span>
                <span className="text-[10px] text-gray-600">{p.country}</span>
              </button>
            ))}
          </div>
        )}
        {open && search.trim() && candidates.length === 0 && (
          <p className="absolute z-10 left-0 right-0 mt-1 bg-panel2 border border-line rounded-md p-3 text-xs text-gray-500">
            No matching pros.
          </p>
        )}
      </div>
    </section>
  );
}
