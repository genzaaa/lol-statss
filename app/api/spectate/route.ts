import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountByRiotId,
  getCurrentGame,
  PLATFORM_HOSTS,
  type Platform,
} from '@/lib/riot';
import {
  buildBatScript,
  buildMacScript,
  canSpectate,
} from '@/lib/spectate';

// Don't cache — the encryption key is one-shot and time-limited.
// A cached response would serve a stale script that wouldn't connect.
export const dynamic = 'force-dynamic';

/**
 * GET /api/spectate?region=euw1&gameName=Faker&tagLine=KR1&platform=win
 *
 * Looks up the player's current game, builds the spectator launch
 * script, and returns it as a download.
 *
 * platform: 'win' (default) → .bat for Windows
 *           'mac'             → .command for macOS
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region') as Platform | null;
  const gameName = searchParams.get('gameName');
  const tagLine = searchParams.get('tagLine');
  const platform = (searchParams.get('platform') ?? 'win') as 'win' | 'mac';

  if (!region || !gameName || !tagLine) {
    return NextResponse.json(
      { error: 'Missing required params: region, gameName, tagLine' },
      { status: 400 }
    );
  }
  if (!(region in PLATFORM_HOSTS)) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
  }
  if (!canSpectate(region)) {
    return NextResponse.json(
      { error: `Spectator not supported for region ${region}` },
      { status: 400 }
    );
  }

  try {
    // Resolve to PUUID, then check if they're in a game.
    const account = await getAccountByRiotId(region, gameName, tagLine);
    const game = await getCurrentGame(region, account.puuid);

    if (!game) {
      return NextResponse.json(
        {
          error: 'Player is not currently in a game',
          hint: 'Spectator scripts only work for live games. Wait until the player is in a match.',
        },
        { status: 404 }
      );
    }
    if (!game.observers?.encryptionKey) {
      return NextResponse.json(
        {
          error: 'Spectator credentials unavailable',
          hint: 'Riot did not return observer credentials for this game. This sometimes happens with custom games or Tournament Realm matches.',
        },
        { status: 500 }
      );
    }

    const info = {
      region,
      gameId: game.gameId,
      encryptionKey: game.observers.encryptionKey,
    };

    const isWin = platform !== 'mac';
    const body = isWin ? buildBatScript(info) : buildMacScript(info);
    const filename = isWin
      ? `spectate-${gameName}-${game.gameId}.bat`
      : `spectate-${gameName}-${game.gameId}.command`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': isWin ? 'application/bat' : 'application/x-sh',
        // Force browser to download the file rather than display it.
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    const status = e.status ?? 500;
    return NextResponse.json(
      { error: e.message ?? 'Unknown error' },
      { status }
    );
  }
}
