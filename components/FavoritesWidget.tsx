'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  readFavorites,
  type FavoriteSummoner,
} from './FavoriteButton';
import { PLATFORM_LABELS } from '@/lib/regions';

/**
 * Displays the user's saved summoners on the homepage. Renders nothing
 * if no favorites are saved (so the homepage doesn't show an empty
 * placeholder for new visitors).
 */
export function FavoritesWidget() {
  const [favorites, setFavorites] = useState<FavoriteSummoner[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFavorites(readFavorites());

    function onChange() {
      setFavorites(readFavorites());
    }
    window.addEventListener('favorites-changed', onChange);
    return () => window.removeEventListener('favorites-changed', onChange);
  }, []);

  // SSR guard + empty state — render nothing rather than a placeholder.
  if (!mounted || favorites.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Your favorites
          <span className="text-gray-600 font-normal ml-2">
            ({favorites.length})
          </span>
        </h2>
        <span className="text-[11px] text-gray-500">
          Saved with the ★ button on summoner pages
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {favorites.map((fav) => (
          <FavoriteCard key={`${fav.region}-${fav.gameName}-${fav.tagLine}`} fav={fav} />
        ))}
      </div>
    </section>
  );
}

function FavoriteCard({ fav }: { fav: FavoriteSummoner }) {
  const href = `/summoner/${fav.region}/${encodeURIComponent(
    fav.gameName
  )}-${encodeURIComponent(fav.tagLine)}`;
  return (
    <Link
      href={href}
      className="bg-panel border border-line hover:border-accent rounded-md p-2.5 transition-colors group flex items-center gap-3"
    >
      <span className="text-amber-300 text-base">★</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-100 group-hover:text-accent transition-colors truncate">
          {fav.gameName}
          <span className="text-gray-500 font-normal">#{fav.tagLine}</span>
        </p>
        <p className="text-[11px] text-gray-500 flex items-center gap-2">
          <span>{PLATFORM_LABELS[fav.region]}</span>
          {fav.rankLabel && (
            <>
              <span className="text-gray-700">·</span>
              <span>{fav.rankLabel}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
