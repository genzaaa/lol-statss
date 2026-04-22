# LoL.Stats — an OP.GG-style League of Legends stats site

A production-ready Next.js 14 app that uses the Riot Games API to show summoner profiles, ranks, match history, live games, and Challenger leaderboards.

## What's inside

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- All Riot API calls go through **server-side API routes** — your key is never exposed to the browser
- In-memory caching to stay under rate limits
- Mobile responsive

## Features

- 🔍 Summoner search by Riot ID (e.g. `Faker#KR1`) across all regions
- 🏆 Solo/Duo + Flex rank display with tier icons, LP, win rate
- ⚔️ Last-10 match history with champions, KDA, items, summoner spells, and full team lists
- 🔴 Live game detection — if the player is in-game, see both teams with a live timer
- 📊 Challenger leaderboard (top 50) for any region, Solo/Duo or Flex

## Quick start (local dev)

### 1. Install dependencies

```bash
npm install
```

### 2. Add your Riot API key

Get a development key at [developer.riotgames.com](https://developer.riotgames.com) (expires every 24h) or apply for a Personal API Key (no daily expiry).

Create a `.env.local` file in the project root:

```
RIOT_API_KEY=RGAPI-your-key-here
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel (recommended — free tier works)

### Option A: Via GitHub (cleanest)

1. Push this project to a GitHub repo
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Before deploying, click **Environment Variables** and add:
   - Name: `RIOT_API_KEY`
   - Value: your Riot API key
4. Click **Deploy**

Your site will be live at `https://<project-name>.vercel.app` in ~1 minute.

### Option B: Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel           # first deploy (preview)
vercel env add RIOT_API_KEY
# paste your key, pick Production + Preview + Development
vercel --prod    # production deploy
```

### Updating the API key

When your dev key expires (every 24h):
- Vercel dashboard → your project → Settings → Environment Variables
- Edit `RIOT_API_KEY`, redeploy (or just redeploy from the Deployments tab)

For a permanent solution, apply for a **Personal API Key** at [developer.riotgames.com](https://developer.riotgames.com) — takes a few days but the key doesn't expire.

## Project structure

```
/app
  /api                    — Server-side API routes (key-safe)
    /summoner             — GET ?region&gameName&tagLine
    /matches              — GET ?region&puuid&count
    /live                 — GET ?region&puuid
    /leaderboard          — GET ?region&queue
  /summoner/[region]/[riotId]  — Profile page
  /leaderboard            — Challenger leaderboard
  layout.tsx, page.tsx    — Root layout + home
/components
  RankedCard.tsx
  MatchRow.tsx
  LiveGameBanner.tsx
/lib
  riot.ts                 — Riot API client
  ddragon.ts              — Data Dragon (champion/item icons)
  format.ts               — Utility formatters
```

## Architecture notes

### Why server-side routes?

The Riot API key must never ship to the browser — anyone inspecting the network tab could steal it. Every Riot API call in this app happens in Next.js server code (`/app/api/*` or server components), which runs on Vercel's servers. The browser only sees sanitized JSON responses.

### Region routing

Riot splits endpoints into two types:
- **Platform routing** (e.g. `euw1`, `na1`) for summoner, league, spectator endpoints
- **Regional routing** (`americas`, `europe`, `asia`, `sea`) for account and match endpoints

`lib/riot.ts` handles the mapping automatically.

### Caching

Two layers:
1. **In-memory cache** inside each serverless function invocation — prevents duplicate calls within one request
2. **Next.js fetch cache** (`next.revalidate`) — matches are cached 1h (they don't change), rank 2min, live game 30s

### Rate limit considerations

Development keys: 20 req/s, 100 req / 2min. The app fetches:
- Profile page: ~3 calls for account+summoner+rank, 1 for match IDs, up to 10 for match details, 1 for live game = **~15 calls**
- This fits comfortably, but rapid page refreshes can trip the limit. Caching helps.

## Legal / Riot policy notes

This project is a non-commercial fan project. Required disclaimers already appear in the footer. If you plan to:
- Monetize → you **must** apply for a Production API Key and go through Riot's app review
- Publish publicly at scale → same requirement
- Keep it for personal/portfolio use → development or personal key is fine

Read: [developer.riotgames.com/policies](https://developer.riotgames.com/policies)

## Common issues

**"Forbidden 403"** — API key invalid or expired. Regenerate and update `RIOT_API_KEY`.

**"Not Found 404" on summoner search** — Wrong region or wrong Riot ID casing. Riot IDs are now `Name#TAG`, not old summoner names. Check the player is on the region you selected.

**Leaderboard shows summoner IDs instead of names** — Riot's league endpoint only returns summoner IDs; resolving each to a Riot ID requires one extra API call per player, which would blow your rate limit. A production build would queue these with a worker; left as-is for simplicity.

**Rate limit 429** — You hit the 20 req/s or 100 req / 2min cap. Wait and retry, or apply for a personal key.

## License

MIT — use it however you like.
