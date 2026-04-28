# Setting up Redis cache (Vercel Marketplace)

This site uses Redis to cache Riot API responses across requests.
With Redis configured:

- Pages load 5-10x faster on repeat views
- We don't hit Riot's rate limit nearly as often
- The free tier is plenty for normal traffic

Without Redis configured, the site still works — we fall back to per-instance
in-memory caching. You'll just see more 429 rate-limit errors.

## Setup status

If `REDIS_URL` is set in your Vercel environment variables, the cache is
working. If it's not, see "Provisioning Redis" below.

## Provisioning Redis (5 minutes, one-time)

Vercel renamed and restructured their storage offerings in mid-2024. The
modern flow uses **Vercel Marketplace**:

1. Open your project on **vercel.com**
2. Click the **Storage** tab in the project sidebar
3. Click **Create Database** → choose **Marketplace Database Provider**
4. Pick a Redis-compatible provider (Upstash is the default and free)
5. Pick a region close to your deployment (Frankfurt for EU, Cleveland for NA)
6. Give it a name like `lol-statss-cache`
7. Click **Create**
8. When prompted, click **Connect Project** and select `lol-statss`
   - Tick **Production**, **Preview**, and **Development**
9. Vercel automatically adds `REDIS_URL` to your project's environment variables

## Trigger a redeploy

Adding env vars **does not** restart running functions. After connecting
Redis, force a fresh build:

1. Go to **Deployments**
2. Find the latest deployment, click the **⋯** menu on the right
3. Click **Redeploy**
4. **Uncheck** "Use existing build cache" (matters — forces npm install
   to pick up the `redis` dependency)
5. Confirm

Wait ~2 minutes for the build to complete.

## Verify it's working

After the deploy:

1. Search any summoner on the site
2. Vercel dashboard → Storage → click your Redis database → **Browse** tab
3. You should see keys appearing within seconds

Keys look like Riot API URLs:

```
https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/...
https://europe.api.riotgames.com/lol/match/v5/matches/EUW1_1234567890
```

In the **CLI** tab of the database, you can run:

```
DBSIZE          → how many keys are stored total
KEYS *          → list all keys (avoid on huge databases)
GET <key>       → see the cached value
TTL <key>       → seconds until expiry
FLUSHDB         → nuke everything (use carefully)
```

`DBSIZE` is the quickest sanity check — 0 means the cache isn't working.

## Costs

Free tier (Upstash via Vercel Marketplace, as of 2025):

- 256 MB storage
- 10,000 commands per day on the free plan
- $0.20 per 100K requests after that

A profile view costs roughly 10 cache operations. That's ~1,000 page
views per day on the free tier before pay-as-you-go kicks in.

## What gets cached

Every Riot API response. Per-endpoint TTLs:

| Endpoint        | TTL  | Why |
|-----------------|------|-----|
| Match data      | 7d   | Immutable once the match ends |
| Match timeline  | 7d   | Same |
| Match ID list   | 5min | New games come in |
| Account info    | 24h  | PUUID rarely changes |
| Summoner level  | 1h   | Slow changes |
| Ranked entries  | 5min | LP changes per game |
| Mastery         | 1h   | Slow accumulation |
| Active game     | 30s  | Must be fresh |

## Local development

You don't need Redis for local dev. The fallback is in-memory cache,
which is fine for one developer. If you want to test the full Redis
path locally:

```
vercel env pull .env.local
npm run dev
```

`vercel env pull` requires the Vercel CLI: `npm i -g vercel`, then
`vercel link` once to associate this folder with your Vercel project.

## Disabling the cache

To turn the cache off entirely, remove the `REDIS_URL` env var from
your Vercel project. The cache layer detects this and falls back to
in-memory caching. No code change required.
