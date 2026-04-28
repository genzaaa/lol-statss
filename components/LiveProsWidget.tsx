'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LivePro } from '@/app/api/pros-live/route';
import { SpectateButton } from './SpectateButton';

interface ApiResponse {
  checked: number;
  live: LivePro[];
  version: string;
  generatedAt: string;
}

const REFRESH_MS = 60_000; // 60 seconds — matches our server cache TTL

const QUEUE_LABELS: Record<number, string> = {
  420: 'Solo/Duo',
  440: 'Flex',
  450: 'ARAM',
  430: 'Normal',
  400: 'Normal Draft',
  700: 'Clash',
  900: 'URF',
  1700: 'Arena',
};

function queueLabel(id: number): string {
  return QUEUE_LABELS[id] ?? `Queue ${id}`;
}

function formatGameLength(secs: number): string {
  if (secs < 0) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function champIcon(version: string, championKey: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championKey}.png`;
}

export function LiveProsWidget() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch('/api/pros-live', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiResponse;
        if (cancelled) return;
        setData(json);
        setError(null);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) {
        timer = setTimeout(tick, REFRESH_MS);
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-panel border border-line rounded-lg p-4 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-loss animate-pulse" />
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Pros live now
          </p>
        </div>
        <p className="text-xs text-gray-500">Checking…</p>
      </div>
    );
  }

  if (error) {
    return null; // fail silently — this is a nice-to-have
  }

  if (!data || data.live.length === 0) {
    return (
      <div className="bg-panel border border-line rounded-lg p-4 mt-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-600" />
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Pros live now
            </p>
          </div>
          <p className="text-[11px] text-gray-500">
            No tracked pros currently in a game
          </p>
        </div>
        <p className="text-[10px] text-gray-600 mt-2">
          Checked {data?.checked ?? 0} pros · refreshes every 60s
        </p>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-loss/40 rounded-lg p-4 mt-6">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-loss animate-pulse" />
          <p className="text-sm font-semibold uppercase tracking-wider text-loss">
            Pros live now
          </p>
          <span className="text-xs text-gray-400">({data.live.length})</span>
        </div>
        <p className="text-[11px] text-gray-500">
          Refreshes every 60s · checked {data.checked} pros
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {data.live.map((pro) => (
          <LiveProCard key={pro.slug} pro={pro} version={data.version} />
        ))}
      </div>
    </div>
  );
}

function LiveProCard({ pro, version }: { pro: LivePro; version: string }) {
  const profileHref = `/summoner/${pro.region}/${encodeURIComponent(
    pro.gameName
  )}-${encodeURIComponent(pro.tagLine)}`;
  return (
    <div className="flex items-center gap-3 p-2 rounded-md bg-panel2/40 border border-line hover:border-accent transition-colors group">
      <Link href={profileHref} className="flex items-center gap-3 min-w-0 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={champIcon(version, pro.championKey)}
          alt={pro.championKey}
          className="w-10 h-10 rounded flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-100 group-hover:text-accent transition-colors truncate">
            {pro.name}
            <span className="text-gray-500 font-normal text-xs">
              {' · '}
              {pro.team}
            </span>
          </p>
          <p className="text-[11px] text-gray-500">
            {queueLabel(pro.queueId)} · {formatGameLength(pro.gameLength)}
          </p>
        </div>
      </Link>
      <SpectateButton
        region={pro.region}
        gameName={pro.gameName}
        tagLine={pro.tagLine}
        variant="compact"
      />
    </div>
  );
}
