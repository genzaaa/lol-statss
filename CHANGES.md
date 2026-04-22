# Phase 1 Changes

Everything OP.GG-level that can be built on top of the free Riot API.

## New files

- **`components/MatchDetail.tsx`** — expanded per-match view (renders when you click a match row). Shows:
  - Per-team objectives strip (kills, towers, inhibs, barons, dragons, heralds, grubs)
  - Full player table per team with damage-dealt bar, damage-taken bar, CS, vision, items, rune icons
  - Bans row
- **`components/MasteryPanel.tsx`** — top-10 champion mastery grid, colored by mastery level (10 = gold, 7 = diamond-blue, 5 = emerald, etc.), with total mastery score
- **`components/MatchList.tsx`** — client-side wrapper around match rows that handles the queue filter dropdown, Load More pagination, and skeleton loaders
- **`lib/badges.ts`** — computes OP.GG-style post-game badges (MVP, ACE, Pentakill, Farm Lord, Damage Dealer, Vision God, Juggernaut, Tower Crusher, Healer, Objective Slayer, First Blood, Flawless, Killer). Exports `computeBadges()`, `primaryBadge()`, `BADGE_TONE_CLASSES`.
- **`app/api/mastery/route.ts`** — new endpoint, `GET /api/mastery?region&puuid&count` returning `{ masteries, score }`

## Changed files

### `lib/riot.ts`
- Added `getRankedByPuuid()` — uses the current `by-puuid` league endpoint (the older `by-summoner` is still available as fallback)
- Added `getTopMasteries()`, `getMasteryScore()` — champion mastery
- Added `getMatchTimeline()` + types (`MatchTimeline`, `TimelineFrame`, `TimelineEvent`) — unused by Phase 1 but ready for Phase 2 timeline viewer
- Rewrote `getMatchIds()` signature to accept `{ start, count, queue, type }` — back-compat shim retained for the old numeric-count signature
- Expanded `MatchParticipant` and added `MatchTeam` types to cover all the fields Phase 1 renders (damage breakdown, objectives, first blood flags, multi-kills, challenges)

### `lib/ddragon.ts`
- Fixed `summonerSpellIconUrl()` — the old `SPELL_KEYS` map had wrong entries that produced 404s. Now uses a correct ID→file-key map (`SummonerFlash`, `SummonerSmite`, etc.) against CommunityDragon's stable CDN
- Added `getRuneStyles()`, `runeIconUrl()`, `findRune()` — rune metadata lookup from Data Dragon's `runesReforged.json`
- Added `QUEUE_FILTER_OPTIONS` — the dropdown list used by the new match filter
- Added `roleLabel()` / `ROLE_LABELS` — human-readable role names
- Kept `SPELL_KEYS` as an alias for backward compatibility

### `app/api/matches/route.ts`
- Accepts `start` (for pagination) and `queue` (filter) query params
- Uses `batchWithLimit(ids, 5, ...)` instead of unbounded `Promise.all` — stays well under the 20 req/s Riot rate limit even on large counts

### `app/api/leaderboard/route.ts`
- **Fixes the "shows summoner IDs instead of names" issue** flagged in your README
- Now calls `getAccountByPuuid()` for each of the top 50 entries at concurrency 5, populating `gameName` and `tagLine` on each entry before returning
- Falls back through `getSummonerById` → `getAccountByPuuid` if the league endpoint returned `summonerId` but not `puuid`
- The existing `app/leaderboard/page.tsx` was already wired to render `gameName#tagLine` when present — no UI changes needed

### `app/summoner/[region]/[riotId]/page.tsx`
- **Fixes the ranked-endpoint bug** — was calling `getRankedBySummonerId(region, account.puuid)` (passing a PUUID to a function expecting a summoner ID). Now calls `getRankedByPuuid()` first, falls back to `getRankedBySummonerId(summoner.id)` if that errors
- Renders the new `MasteryPanel` above match history
- Replaces the direct match row loop with `<MatchList>` — same initial data, but with queue filter + Load More + skeleton loaders as the user interacts
- Uses `batchWithLimit` for initial match fetch (safer rate-limit behavior)

### `components/MatchRow.tsx`
- Click-to-expand behavior — the whole row is a button
- Badges strip rendered inline on collapsed view (showing up to 4)
- Expanded state toggles a `<MatchDetail>` panel beneath
- Chevron indicator rotates when expanded

## Not changed (intentionally kept as-is)

- `app/leaderboard/page.tsx` — it already had the code to render names; just needed the API to populate them
- `components/RankedCard.tsx` — no changes required for Phase 1
- `components/LiveGameBanner.tsx` — still works correctly
- `lib/batch.ts`, `lib/format.ts`, `lib/regions.ts` — unchanged
- All config files (`package.json`, `tailwind.config.js`, `tsconfig.json`, `next.config.js`, `postcss.config.js`) — no new dependencies needed

## Verification

- All 11 changed/new TS/TSX files parse cleanly (verified with TypeScript's `createSourceFile`)
- Every `@/lib/*` import in every changed file was cross-checked against the exports of the target file
- Next.js types (`NextRequest`/`NextResponse`), React types, and JSX need `node_modules` to fully typecheck — run `npm install && npx tsc --noEmit` locally to confirm, or just `npm run dev` (Next.js surfaces any type errors during compilation)

## How to run

```bash
npm install
npm run dev
# open http://localhost:3000
```

Then click a match row to see the expanded detail — that's Phase 1's headline feature.

## What Phase 2 unlocks next

With Phase 1's foundations (rune lookup, timeline types, mastery, queue filter), Phase 2 becomes:
- Pre-game lobby scout — new `/scout` page, takes multiple Riot IDs
- Champion detail pages — `/champion/[name]`
- Share links with Open Graph previews for Discord/Twitter
- Match timeline viewer — `getMatchTimeline()` is already in place
- Skeleton loaders can be reused throughout

Nothing in Phase 2 requires a database — it's pure Riot API + Data Dragon work.
