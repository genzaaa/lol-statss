# Repo cleanup — read this first

This zip contains **the complete, cumulative state of the project** as
of all the work we've shipped together. The goal: make your local
repo and your GitHub `main` branch match this state exactly, then
deploy from a clean foundation.

## Why this matters

Over many turns we shipped 25 commits as separate zips, each branched
from the last. If you've been unzipping selectively, your local repo
might be a Frankenstein of partial states — hard to debug, hard to
extend cleanly. This cleanup turn forces a full sync so future work
starts from a known-good base.

## What's in this zip

All cumulative features through the tier list portal:

- All Phase 1 features (match detail, badges, mastery, queue filter, leaderboard)
- ARAM fix (queue 2400 dropped)
- Phase 1.5 polish (loading skeleton, RecentSearches, OG tags)
- Tier 1 (live game scout, /compare, ChampionSummary, Cmd+K)
- Pros redesign (/pros directory, 55 pros)
- Champions feature (/champions, /champions/[id])
- Tier 2 (expanded pros, classic combos, compare enhancements)
- Path D (per-pro page with live verification)
- Tier 3a (live pros widget on homepage)
- Tier 3b (pro champion pools)
- Tier 4a (match timeline visualization)
- Redis cache layer with 429 retry-with-backoff
- riot.txt verification file
- Live spectate button (Windows .bat / macOS .command)
- Replay help block on older matches
- Polished spectate UX (mobile detection, post-download modal)
- Twitch integration (embed for streaming pros)
- /api/health endpoint
- Mobile fix for live pros widget
- Path B (per-position stats on summoner profile)
- Spectator-v5 cosmetic fixes
- /tier-list portal page

## How to apply this cleanly (10 minutes)

### Step 1: Backup your existing repo

In Windows File Explorer, copy your `lol-statss` folder somewhere safe
(e.g. rename to `lol-statss-backup-2026-04-30`). If anything goes wrong,
you can restore from this.

### Step 2: Unzip into a fresh folder

Create a new empty folder named `lol-statss-clean`. Unzip this archive
into it. You should see `app/`, `components/`, `lib/`, etc. at the top
level of `lol-statss-clean/`.

### Step 3: Copy your `.git` over

This is the critical step. The zip doesn't contain the `.git` folder
because GitHub's repo tracking is yours, not mine.

In File Explorer:
1. Open your **backup** folder
2. Enable "Show hidden items" in the View tab if needed
3. Find the `.git` folder
4. Copy `.git` into `lol-statss-clean/`

### Step 4: Verify in GitHub Desktop

1. Open GitHub Desktop
2. **File → Add Local Repository**
3. Select the `lol-statss-clean` folder
4. GitHub Desktop should now show your repo
5. The Changes panel should show many files (because we're catching
   up your local main to my main)

### Step 5: Commit the sync

In GitHub Desktop, in the bottom-left:
- **Summary**: `Sync to clean main: all features through tier list portal`
- Click **Commit to main**

### Step 6: Push

Click **Push origin** in GitHub Desktop. GitHub may warn about a large
change — accept.

### Step 7: Force redeploy on Vercel

1. Vercel dashboard → Deployments
2. Latest deployment → ⋯ menu → **Redeploy**
3. **Uncheck** "Use existing build cache"
4. Click **Redeploy**
5. Wait ~2 minutes

### Step 8: Verify

Hit `https://lol-statss.vercel.app/api/health` — `overall` should be
`"healthy"` (or `"degraded"` if Twitch isn't set up yet — that's fine).

Browse the site:
- `/` — search + live pros widget
- `/champions` — champions list
- `/pros` — pros directory; click any card → per-pro page
- `/compare` — compare two summoners
- `/leaderboard` — challenger leaderboard
- `/tier-list` — new portal page (was 404 before)
- Search any summoner → profile renders with match history, expand
  a match for timeline + replay help

If any of those break, tell me and we'll fix.

## After this is done

From here on, each new feature is one zip, one commit, no branch
confusion. We start from a clean main.

## If you customized lib/pros.ts locally

The zip overwrites your `lib/pros.ts`. Your backup folder preserves
your edits. Diff after the sync if you want to keep specific changes.

## What the zip excludes

`node_modules/`, `.next/`, log files. Vercel rebuilds these
automatically on deploy.
