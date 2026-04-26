# Refreshing pro player data

The pro player list lives in [`lib/pros.ts`](../lib/pros.ts). It's a
hand-curated TypeScript file — there's no scraper, no database, no API
calls at build time. Just typed data we update by hand.

## Why no scraper?

Building a scraper for lolpros.gg / OP.GG / DPM.LOL would mean running
a headless browser at deploy time (or worse, at request time). It's
fragile and arguably violates those sites' terms of service.

A hand-curated file is also small (~700 lines), version-controlled, and
gives us a clean mental model of "what the user sees" vs. "what's live."

## Sources

For each pro, we cross-reference up to three sources:

1. **lolpros.gg** — `/multi/<team-slug>` shows a roster's accounts. Best
   coverage for EUW, weak for KR.
2. **OP.GG** — search the pro's name; OP.GG flags verified accounts with
   a "Pro" badge and the team in brackets like `T1[Faker]`.
3. **DPM.LOL** — `dpm.lol/pro/<Name>` aggregates all known accounts by
   region. Best for KR and CN coverage.

## Format

Each entry looks like:

```ts
{
  slug: 'faker',
  name: 'Faker',
  country: 'South Korea',
  team: 'T1',
  role: 'Mid',
  primaryRegion: 'kr',
  accounts: [
    { gameName: 'Hide on bush', tagLine: 'KR1', region: 'kr' },
    { gameName: 'wincg', tagLine: '84926', region: 'euw1' },
  ],
}
```

## Live verification

When a user visits `/pros/<slug>`, the page hits the Riot API and
verifies each account exists. Invalid accounts render in a faded
"Unresolved" state instead of being hidden — the user sees that the
data is partly stale, which is better than showing nothing.

The verification revalidates every 10 minutes (see `revalidate = 600`
in `app/pros/[slug]/page.tsx`).

## How to add a pro

1. Visit `https://lolpros.gg/player/<slug>` or `https://dpm.lol/pro/<Name>`
2. Copy each account exactly as shown — the Riot ID is case-sensitive
   and special characters matter
3. Add the entry to `lib/pros.ts`
4. Update `LEAGUE_FOR_TEAM` in `components/ProsBrowser.tsx` if it's a
   new team
5. Commit, push, deploy. The new pro appears at `/pros/<slug>`.

## Known limitations

- Pros change accounts often. A list scraped today is partly stale within
  a few months. Live verification at request time helps but only catches
  renames, not new accounts the pro has created.
- KR accounts often use Hangul characters — make sure you're copying the
  correct Unicode characters, not transliterations.
- Some pros have private/secret accounts that no aggregator knows about.
  We can only show what's public.
