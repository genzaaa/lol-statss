'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PLATFORM_LABELS, type Platform } from '@/lib/regions';
import {
  readRecentSearches,
  pushRecentSearch,
  type RecentSearch,
} from './RecentSearches';

const REGIONS = Object.keys(PLATFORM_LABELS) as Platform[];

// Mounts once in the root layout. Listens for Cmd+K / Ctrl+K globally
// and shows a centered search modal. Also responds to the "/" key when
// no input is focused. Recent searches appear as quick picks.
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<Platform>('euw1');
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recents when opening (in case they changed in another tab)
  useEffect(() => {
    if (open) {
      setRecents(readRecentSearches());
      setErr(null);
      // focus after modal mounts
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Global keyboard listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      // Cmd+K / Ctrl+K always opens
      if (isMeta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // "/" opens, but only if focus isn't in an editable element
      if (e.key === '/' && !isTypingInField(e.target)) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      // Esc closes
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = useCallback(
    (r: Platform, gameName: string, tagLine: string) => {
      pushRecentSearch({ region: r, gameName, tagLine });
      const slug = `${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
      router.push(`/summoner/${r}/${slug}`);
      setOpen(false);
      setQuery('');
    },
    [router]
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const trimmed = query.trim();
    const idx = trimmed.lastIndexOf('#');
    if (idx < 1 || idx >= trimmed.length - 1) {
      setErr('Use the format Name#TAG');
      return;
    }
    const gameName = trimmed.slice(0, idx).trim();
    const tagLine = trimmed.slice(idx + 1).trim();
    if (!gameName || !tagLine) {
      setErr('Use the format Name#TAG');
      return;
    }
    go(region, gameName, tagLine);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-ink/80 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Search summoners"
    >
      <div
        className="w-full max-w-lg bg-panel border border-line rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={onSubmit} className="p-3 border-b border-line">
          <div className="flex gap-2">
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as Platform)}
              className="bg-panel2 border border-line rounded-md px-2 py-2 text-xs focus:border-accent focus:outline-none cursor-pointer"
              aria-label="Region"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {PLATFORM_LABELS[r]}
                </option>
              ))}
            </select>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name#TAG"
              className="flex-1 bg-panel2 border border-line rounded-md px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          {err && <p className="text-xs text-loss mt-2">{err}</p>}
        </form>

        {recents.length > 0 && (
          <div className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
              Recent
            </p>
            <div className="space-y-0.5">
              {recents.map((r) => (
                <button
                  key={`${r.region}-${r.gameName}-${r.tagLine}`}
                  type="button"
                  onClick={() => go(r.region, r.gameName, r.tagLine)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-panel2 text-left text-sm transition-colors"
                >
                  <span className="text-[10px] text-gray-500 font-mono uppercase w-10">
                    {PLATFORM_LABELS[r.region]}
                  </span>
                  <span className="text-gray-200">{r.gameName}</span>
                  <span className="text-gray-500">#{r.tagLine}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-3 py-2 border-t border-line flex items-center justify-between text-[10px] text-gray-500">
          <span>
            <kbd className="bg-panel2 border border-line rounded px-1.5 py-0.5 font-mono">
              Enter
            </kbd>{' '}
            search
          </span>
          <span>
            <kbd className="bg-panel2 border border-line rounded px-1.5 py-0.5 font-mono">
              Esc
            </kbd>{' '}
            close
          </span>
        </div>
      </div>
    </div>
  );
}

function isTypingInField(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}
