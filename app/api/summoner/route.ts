import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getRankedBySummonerId,
  PLATFORM_HOSTS,
  type Platform,
} from '@/lib/riot';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region') as Platform | null;
  const gameName = searchParams.get('gameName');
  const tagLine = searchParams.get('tagLine');

  if (!region || !gameName || !tagLine) {
    return NextResponse.json(
      { error: 'Missing required params: region, gameName, tagLine' },
      { status: 400 }
    );
  }

  if (!(region in PLATFORM_HOSTS)) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
  }

  try {
    const account = await getAccountByRiotId(region, gameName, tagLine);
    const summoner = await getSummonerByPuuid(region, account.puuid);
    const ranked = await getRankedBySummonerId(region, summoner.id);

    return NextResponse.json({ account, summoner, ranked });
  } catch (e: any) {
    const status = e.status ?? 500;
    return NextResponse.json(
      { error: e.message ?? 'Unknown error' },
      { status }
    );
  }
}
