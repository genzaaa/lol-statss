'use client';

import { useEffect, useState } from 'react';
import type { Platform } from '@/lib/regions';

interface Props {
  region: Platform;
  gameName: string;
  tagLine: string;
  /** Optional rank label/icon info to store alongside, for richer homepage display */
  rankLabel?: string;
}

const STORAGE_KEY = 'lolstatss-favorites-v1';
/** Cap to keep localStorage small and the homepage list manageable. */
const MAX_FAVORITES = 12;

export interface FavoriteSummoner {
  region: Platform;
  gameName: string;
  tagLine: string;
  rankLabel?: string;
  /** ms since epoch — used for sort + display */
  savedAt: number;
}

/**
 * Read all favorites from localStorage. Returns [] if storage is unavailable
 * (private mode, server) or if the stored data is corrupt.
 */
export function readFavorites(): FavoriteSummoner[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter to entries that have the required fields — guards against
    // schema drift from older versions of this code.
    return parsed.filter(
      (f): f is FavoriteSummoner =>
        f &&
        typeof f.region === 'string' &&
        typeof f.gameName === 'string' &&
        typeof f.tagLine === 'string' &&
        typeof f.savedAt === 'number'
    );
  } catch {
    return [];
  }
}

function writeFavorites(list: FavoriteSummoner[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Notify any other components on the page (homepage widget, etc.)
    window.dispatchEvent(new CustomEvent('favorites-changed'));
  } catch {
    // localStorage may be full or disabled. We just ignore — favorite
    // toggling won't persist but the UI won't crash either.
  }
}

function favoriteKey(region: string, gameName: string, tagLine: string): string {
  return `${region}|${gameName.toLowerCase()}|${tagLine.toLowerCase()}`;
}

export function isFavorited(
  region: Platform,
  gameName: string,
  tagLine: string,
  list?: FavoriteSummoner[]
): boolean {
  const favorites = list ?? readFavorites();
  const key = favoriteKey(region, gameName, tagLine);
  return favorites.some(
    (f) => favoriteKey(f.region, f.gameName, f.tagLine) === key
  );
}

export function FavoriteButton({ region, gameName, tagLine, rankLabel }: Props) {
  const [favorited, setFavorited] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Sync from localStorage on mount, and re-sync if another tab/page changes
  // favorites while we're rendered.
  useEffect(() => {
    setMounted(true);
    setFavorited(isFavorited(region, gameName, tagLine));

    function onChange() {
      setFavorited(isFavorited(region, gameName, tagLine));
    }
    window.addEventListener('favorites-changed', onChange);
    return () => window.removeEventListener('favorites-changed', onChange);
  }, [region, gameName, tagLine]);

  function toggle() {
    const list = readFavorites();
    const key = favoriteKey(region, gameName, tagLine);
    const idx = list.findIndex(
      (f) => favoriteKey(f.region, f.gameName, f.tagLine) === key
    );
    if (idx >= 0) {
      // Remove
      const next = [...list];
      next.splice(idx, 1);
      writeFavorites(next);
      setFavorited(false);
    } else {
      // Add — newest first, capped at MAX_FAVORITES
      const next: FavoriteSummoner[] = [
        { region, gameName, tagLine, rankLabel, savedAt: Date.now() },
        ...list,
      ].slice(0, MAX_FAVORITES);
      writeFavorites(next);
      setFavorited(true);
    }
  }

  // Hide on SSR to avoid hydration flash showing the wrong state.
  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="text-xs px-2.5 py-1.5 rounded border border-line text-gray-600"
        aria-label="Loading favorite state"
      >
        ☆
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={favorited ? 'Remove from favorites' : 'Save to favorites'}
      aria-pressed={favorited}
      className={`text-xs px-2.5 py-1.5 rounded border transition-colors ${
        favorited
          ? 'border-amber-400/60 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'
          : 'border-line text-gray-400 hover:border-accent hover:text-accent'
      }`}
    >
      <span className="mr-1">{favorited ? '★' : '☆'}</span>
      {favorited ? 'Saved' : 'Save'}
    </button>
  );
}
