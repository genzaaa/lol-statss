import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getChampionDetail,
  getLatestVersion,
  championSpellIconUrl,
  championPassiveIconUrl,
  championSplashUrl,
  championLoadingUrl,
} from '@/lib/ddragon';

export const revalidate = 86400;

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await getChampionDetail(params.id).catch(() => null);
  if (!detail) return { title: 'Champion not found' };
  return {
    title: `${detail.name}, ${detail.title} — LoL Stats`,
    description: detail.blurb,
    openGraph: {
      title: `${detail.name}, ${detail.title}`,
      description: detail.blurb,
      images: [championSplashUrl(detail.id, 0)],
    },
  };
}

export default async function ChampionPage({ params }: Props) {
  const detail = await getChampionDetail(params.id).catch(() => null);
  if (!detail) notFound();

  const version = await getLatestVersion();
  const spellKeys = ['Q', 'W', 'E', 'R'] as const;

  // External sources for live builds / runes / winrates.
  // We link to the exact champion page on each site.
  const lowerName = encodeURIComponent(detail.id.toLowerCase());
  const buildLinks = [
    {
      name: 'u.gg',
      href: `https://u.gg/lol/champions/${lowerName}/build`,
      description: 'Builds, runes, matchups, counters',
    },
    {
      name: 'OP.GG',
      href: `https://op.gg/champions/${lowerName}/build`,
      description: 'Build paths and win rates by rank',
    },
    {
      name: 'Mobalytics',
      href: `https://mobalytics.gg/lol/champions/${lowerName}/build`,
      description: 'In-depth guides and tier list data',
    },
    {
      name: 'Lolalytics',
      href: `https://lolalytics.com/lol/${lowerName}/build/`,
      description: 'Matchup data and synergy picks',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Splash banner with name overlay */}
      <div className="relative rounded-lg overflow-hidden border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={championSplashUrl(detail.id, 0)}
          alt={`${detail.name} splash art`}
          className="w-full h-48 md:h-64 object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={championLoadingUrl(detail.id, 0)}
            alt={detail.name}
            className="hidden sm:block w-24 h-40 object-cover rounded border-2 border-accent/40"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-1">{detail.name}</h1>
            <p className="text-accent text-sm md:text-base italic mb-2">
              {detail.title}
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {detail.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-panel2/80 border border-line"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <Link
            href="/champions"
            className="hidden sm:inline-block text-xs text-gray-300 hover:text-accent transition-colors border border-line rounded-md px-3 py-1.5 bg-panel/60 backdrop-blur-sm"
          >
            ← All champions
          </Link>
        </div>
      </div>

      {/* Blurb + difficulty */}
      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        <div className="bg-panel border border-line rounded-lg p-5">
          <p className="text-gray-300 leading-relaxed text-sm">{detail.blurb}</p>
        </div>
        <DifficultyPanel info={detail.info} />
      </div>

      {/* Builds & runes — honest link-out to external sites */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
          <h2 className="text-lg font-semibold">Builds, runes, and winrates</h2>
          <p className="text-xs text-gray-500">Patch {version}</p>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Live build data and winrate-by-rank come from dedicated stats
          aggregators. Pick your favorite:
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {buildLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 p-3 rounded-md bg-panel2/40 border border-line hover:border-accent hover:bg-panel2/70 transition-colors group"
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-100 group-hover:text-accent transition-colors">
                  {link.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {link.description}
                </p>
              </div>
              <svg
                className="w-4 h-4 text-gray-500 group-hover:text-accent transition-colors flex-shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ))}
        </div>
        <p className="text-[11px] text-gray-600 mt-3">
          We don't aggregate our own build data — these sites have the infrastructure to do it properly and update daily on patch.
        </p>
      </div>

      {/* Abilities */}
      <div className="bg-panel border border-line rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-3">Abilities</h2>
        <div className="space-y-3">
          {/* Passive */}
          <AbilityRow
            slot="P"
            name={detail.passive.name}
            description={detail.passive.description}
            iconUrl={championPassiveIconUrl(version, detail.passive.image.full)}
          />
          {detail.spells.map((spell, i) => (
            <AbilityRow
              key={spell.id}
              slot={spellKeys[i]}
              name={spell.name}
              description={spell.description}
              iconUrl={championSpellIconUrl(version, spell.image.full)}
              cooldown={spell.cooldown}
              cost={spell.cost}
            />
          ))}
        </div>
      </div>

      {/* Lore */}
      {detail.lore && (
        <div className="bg-panel border border-line rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3">Lore</h2>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {detail.lore}
          </p>
        </div>
      )}

      {/* Tips */}
      {(detail.allytips.length > 0 || detail.enemytips.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {detail.allytips.length > 0 && (
            <div className="bg-panel border border-win/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-win uppercase tracking-wider mb-2">
                Playing as {detail.name}
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {detail.allytips.map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-win flex-shrink-0">→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {detail.enemytips.length > 0 && (
            <div className="bg-panel border border-loss/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-loss uppercase tracking-wider mb-2">
                Playing against {detail.name}
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {detail.enemytips.map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-loss flex-shrink-0">→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------- subcomponents --------------

function AbilityRow({
  slot,
  name,
  description,
  iconUrl,
  cooldown,
  cost,
}: {
  slot: 'P' | 'Q' | 'W' | 'E' | 'R';
  name: string;
  description: string;
  iconUrl: string;
  cooldown?: number[];
  cost?: number[];
}) {
  // Strip Data Dragon's <span> markup for a clean readable description.
  // Keeping it minimal — Data Dragon wraps things like damage scaling with
  // <span class="colorXX">…</span> which renders fine as plain text.
  const cleaned = description.replace(/<[^>]+>/g, '');

  return (
    <div className="flex gap-3">
      <div className="relative flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconUrl}
          alt={name}
          className="w-12 h-12 rounded border-2 border-line"
        />
        <span className="absolute -top-1.5 -left-1.5 bg-accent text-ink text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {slot}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="font-semibold text-sm text-gray-100">{name}</p>
          {cooldown && cooldown.length > 0 && (
            <p className="text-[10px] text-gray-500">
              CD: <span className="text-gray-300">{cooldown.join('/')}</span>s
            </p>
          )}
          {cost && cost.some((c) => c > 0) && (
            <p className="text-[10px] text-gray-500">
              Cost: <span className="text-gray-300">{cost.join('/')}</span>
            </p>
          )}
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mt-1">{cleaned}</p>
      </div>
    </div>
  );
}

function DifficultyPanel({
  info,
}: {
  info: { attack: number; defense: number; magic: number; difficulty: number };
}) {
  const bars = [
    { label: 'Attack', value: info.attack, color: 'bg-loss' },
    { label: 'Defense', value: info.defense, color: 'bg-win' },
    { label: 'Magic', value: info.magic, color: 'bg-purple-500' },
    { label: 'Difficulty', value: info.difficulty, color: 'bg-accent' },
  ];
  return (
    <div className="bg-panel border border-line rounded-lg p-4">
      <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">
        Riot's summary
      </h3>
      <div className="space-y-2">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-gray-400">{b.label}</span>
              <span className="text-gray-500 font-mono">{b.value}/10</span>
            </div>
            <div className="h-1.5 rounded-full bg-panel2 overflow-hidden">
              <div
                className={`h-full ${b.color}`}
                style={{ width: `${(b.value / 10) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
