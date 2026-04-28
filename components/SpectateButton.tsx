'use client';

import { useState } from 'react';
import type { Platform } from '@/lib/regions';

interface Props {
  region: Platform;
  gameName: string;
  tagLine: string;
  /** Visual variant — full button on detail pages, compact icon on cards */
  variant?: 'full' | 'compact';
}

/**
 * Button that downloads a League of Legends spectator script.
 *
 * Live games only — if the player isn't in a match, the API returns 404
 * and we show a small inline message.
 */
export function SpectateButton({
  region,
  gameName,
  tagLine,
  variant = 'full',
}: Props) {
  const [busy, setBusy] = useState<'win' | 'mac' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(platform: 'win' | 'mac') {
    setBusy(platform);
    setError(null);

    const url =
      `/api/spectate?region=${encodeURIComponent(region)}` +
      `&gameName=${encodeURIComponent(gameName)}` +
      `&tagLine=${encodeURIComponent(tagLine)}` +
      `&platform=${platform}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Spectate failed (HTTP ${res.status})`);
      }

      // Build a Blob from the response and trigger a synthetic click to
      // download. The Content-Disposition header from the server suggests
      // the filename, but browsers don't always honor it on fetch — so
      // we set the download attribute explicitly.
      const blob = await res.blob();
      const filename =
        platform === 'win'
          ? `spectate-${gameName}.bat`
          : `spectate-${gameName}.command`;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      setError(e?.message ?? 'Spectate failed');
    } finally {
      setBusy(null);
    }
  }

  if (variant === 'compact') {
    // Compact variant: single button, defaults to Windows. For use on
    // tight cards (homepage live pros widget). Right-click for Mac.
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => download('win')}
          disabled={busy !== null}
          title="Spectate this game (Windows). Right-click for Mac."
          onContextMenu={(e) => {
            e.preventDefault();
            download('mac');
          }}
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded bg-accent/15 text-accent hover:bg-accent/25 border border-accent/40 transition-colors disabled:opacity-50"
        >
          {busy ? 'Loading…' : 'Spectate'}
        </button>
        {error && (
          <p className="text-[10px] text-loss mt-0.5 max-w-[140px] truncate" title={error}>
            {error}
          </p>
        )}
      </div>
    );
  }

  // Full variant: split button with explicit Windows / Mac options
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => download('win')}
          disabled={busy !== null}
          className="text-xs font-semibold px-3 py-1.5 rounded-l bg-accent/15 text-accent hover:bg-accent/25 border border-accent/40 transition-colors disabled:opacity-50"
        >
          {busy === 'win' ? 'Loading…' : 'Spectate (Windows)'}
        </button>
        <button
          type="button"
          onClick={() => download('mac')}
          disabled={busy !== null}
          title="Download .command file for macOS"
          className="text-xs font-semibold px-3 py-1.5 rounded-r bg-accent/15 text-accent hover:bg-accent/25 border border-l-0 border-accent/40 transition-colors disabled:opacity-50"
        >
          {busy === 'mac' ? 'Loading…' : 'Mac'}
        </button>
      </div>
      {error && (
        <p className="text-[11px] text-loss" title={error}>
          {error}
        </p>
      )}
      <p className="text-[10px] text-gray-500">
        Downloads a launch script. Run it to spectate the live game.
      </p>
    </div>
  );
}
