# Changes — Phase 1 + 1.5 + ARAM Mayhem fix

This branch contains three layers of changes delivered in sequence.

## Phase 1 — OP.GG feature parity

### New files

- **`components/MatchDetail.tsx`** — the expanded view that appears when you click a match row. Two-team table with damage-dealt bar, damage-taken bar, CS, vision, items, rune icons. Per-team objectives strip (kills, towers, inhibs, barons, dragons, heralds, grubs). Bans row below.
- **`components/MasteryPanel.tsx`** — top-10 champion mastery grid with colored level badges (10=gold, 7=diamond-blue, 5=emerald) and total mastery score.
- **`components/MatchList.tsx`** — client component wrapping match rows. Handles queue filter, Load More pagination, skeleton loaders.
- **`lib/badges.ts`** — computes post-game badges from match data. MVP/ACE, Pentakill/Quadrakill/Triple Kill, Farm Lord (≥9 CS/min), Damage Dealer (≥35% team damage), Vision God (≥45 vision, 20+ min), Juggernaut (high damage taken ≤4 deaths), Healer (≥10k healing), Objective Slayer, First Blood, Flawless (win, 0 deaths), Tower Crusher, Killer.
- **`app/api/mastery/route.ts`** — `GET /api/mastery?region&puuid&count` returning `{ masteries, score }`.

### Changed

- **`lib/riot.ts`**
  - Added `getRankedByPuuid()` — current PUUID-based league endpoint
  - Added `getTopMasteries()`, `getMasteryScore()`
  - Added `getMatchTimeline()` + timeline types (ready for Phase 2)
  - Extended `MatchParticipant` + new `MatchTeam` types to cover damage breakdown, objectives, multi-kills, first-blood flags, challenges
  - Rewrote `getMatchIds()` to accept `{ start, count, queue, type, startTime, endTime }` (back-compat shim kept for old numeric-count signature)
- **`lib/ddragon.ts`**
  - Fixed broken `summonerSpellIconUrl()` — old `SPELL_KEYS` had wrong entries that 404'd for most spells
  - Added `getRuneStyles()`, `runeIconUrl()`, `findRune()` for rune metadata
  - Added `roleLabel()` / `ROLE_LABELS`
  - Kept `SPELL_KEYS` as an alias for backward compat
- **`app/api/matches/route.ts`** — accepts `start` and `queue` params; uses `batchWithLimit(ids, 5, ...)` for safe rate-limit behavior
- **`app/api/leaderboard/route.ts`** — batch-resolves each entry's PUUID → Riot ID at concurrency 5, populating `gameName`/`tagLine` (fixes the "shows summoner IDs" issue flagged in README)
- **`app/summoner/[region]/[riotId]/page.tsx`** — uses `getRankedByPuuid` with summoner-ID fallback (fixes PUUID-vs-summonerId bug); wires in `MasteryPanel` and `MatchList`
- **`components/MatchRow.tsx`** — click-to-expand with badges on collapsed view; renders `<MatchDetail>` when expanded

## Phase 1.5 — Polish

### New files

- **`app/summoner/[region]/[riotId]/loading.tsx`** — full skeleton shown instantly during navigation. No more blank 2–5 second screen while the server fetches account/summoner/matches.
- **`components/RecentSearches.tsx`** — pinned recent summoners on the home page from localStorage. × button to remove individual entries, deduplication by region+name, max 6 items. Exports `pushRecentSearch()`, `readRecentSearches()`, `removeRecentSearch()`.

### Changed

- **`app/page.tsx`** — calls `pushRecentSearch()` on submit, renders `<RecentSearches />` on home page
- **`app/summoner/[region]/[riotId]/page.tsx`** — added `generateMetadata()` for Open Graph. Discord/Twitter/Reddit previews now show:
  - Title: `Faker#KR1 · KR`
  - Description: level + rank + LP + WR
  - Image: profile icon
- **`components/MatchList.tsx`** — queue filter state now persists in the URL as `?queue=aram`. `router.replace` (no scroll, no navigation) keeps the back button clean. Can deep-link or share filtered views.

## Additional fix — ARAM Mayhem was invisible

**Symptom:** selecting "ARAM" showed old games from months ago, and ARAM: Mayhem matches (launched Oct 2025) were missing entirely.

**Cause:** Riot assigns separate queue IDs per ARAM variant:
- `450` — Howling Abyss ARAM (the classic)
- `2400` — ARAM: Mayhem (added Oct 22, 2025)
- `100` — Butcher's Bridge ARAM (event variant)
- `720` — ARAM Clash

The filter was passing `queue=450` to Riot's match-v5 endpoint, which does NOT support multiple `queue=` params in one request — so Mayhem games were filtered out entirely, and recent matches from Mayhem-heavy players got replaced by ancient 450-only history.

**Fix:** queue filter values are now strings (e.g. `'aram'`) mapped to **arrays** of queue IDs.

- **`lib/ddragon.ts`** — `QUEUE_FILTER_OPTIONS` restructured. Each option has a `value: string` and optional `queueIds: number[]`. ARAM maps to `[450, 2400, 100, 720]`. Normal groups `[400, 430, 480, 490]` (Draft/Blind/Swiftplay/Quickplay). Arena groups `[1700, 1710]`. New `queueIdsForFilter()` helper.
- **`app/api/matches/route.ts`** — when a filter maps to multiple queue IDs, fans out one parallel request per ID, merges the results, dedupes, and sorts by extracted numeric match ID (newest first). Then paginates from the merged list.
- **`lib/ddragon.ts` — `QUEUE_NAMES`** — added all missing queue IDs (2400 "ARAM: Mayhem", 480 "Swiftplay", 490 "Quickplay", 720 "ARAM Clash", 1710 "Arena", 870/880/890 new bot queues, 100 "ARAM (Butcher's Bridge)") so match cards display the correct mode name for each variant.
- **Plus a 6-month cutoff** is applied whenever any queue filter is set, so ancient games never surface for players who rarely touch that queue. Empty state now says "No ARAM matches in the last 6 months."

## How to run

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Verification

- All 11 new/changed files pass syntax check (verified with TypeScript's `createSourceFile`)
- Every `@/lib/*` import cross-checked against exports
- The multi-queue merge logic was unit-tested with simulated data — IDs come back in correct chronological order across all 4 ARAM variants
- Full `tsc --noEmit` needs `node_modules` locally; run `npm install && npx tsc --noEmit` to confirm, or just `npm run dev` (Next.js surfaces type errors at compile time)

## Phase 2 preview

With this foundation in place, Phase 2 unlocks:
- **Pre-game lobby scout** — paste multiple Riot IDs, compare ranks/form side-by-side
- **Champion detail pages** at `/champion/[name]` — abilities, skins, lore from Data Dragon
- **Match timeline viewer** — `getMatchTimeline()` is already in place, just needs rendering
- **Database-backed real tier list** — would need Render Postgres + cron

Nothing in Phase 2 requires a database.
