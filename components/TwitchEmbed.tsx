'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Twitch login (lowercase) of the channel to embed */
  channel: string;
  /** Show the embed inline; defaults to false (button to expand). */
  defaultOpen?: boolean;
}

/**
 * Embeds a Twitch player for the given channel.
 *
 * Twitch requires the embed's `parent` query param to match the page's
 * hostname exactly. We pass the current `window.location.hostname` at
 * runtime, which works for both local dev (localhost) and production
 * (lol-statss.vercel.app or any custom domain).
 *
 * The embed renders as an iframe with no auto-play unless the user
 * clicks. We default to a collapsed state with a "Watch live on Twitch"
 * button to avoid loading 30+ Twitch iframes when many pros are live.
 */
export function TwitchEmbed({ channel, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [parent, setParent] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setParent(window.location.hostname);
    }
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-400/40 transition-colors"
        title={`Watch ${channel} live on Twitch`}
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
        </svg>
        Watch on Twitch
      </button>
    );
  }

  // Build the iframe src once we have the parent hostname.
  const src = parent
    ? `https://player.twitch.tv/?channel=${encodeURIComponent(
        channel
      )}&parent=${encodeURIComponent(parent)}&autoplay=false&muted=true`
    : '';

  return (
    <div
      ref={containerRef}
      className="bg-panel border border-purple-400/40 rounded-md overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-purple-500/10">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-purple-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          {channel} on Twitch
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
        >
          Hide
        </button>
      </div>
      {parent ? (
        <div className="aspect-video bg-black">
          <iframe
            src={src}
            allowFullScreen
            className="w-full h-full block"
            title={`${channel} on Twitch`}
            // Twitch requires both of these for the player to function.
            allow="autoplay; encrypted-media; fullscreen"
          />
        </div>
      ) : (
        <div className="aspect-video bg-black flex items-center justify-center text-xs text-gray-500">
          Loading…
        </div>
      )}
      <p className="px-3 py-1.5 text-[10px] text-gray-500 bg-panel2/40">
        Stream may show menus, lobby, or different game. Spectate the actual match for live game view.
      </p>
    </div>
  );
}
