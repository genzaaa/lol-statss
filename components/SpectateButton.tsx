'use client';

import { useEffect, useState } from 'react';
import type { Platform } from '@/lib/regions';

interface Props {
  region: Platform;
  gameName: string;
  tagLine: string;
  /** Visual variant — full button on detail pages, compact icon on cards */
  variant?: 'full' | 'compact';
}

/**
 * Returns true when the current device is a phone or tablet that can't
 * run a .bat / .command file. We hide spectate buttons in that case
 * since they'd just confuse the user.
 *
 * Heuristic: user-agent regex for known mobile OSes. Imperfect but covers
 * 99% of phones/tablets without false positives on desktop browsers.
 */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android|Mobile|BlackBerry|webOS/i.test(
    navigator.userAgent
  );
}

/** Detect probable OS from UA — used to default to Windows or Mac script. */
function probableOs(): 'win' | 'mac' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return 'win';
  if (/Mac OS|Macintosh/.test(ua)) return 'mac';
  return 'unknown';
}

/**
 * Button that downloads a League of Legends spectator script.
 *
 * Live games only — if the player isn't in a match, the API returns 404
 * and we show a small inline message.
 *
 * UX features:
 * - Hidden on mobile (the .bat/.command files can't run on phones)
 * - After download, shows a one-time tip modal with OS-specific notes
 *   (Windows SmartScreen warning, macOS chmod step)
 * - Defaults the button label to the user's likely OS
 */
export function SpectateButton({
  region,
  gameName,
  tagLine,
  variant = 'full',
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [os, setOs] = useState<'win' | 'mac' | 'unknown'>('unknown');
  const [busy, setBusy] = useState<'win' | 'mac' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalFor, setModalFor] = useState<'win' | 'mac' | null>(null);

  useEffect(() => {
    setIsMobile(isMobileDevice());
    setOs(probableOs());
  }, []);

  if (isMobile) return null;

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

      // Show post-download tips modal so the user knows what to do next.
      setModalFor(platform);
    } catch (e: any) {
      setError(e?.message ?? 'Spectate failed');
    } finally {
      setBusy(null);
    }
  }

  // ----- Compact variant: single button, defaults to the user's OS -----
  if (variant === 'compact') {
    return (
      <>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => download(os === 'mac' ? 'mac' : 'win')}
            disabled={busy !== null}
            title={
              os === 'mac'
                ? 'Download macOS spectate script'
                : 'Download Windows spectate script. Right-click for Mac.'
            }
            onContextMenu={(e) => {
              if (os !== 'mac') {
                e.preventDefault();
                download('mac');
              }
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
        {modalFor && (
          <PostDownloadModal
            platform={modalFor}
            gameName={gameName}
            onClose={() => setModalFor(null)}
          />
        )}
      </>
    );
  }

  // ----- Full variant: split Windows / Mac buttons -----
  return (
    <>
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
      {modalFor && (
        <PostDownloadModal
          platform={modalFor}
          gameName={gameName}
          onClose={() => setModalFor(null)}
        />
      )}
    </>
  );
}

// =============== Post-download tips modal ===============

const DISMISSED_KEY = 'lolstatss-spectate-tips-dismissed';

function PostDownloadModal({
  platform,
  gameName,
  onClose,
}: {
  platform: 'win' | 'mac';
  gameName: string;
  onClose: () => void;
}) {
  const [dismissForever, setDismissForever] = useState(false);

  // Don't show the modal at all if the user has previously dismissed it
  // forever. We do this on render rather than at button-click time so
  // the toggle only takes effect after THIS download finishes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const dismissed = window.localStorage.getItem(DISMISSED_KEY);
        if (dismissed === '1') {
          onClose();
        }
      } catch {
        // localStorage may be unavailable (private mode). Show modal anyway.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    if (dismissForever) {
      try {
        window.localStorage.setItem(DISMISSED_KEY, '1');
      } catch {
        // ignore
      }
    }
    onClose();
  }

  const filename =
    platform === 'win'
      ? `spectate-${gameName}.bat`
      : `spectate-${gameName}.command`;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="bg-panel border border-line rounded-lg max-w-md w-full p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-semibold">Spectate script downloaded</h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-300 text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-gray-300">
          The file <code className="bg-panel2 px-1 py-0.5 rounded text-[10px] font-mono">{filename}</code>{' '}
          should be in your Downloads folder. To start spectating:
        </p>

        {platform === 'win' ? (
          <ol className="text-xs text-gray-300 space-y-1.5 list-decimal list-inside ml-1">
            <li>Open your Downloads folder</li>
            <li>Double-click <code className="bg-panel2 px-1 py-0.5 rounded text-[10px] font-mono">{filename}</code></li>
            <li>
              If Windows shows a SmartScreen warning, click{' '}
              <span className="font-medium text-gray-100">More info</span> →{' '}
              <span className="font-medium text-gray-100">Run anyway</span>
            </li>
            <li>The League client will open into spectator mode after ~10 seconds</li>
          </ol>
        ) : (
          <ol className="text-xs text-gray-300 space-y-1.5 list-decimal list-inside ml-1">
            <li>Open your Downloads folder in Finder</li>
            <li>
              The first time, you may need to make it executable. Right-click
              the file → Open With → Terminal. macOS may ask "Open anyway" in
              System Settings → Privacy & Security
            </li>
            <li>The League client will open into spectator mode</li>
          </ol>
        )}

        <div className="bg-panel2/40 border border-line rounded p-2.5 text-[11px] text-gray-400 space-y-1">
          <p className="text-gray-300 font-semibold">Common issues</p>
          <p>
            <span className="text-gray-300">Nothing happens:</span> League is
            installed somewhere other than the default path. Open the script in
            a text editor and edit the path on the first line.
          </p>
          <p>
            <span className="text-gray-300">"Game metadata not found":</span>{' '}
            the game ended between download and run. Refresh the page and try
            again on a current game.
          </p>
          <p>
            <span className="text-gray-300">Black screen in spectator:</span>{' '}
            Riot's spectator infrastructure has known bugs. Out of our control —
            try again in a few minutes.
          </p>
        </div>

        <label className="flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dismissForever}
            onChange={(e) => setDismissForever(e.target.checked)}
            className="accent-accent"
          />
          Don't show these tips again
        </label>

        <button
          type="button"
          onClick={handleClose}
          className="w-full bg-accent/15 hover:bg-accent/25 text-accent border border-accent/40 rounded-md py-2 text-xs font-semibold transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
