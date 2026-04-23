import type { Metadata } from 'next';
import { PROS } from '@/lib/pros';
import { ProsBrowser } from '@/components/ProsBrowser';

export const metadata: Metadata = {
  title: 'Pros — LoL Stats',
  description:
    'Search professional League of Legends players and browse their SoloQ accounts.',
};

export default function ProsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">
          Pro <span className="text-accent">players</span>
        </h1>
        <p className="text-gray-400 text-sm">
          Search pros by name or team. Data from{' '}
          <a
            href="https://lolpros.gg/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            lolpros.gg
          </a>
          . Click any account to jump to their profile.
        </p>
      </div>

      <ProsBrowser pros={PROS} />
    </div>
  );
}
