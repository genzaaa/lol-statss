# Setting up Vercel KV (Redis cache)

This site uses Vercel KV (a managed Redis) to cache Riot API responses
across requests. With KV configured:

- Pages load 5-10x faster on repeat views
- We don't hit Riot's rate limit nearly as often
- The free tier is plenty for normal traffic

Without KV configured, the site still works — we fall back to per-instance
in-memory caching. You'll just get more 429 rate-limit errors.

## One-time setup (5 minutes)

1. Open your project on **vercel.com**
2. Click the **Storage** tab in the project sidebar
3. Click **Create Database** → choose **KV** (or "Upstash for Redis" if Vercel renames it)
4. Pick a name like `lol-statss-cache` and a region close to your deployment (probably `Frankfurt` for EU users or `Cleveland` for NA)
5. Click **Create**
6. Vercel will offer to add the connection variables to your project — click **Connect Project** and select `lol-statss`
7. The variables `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, and `KV_URL` get added automatically

That's it. The next deploy picks them up. No code changes needed.

## Verify it's working

After the next deploy, open a profile page twice. The first load should
take ~3-5 seconds (cold cache, fetching from Riot). The second load should
be under 500ms (hot cache, reading from KV).

If you want to confirm at the API level:

```
curl https://lol-statss.vercel.app/api/match-timeline?region=euw1&matchId=EUW1_xxx
```

First request: slow. Second request: instant.

## Costs

Free tier limits (as of writing):

- 256 MB storage
- 30,000 commands per day
- 100 MB bandwidth per day

A typical profile view costs ~10 KV commands. So 30K/day = ~3000 page
views per day before the free tier maxes out. After that it's $20/month
for the next tier. We are very far from that.

## What gets cached

Everything Riot-API-derived. Per-endpoint TTLs:

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

You don't need KV for local dev. The fallback is in-memory cache, which
is fine for one developer. If you want to test KV locally, install the
Vercel CLI and run `vercel env pull` to get the env vars in `.env.local`.

## Disabling KV

If KV becomes a problem for any reason, just remove the env vars from
your Vercel project. The cache layer detects this and falls back to
in-memory caching. No code change required.
