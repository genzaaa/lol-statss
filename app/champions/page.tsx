import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getAllChampions, getLatestVersion } from '@/lib/ddragon';
import { ChampionsBrowser } from '@/components/ChampionsBrowser';

export const metadata: Metadata = {
  title: 'Champions — LoL Stats',
  description:
    "Browse every League of Legends champion. Real ability data from Riot's Data Dragon.",
};

// ChampionsBrowser reads `?q=` and `?role=` from the URL via
// useSearchParams(), which requires either a Suspense boundary or dynamic
// rendering. Same pattern as /pros.
export const dynamic = 'force-dynamic';

export default async function ChampionsPage() {
  const [champions, version] = await Promise.all([
    getAllChampions(),
    getLatestVersion(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">
          All <span className="text-accent">champions</span>
        </h1>
        <p className="text-gray-400 text-sm">
          {champions.length} champions · patch {version} · data from{' '}
          <a
            href="https://developer.riotgames.com/docs/lol#data-dragon"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Data Dragon
          </a>
          . Click a champion for abilities and build guides.
        </p>
      </div>

      <Suspense fallback={<ChampionsBrowserFallback />}>
        <ChampionsBrowser champions={champions} version={version} />
      </Suspense>
    </div>
  );
}

function ChampionsBrowserFallback() {
  return (
    <div className="space-y-4">
      <div className="h-11 bg-panel border border-line rounded-lg animate-pulse" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="h-24 bg-panel/40 border border-line rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
