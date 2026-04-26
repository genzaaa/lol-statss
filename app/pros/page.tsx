import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PROS } from '@/lib/pros';
import { ProsBrowser } from '@/components/ProsBrowser';

export const metadata: Metadata = {
  title: 'Pros — LoL Stats',
  description:
    'Search professional League of Legends players and browse their SoloQ accounts.',
};

// Tell Next.js not to try to statically prerender this route. ProsBrowser
// reads `?q=` from the URL via useSearchParams(), which requires either a
// Suspense boundary or dynamic rendering. We use both to be safe: dynamic
// rendering keeps the URL reactive, and the Suspense boundary prevents
// any future child from breaking the build.
export const dynamic = 'force-dynamic';

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

      <Suspense fallback={<ProsBrowserFallback />}>
        <ProsBrowser pros={PROS} />
      </Suspense>
    </div>
  );
}

// Small fallback shown while the client component hydrates.
// Matches the shape of ProsBrowser so there's no layout jump.
function ProsBrowserFallback() {
  return (
    <div className="space-y-6">
      <div className="h-12 bg-panel border border-line rounded-lg animate-pulse" />
      <div className="h-96 bg-panel/40 border border-line rounded-lg animate-pulse" />
    </div>
  );
}
