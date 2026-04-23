import Link from 'next/link';
import { PRO_PLAYERS } from '@/lib/pros';
import { PLATFORM_LABELS } from '@/lib/regions';

// Server component — purely static links. No API calls are made here.
// Each card is a link into /summoner/[region]/[name-tag] which will fetch
// the live data for that profile on demand.
export function FeaturedPros() {
  // Group by region for clearer presentation
  const byRegion = PRO_PLAYERS.reduce<Record<string, typeof PRO_PLAYERS>>(
    (acc, p) => {
      (acc[p.region] ??= []).push(p);
      return acc;
    },
    {}
  );

  return (
    <section className="mt-16 max-w-4xl mx-auto">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-semibold">Featured pros</h2>
        <p className="text-xs text-gray-500">Click to view profile</p>
      </div>

      <div className="space-y-5">
        {Object.entries(byRegion).map(([region, pros]) => (
          <div key={region}>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">
              {PLATFORM_LABELS[region as keyof typeof PLATFORM_LABELS]}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {pros.map((p) => {
                const href = `/summoner/${p.region}/${encodeURIComponent(
                  p.gameName
                )}-${encodeURIComponent(p.tagLine)}`;
                return (
                  <Link
                    key={`${p.region}-${p.gameName}-${p.tagLine}`}
                    href={href}
                    className="bg-panel border border-line rounded-md p-3 hover:border-accent hover:bg-panel2/60 transition-colors group"
                  >
                    <p className="font-semibold text-sm group-hover:text-accent transition-colors truncate">
                      {p.label}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{p.subtitle}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
