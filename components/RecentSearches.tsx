'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PLATFORM_LABELS, type Platform } from '@/lib/regions';

const STORAGE_KEY = 'lol-stats:recent-searches';
const MAX_ITEMS = 6;

export interface RecentSearch {
  region: Platform;
  gameName: string;
  tagLine: string;
  ts: number;
}

// --- Storage helpers (exported so the search submit can update the list) ---

export function readRecentSearches(): RecentSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is RecentSearch =>
        e &&
        typeof e.region === 'string' &&
        typeof e.gameName === 'string' &&
        typeof e.tagLine === 'string'
    );
  } catch {
    return [];
  }
}

export function pushRecentSearch(entry: Omit<RecentSearch, 'ts'>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = readRecentSearches();
    // Dedupe by region + name#tag (case-insensitive)
    const key = (e: { region: string; gameName: string; tagLine: string }) =>
      `${e.region}|${e.gameName.toLowerCase()}#${e.tagLine.toLowerCase()}`;
    const next: RecentSearch[] = [
      { ...entry, ts: Date.now() },
      ...existing.filter((e) => key(e) !== key(entry)),
    ].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be disabled (e.g. private mode) — ignore
  }
}

export function removeRecentSearch(entry: {
  region: Platform;
  gameName: string;
  tagLine: string;
}): RecentSearch[] {
  const filtered = readRecentSearches().filter(
    (e) =>
      !(
        e.region === entry.region &&
        e.gameName.toLowerCase() === entry.gameName.toLowerCase() &&
        e.tagLine.toLowerCase() === entry.tagLine.toLowerCase()
      )
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
  return filtered;
}

// --- Component ---

export function RecentSearches() {
  const [items, setItems] = useState<RecentSearch[] | null>(null);

  useEffect(() => {
    setItems(readRecentSearches());
    // Keep in sync if another tab modifies storage
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readRecentSearches());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Don't render anything during SSR or while hydrating empty state
  if (items === null || items.length === 0) return null;

  return (
    <div className="mt-12 max-w-2xl mx-auto">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
        Recent searches
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((entry) => {
          const href = `/summoner/${entry.region}/${encodeURIComponent(
            entry.gameName
          )}-${encodeURIComponent(entry.tagLine)}`;
          return (
            <div
              key={`${entry.region}-${entry.gameName}-${entry.tagLine}`}
              className="group relative inline-flex items-center bg-panel border border-line rounded-md hover:border-accent transition-colors"
            >
              <Link
                href={href}
                className="px-3 py-1.5 text-sm flex items-center gap-2"
              >
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">
                  {PLATFORM_LABELS[entry.region]}
                </span>
                <span className="text-gray-200">{entry.gameName}</span>
                <span className="text-gray-500">#{entry.tagLine}</span>
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setItems(removeRecentSearch(entry));
                }}
                className="px-2 py-1.5 text-gray-600 hover:text-loss text-xs"
                aria-label={`Remove ${entry.gameName}#${entry.tagLine} from recent searches`}
                title="Remove"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
