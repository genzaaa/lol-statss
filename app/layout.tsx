import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { CommandPalette } from '@/components/CommandPalette';

export const metadata: Metadata = {
  title: 'LoL Stats',
  description: 'League of Legends summoner lookup, match history, and leaderboards',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <nav className="border-b border-line bg-panel/60 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center font-bold text-ink">
                L
              </div>
              <span className="font-semibold tracking-wide group-hover:text-accent transition-colors">
                LoL.Stats
              </span>
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="hover:text-accent transition-colors">
                Search
              </Link>
              <Link href="/compare" className="hover:text-accent transition-colors">
                Compare
              </Link>
              <Link href="/pros" className="hover:text-accent transition-colors">
                Pros
              </Link>
              <Link href="/champions" className="hover:text-accent transition-colors">
                Champions
              </Link>
              <Link href="/leaderboard" className="hover:text-accent transition-colors">
                Leaderboard
              </Link>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-500 border border-line rounded-md px-2 py-1">
                Quick search:
                <kbd className="bg-panel2 rounded px-1 font-mono">⌘K</kbd>
              </span>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-gray-500 border-t border-line mt-16">
          <p>
            LoL.Stats isn't endorsed by Riot Games and doesn't reflect the views or opinions of
            Riot Games or anyone officially involved in producing or managing League of Legends.
          </p>
          <p className="mt-1">
            League of Legends and Riot Games are trademarks or registered trademarks of Riot Games,
            Inc.
          </p>
        </footer>
        <CommandPalette />
      </body>
    </html>
  );
}
