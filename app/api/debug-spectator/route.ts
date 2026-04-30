import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountByRiotId,
  PLATFORM_HOSTS,
  type Platform,
} from '@/lib/riot';

// Diagnostic endpoint — bypasses our cache and returns the RAW spectator-v5
// response from Riot so we can see what fields are present, what's missing,
// and how many participants come back.
//
// Two ways to call it:
//   /api/debug-spectator?region=euw1&puuid=<known-puuid>
//   /api/debug-spectator?region=euw1&gameName=Caps&tagLine=EUW
//
// Returns JSON shaped like:
//   { ok: true, status: 200, body: { ... raw response ... } }
//   or
//   { ok: false, status: 404, error: "..." }
//
// Use this to verify whether spectator-v5 still returns full data, partial
// data, or 404s. Compare actual response shape vs our CurrentGame type.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region') as Platform | null;
  const puuidParam = searchParams.get('puuid');
  const gameName = searchParams.get('gameName');
  const tagLine = searchParams.get('tagLine');

  if (!region || !(region in PLATFORM_HOSTS)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid or missing region' },
      { status: 400 }
    );
  }

  const KEY = process.env.RIOT_API_KEY ?? '';
  if (!KEY) {
    return NextResponse.json(
      { ok: false, error: 'RIOT_API_KEY not set' },
      { status: 500 }
    );
  }

  // Resolve puuid from gameName/tagLine if needed
  let puuid = puuidParam;
  if (!puuid) {
    if (!gameName || !tagLine) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Provide either puuid or both gameName and tagLine',
        },
        { status: 400 }
      );
    }
    try {
      const account = await getAccountByRiotId(region, gameName, tagLine);
      puuid = account.puuid;
    } catch (e: any) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to resolve riot ID',
          detail: e?.message ?? String(e),
        },
        { status: e?.status ?? 500 }
      );
    }
  }

  // Hit spectator-v5 directly. We deliberately do NOT use our cached
  // riotFetch here — we want the raw response.
  const host = PLATFORM_HOSTS[region];
  const url = `https://${host}/lol/spectator/v5/active-games/by-summoner/${puuid}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'X-Riot-Token': KEY },
      cache: 'no-store',
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Network error calling Riot API',
        detail: e?.message ?? String(e),
      },
      { status: 502 }
    );
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => null);
  }

  // Compute a quick analysis of what's actually present vs missing
  let analysis: any = null;
  if (res.ok && body && typeof body === 'object') {
    const participants = Array.isArray(body.participants) ? body.participants : [];
    const team100 = participants.filter((p: any) => p.teamId === 100).length;
    const team200 = participants.filter((p: any) => p.teamId === 200).length;
    const otherTeams = participants.length - team100 - team200;
    analysis = {
      participantCount: participants.length,
      team100,
      team200,
      otherTeams,
      hasQueueConfigId: body.queueConfigId !== undefined,
      hasObservers: body.observers !== undefined,
      hasObserverEncryptionKey: body.observers?.encryptionKey !== undefined,
      hasGameMode: body.gameMode !== undefined,
      sampleParticipantFields:
        participants[0] ? Object.keys(participants[0]).sort() : [],
    };
  }

  return NextResponse.json(
    {
      ok: res.ok,
      status: res.status,
      url: url.replace(puuid, puuid.substring(0, 8) + '...'),
      analysis,
      body,
    },
    {
      status: 200, // always 200 from our endpoint so the JSON is readable
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
