'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PLATFORM_LABELS, type Platform } from '@/lib/regions';
import { RecentSearches, pushRecentSearch } from '@/components/RecentSearches';
import { LiveProsWidget } from '@/components/LiveProsWidget';

const REGIONS = Object.keys(PLATFORM_LABELS) as Array<keyof typeof PLATFORM_LABELS>;

export default function Home() {
  const router = useRouter();
  const [region, setRegion] = useState<Platform>('euw1');
  const [riotId, setRiotId] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = riotId.trim();
    if (!trimmed) return;

    // Accept "Name#TAG" or "Name #TAG"
    const hashIdx = trimmed.lastIndexOf('#');
    if (hashIdx === -1) {
      alert('Please enter a Riot ID in the format: Name#TAG');
      return;
    }
    const gameName = trimmed.slice(0, hashIdx).trim();
    const tagLine = trimmed.slice(hashIdx + 1).trim();
    if (!gameName || !tagLine) {
      alert('Please enter a Riot ID in the format: Name#TAG');
      return;
    }

    pushRecentSearch({ region, gameName, tagLine });

    const encoded = `${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
    router.push(`/summoner/${region}/${encoded}`);
  }

  return (
    <div className="py-8 md:py-20">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          Look up any <span className="text-accent">summoner</span>
        </h1>
        <p className="text-gray-400 mb-12 text-lg">
          Profile, rank, match history, and live game detection.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as Platform)}
            className="bg-panel border border-line rounded-lg px-4 py-3 text-sm font-medium focus:border-accent focus:outline-none cursor-pointer"
            aria-label="Region"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {PLATFORM_LABELS[r]}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            placeholder="GameName#TAG"
            className="flex-1 bg-panel border border-line rounded-lg px-4 py-3 focus:border-accent focus:outline-none placeholder:text-gray-600"
          />
          <button
            type="submit"
            className="bg-accent hover:bg-accent/90 text-ink font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          Example: Faker#KR1 (KR) • Caps#EUW (EUW)
        </p>
      </div>

      <RecentSearches />

      <LiveProsWidget />

      <div className="grid md:grid-cols-3 gap-4 mt-20">
        <FeatureCard
          title="Profile & Rank"
          body="See level, rank, LP, and win rate across Solo/Duo and Flex queues."
        />
        <FeatureCard
          title="Match History"
          body="Detailed breakdown of recent games — KDA, CS, items, summoner spells."
        />
        <FeatureCard
          title="Live Game"
          body="Check if a player is currently in a game and see the full lobby."
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-panel/60 border border-line rounded-lg p-5">
      <h3 className="font-semibold text-accent mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{body}</p>
    </div>
  );
}
