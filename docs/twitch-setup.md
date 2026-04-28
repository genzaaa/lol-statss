# Setting up Twitch integration

The site can show a "Watch on Twitch" embed for pros who are currently
streaming. This is optional — without Twitch credentials, the feature
just stays hidden.

## One-time setup (5 minutes)

1. Go to https://dev.twitch.tv/console/apps
2. Sign in with any Twitch account (yours; doesn't have to be a pro's)
3. Click **Register Your Application**
4. Fill in:
   - **Name:** `lol-statss` (or anything unique)
   - **OAuth Redirect URLs:** `https://lol-statss.vercel.app`
     - This field is required by Twitch's form but we don't actually
       use OAuth. Any URL that's yours works.
   - **Category:** `Website Integration`
   - **Client Type:** `Confidential`
5. Click **Create**
6. On the app's page, copy the **Client ID**
7. Click **New Secret**, copy the **Client Secret** (it's only shown once)
8. Add both to your Vercel project's environment variables:
   - `TWITCH_CLIENT_ID` = your client ID
   - `TWITCH_CLIENT_SECRET` = your secret
9. Redeploy with cache cleared

## Verify it works

After deploy, open the homepage. If a pro with a `twitchUsername` set
in `lib/pros.ts` is currently streaming, their card will:

- Show a 🔴 viewer count next to game length
- Have a small "Watch on Twitch" button next to the Spectate button

Click "Watch on Twitch" to embed the player inline.

## Adding more streamers

Each pro entry in `lib/pros.ts` can have a `twitchUsername` field. The
value should be the Twitch login (lowercase, the slug from twitch.tv URLs).

Example:

```ts
{
  slug: 'caps',
  name: 'Caps',
  // ...other fields
  twitchUsername: 'caps',
},
```

When you set this, it doesn't always mean the pro streams every day —
it means "if they're streaming AND in a game, show the embed." When
they're not live, nothing changes.

## Costs

Twitch Helix API is free for unauthenticated app use, with rate limits
of 800 requests per minute. Our usage is one batched `/streams` request
per 60-second cache window, which is far under any limit.

## Disabling

Remove `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` from your Vercel
env vars. The Twitch UI silently disappears. No code changes needed.
