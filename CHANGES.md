# Changes — Phase 1 + 1.5 + ARAM fix + Tier 1 features

This document covers everything stacked on top of `main`, in branch order.

## Phase 1 — OP.GG feature parity

### New files
- `components/MatchDetail.tsx` — expanded view when you click a match row. Two-team table with damage-dealt + damage-taken bars, CS, vision, items, rune icons. Per-team objectives strip (kills, towers, inhibs, barons, dragons, heralds, grubs). Bans row.
- `components/MasteryPanel.tsx` — top-10 champion mastery grid with level-colored badges (10 = gold, 7 = diamond-blue, 5 = emerald) and total mastery score.
- `components/MatchList.tsx` — client wrapper around match rows. Queue filter, Load More pagination, skeleton loaders.
- `lib/badges.ts` — post-game badges (MVP/ACE, Pentakill/Quadrakill/Triple, Farm Lord, Damage Dealer, Vision God, Juggernaut, Healer, Objective Slayer, First Blood, Flawless, Tower Crusher, Killer).
- `app/api/mastery/route.ts` — `GET /api/mastery?region&puuid&count` returning `{ masteries, score }`.

### Changed
- `lib/riot.ts` — added `getRankedByPuuid`, `getTopMasteries`, `getMasteryScore`, `getMatchTimeline`; extended participant/team types; `getMatchIds` accepts `{ start, count, queue, type, startTime, endTime }`.
- `lib/ddragon.ts` — fixed broken summoner-spell icon URLs; added rune metadata helpers, `roleLabel`.
- `app/api/matches/route.ts` — `start` + `queue` params; concurrency-limited match detail fetch.
- `app/api/leaderboard/route.ts` — batch-resolves PUUID → Riot ID (fixes "shows summoner IDs" issue).
- `app/summoner/[region]/[riotId]/page.tsx` — uses `getRankedByPuuid` with fallback (fixes PUUID-vs-summonerId bug); wires in MasteryPanel + MatchList.
- `components/MatchRow.tsx` — click-to-expand, badges on collapsed view.

## Phase 1.5 — Polish

### New files
- `app/summoner/[region]/[riotId]/loading.tsx` — streams full skeleton during navigation. No more blank 2–5 second screen.
- `components/RecentSearches.tsx` — localStorage-backed pinned recent summoners on home page (max 6, × to remove, deduped).

### Changed
- `app/page.tsx` — calls `pushRecentSearch()` on submit, renders `<RecentSearches />`.
- `app/summoner/[region]/[riotId]/page.tsx` — added `generateMetadata()` for Open Graph rich previews.
- `components/MatchList.tsx` — queue filter state now persists in URL as `?queue=aram`.

## ARAM fix (two commits stacked)

### aram-fix-v2
Multi-queue filter (ARAM groups queues 450 + 100 + 720 + 2400 at the time) was returning empty because Riot's match-v5 `startTime` param has a known bug where it sometimes returns `[]`. Removed `startTime` entirely; multi-queue path now over-fetches up to 40 IDs per queue, merges, sorts newest-first.

### aram-mayhem-acknowledgment
Per Riot issue #1109 (closed as "working as intended"), ARAM: Mayhem matches deliberately return 403 from match-v5. Removed queue 2400 from the ARAM filter list (it was producing guaranteed-failing requests) and added a small inline note under the filter when ARAM is selected, explaining the limitation.

## Tier 1 — Discovery and UX features (this batch)

### New files
- **`lib/pros.ts`** — curated list of 19 famous pro/streamer accounts across KR / LEC / LCS, grouped by region.
- **`components/FeaturedPros.tsx`** — server-rendered "Featured pros" section on home page. Pure static click-through links; no API calls per pro.
- **`components/ChampionSummary.tsx`** — client-side aggregation of the user's recent matches by champion. Top 7 champs with games, W/L, KDA, CS/min, winrate. Zero extra API calls — reshapes data we already have.
- **`app/api/scout/route.ts`** — POST endpoint: given a region + up to 10 PUUIDs, returns each one's solo rank + last-10-ranked W/L + top champion. Concurrency-bounded.
- **`app/compare/page.tsx`** + **`components/CompareSearch.tsx`** — new `/compare` route. Empty state shows an input form; with `?region&a=Name%23TAG&b=Name%23TAG` renders side-by-side profile cards with rank, recent form, top 3 champions, and a "Head to Head" summary with tier-aware scoring.
- **`components/CommandPalette.tsx`** — global Cmd+K / Ctrl+K (or `/`) modal. Region select, Riot ID input, recent searches as quick-pick buttons. Esc to close. Mounted once in root layout.

### Changed
- **`components/LiveGameBanner.tsx`** — significantly upgraded. On mount, calls `/api/scout` for all 10 participants in parallel. Each player now shows: rank + LP, hot-streak 🔥 indicator, recent W/L and WR inline. Still renders correctly if scout fails (degrades gracefully).
- **`app/summoner/[region]/[riotId]/page.tsx`** — passes `region` into `<LiveGameBanner>`; renders `<ChampionSummary>` between Mastery and Match History.
- **`app/page.tsx`** — imports and renders `<FeaturedPros />` between Recent Searches and the feature cards.
- **`app/layout.tsx`** — mounts `<CommandPalette />` at the body root; adds Compare link to nav; adds a small ⌘K hint next to the nav links on desktop.

### Head-to-head scoring formula (compare page)

The "who's ahead" comparison uses a fair tier score:

- `IRON=1 → CHALLENGER=9`, with `GRANDMASTER=8.5`
- Division: `I=0, II=-0.25, III=-0.5, IV=-0.75`
- LP: `leaguePoints / 1000` added as a fractional bump

So **Master 1500 LP > Challenger 100 LP** (correct, since Master+1500 generally implies higher skill than newly-promoted Challenger). Diamond I beats Platinum I. Within Gold IV, 90 LP beats 80 LP.

## How to run

```bash
npm install
npm run dev
# open http://localhost:3000
```

Try:
- Home page scroll — Recent Searches → Featured Pros
- Press **⌘K** (or `/`) anywhere to open command palette
- Visit `/compare`, enter two Riot IDs
- Visit any summoner profile — see the Champion Summary between mastery and match history
- Check a live game — each participant now shows their rank + recent form

## Verification

- All 11 new/changed files pass syntax check
- Every `@/lib/*` import cross-checked against exports
- Tier score logic unit-tested in isolation: Diamond > Platinum, LP tiebreaks, Master 1500 > Challenger 100, unranked = 0
- Multi-queue merge logic was previously verified with simulated data
- Full `tsc --noEmit` needs `node_modules`; run locally or let `npm run dev` surface errors

## Branch structure

```
main
 └── phase-1                        OP.GG feature parity
      └── phase-1-5                 Polish + URL state + recent searches
           └── aram-fix-v2          startTime bug workaround
                └── aram-mayhem-acknowledgment   Drop queue 2400 + notice
                     └── tier-1     ← THIS COMMIT
```
