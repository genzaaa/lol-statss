'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PLATFORM_LABELS, type Platform } from '@/lib/regions';

const REGIONS = Object.keys(PLATFORM_LABELS) as Platform[];

export function CompareSearch() {
  const router = useRouter();
  const [region, setRegion] = useState<Platform>('euw1');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [err, setErr] = useState<string | null>(null);

  function validate(id: string): boolean {
    const idx = id.lastIndexOf('#');
    if (idx < 1 || idx >= id.length - 1) return false;
    return true;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const ta = a.trim();
    const tb = b.trim();
    if (!validate(ta) || !validate(tb)) {
      setErr('Both Riot IDs must be in the format Name#TAG');
      return;
    }
    const params = new URLSearchParams({
      region,
      a: ta,
      b: tb,
    });
    router.push(`/compare?${params}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-panel border border-line rounded-lg p-5 space-y-3"
    >
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
          Region
        </label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as Platform)}
          className="w-full bg-panel2 border border-line rounded-md px-3 py-2 text-sm focus:border-accent focus:outline-none cursor-pointer"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {PLATFORM_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
            Summoner A
          </label>
          <input
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="Faker#KR1"
            className="w-full bg-panel2 border border-line rounded-md px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
            Summoner B
          </label>
          <input
            value={b}
            onChange={(e) => setB(e.target.value)}
            placeholder="Caps#EUW"
            className="w-full bg-panel2 border border-line rounded-md px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {err && <p className="text-xs text-loss">{err}</p>}

      <button
        type="submit"
        className="w-full bg-accent text-ink font-semibold px-5 py-2.5 rounded-md hover:bg-accent/90 transition-colors"
      >
        Compare
      </button>
    </form>
  );
}
