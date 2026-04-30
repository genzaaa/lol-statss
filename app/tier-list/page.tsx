import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tier list — LoL Stats',
  description:
    'Curated links to the best League of Legends tier lists. We don\'t aggregate our own — these sites do, and they do it well.',
};

// League's current patch as of this page edit. Update when a new patch
// goes live. Format changed in 2026 to YEAR.PATCH-NUMBER (e.g. 26.9).
// Some providers' URLs still use the older 14.x style; we link to their
// generic tier list page in those cases rather than guess at format.
const CURRENT_PATCH_LABEL = 'Patch 26.9';

interface Provider {
  name: string;
  description: string;
  /** Outbound URL to their main tier list */
  url: string;
  /** Optional tagline for what they're best at */
  bestAt: string;
  /** Optional rank-specific deep links if the provider supports them */
  rankLinks?: Array<{ label: string; url: string }>;
}

const PROVIDERS: Provider[] = [
  {
    name: 'u.gg',
    description:
      'The mainstream tier list. Cleanest UI, large sample sizes, builds and counters built in.',
    url: 'https://u.gg/lol/tier-list',
    bestAt: 'Best for build paths and meta picks',
    rankLinks: [
      { label: 'Iron–Bronze', url: 'https://u.gg/lol/tier-list?rank=iron_plus' },
      { label: 'Platinum+',   url: 'https://u.gg/lol/tier-list?rank=platinum_plus' },
      { label: 'Diamond+',    url: 'https://u.gg/lol/tier-list?rank=diamond_plus' },
      { label: 'Master+',     url: 'https://u.gg/lol/tier-list?rank=master_plus' },
    ],
  },
  {
    name: 'OP.GG',
    description:
      'Largest dataset of any aggregator. Their tier list reflects the most-played version of the meta.',
    url: 'https://www.op.gg/lol/champions',
    bestAt: 'Best for "what is everyone playing right now"',
  },
  {
    name: 'Lolalytics',
    description:
      'Deepest stats. Tier list backed by per-matchup, per-rune, per-build winrates. Less polished UI but the most data.',
    url: 'https://lolalytics.com/lol/tierlist/',
    bestAt: 'Best for serious min-maxing',
  },
  {
    name: 'Mobalytics',
    description:
      'Coaching-focused. Their tier list comes with explanations of why each champion is strong and how to play them.',
    url: 'https://mobalytics.gg/lol/tier-list',
    bestAt: 'Best for learning the meta, not just memorizing it',
  },
  {
    name: 'METAsrc',
    description:
      'Quick reference tier list. Less depth than the others but loads fast and updates daily.',
    url: 'https://www.metasrc.com/lol/tierlist',
    bestAt: 'Best for a quick sanity check before queueing',
  },
];

export default function TierListPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Honest framing */}
      <div>
        <h1 className="text-3xl font-bold mb-3">Tier list</h1>
        <div className="bg-panel border border-line rounded-lg p-4 text-sm text-gray-300 space-y-2">
          <p>
            We don't aggregate our own tier list. Computing one honestly
            requires millions of ranked matches per patch sliced by rank tier,
            and the established sites already do this very well.
          </p>
          <p className="text-gray-400">
            Below are the tier lists we trust, with notes on what each one is
            best at. They disagree on the margins — that's a feature, not a
            bug. If a champion is S-tier across all five sites, you can be
            confident. If only one calls it S-tier, look closer.
          </p>
        </div>
      </div>

      {/* Provider cards */}
      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-gray-500">
          Tier lists for {CURRENT_PATCH_LABEL}
        </p>
        {PROVIDERS.map((p) => (
          <ProviderCard key={p.name} provider={p} />
        ))}
      </div>

      {/* How to read tier lists */}
      <section>
        <h2 className="text-lg font-semibold mb-2">How to read a tier list</h2>
        <div className="bg-panel border border-line rounded-lg p-4 text-sm space-y-3">
          <div>
            <p className="font-semibold text-gray-200 mb-1">
              S-tier doesn't mean "always pick this"
            </p>
            <p className="text-gray-400">
              Tier ranking is a synthesis of win rate, pick rate, and
              ban rate at a specific elo. A champion with a 53% win rate
              you've never played will lose you more games than a 49% one
              you've played 100 times.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-200 mb-1">
              Rank matters more than you think
            </p>
            <p className="text-gray-400">
              Champions like Yasuo, Kayn, and Riven swing wildly between
              elos. A "Bronze god" can be Diamond F-tier. Always filter to
              your rank when reading any tier list.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-200 mb-1">
              Sample size matters too
            </p>
            <p className="text-gray-400">
              A new champion with a 56% win rate over 1,000 games is
              significant. The same champion at 56% over 50 games tells
              you almost nothing. Any honest tier list shows sample size —
              learn to look for it.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-200 mb-1">
              Patch lag is real
            </p>
            <p className="text-gray-400">
              Tier lists need a few days of post-patch data to be meaningful.
              The day a patch goes live, every site is showing stale numbers.
              Wait 2–3 days into a patch before trusting tier list movement.
            </p>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <p className="text-[11px] text-gray-600 pt-4 border-t border-line">
        Outbound links are not affiliate links. We don't get paid by any
        provider. Sites listed in alphabetical order by reputation and data
        quality.
      </p>
    </div>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <div className="bg-panel border border-line rounded-lg p-4 hover:border-accent/40 transition-colors">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
        <a
          href={provider.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-semibold text-gray-100 hover:text-accent transition-colors inline-flex items-center gap-1.5"
        >
          {provider.name}
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <span className="text-[11px] uppercase tracking-wider text-accent/80">
          {provider.bestAt}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-2">{provider.description}</p>
      {provider.rankLinks && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {provider.rankLinks.map((rl) => (
            <a
              key={rl.label}
              href={rl.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] px-2 py-1 rounded border border-line hover:border-accent hover:text-accent text-gray-400 transition-colors"
            >
              {rl.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
