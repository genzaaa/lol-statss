import { NextRequest, NextResponse } from 'next/server';
import { getCurrentGame, PLATFORM_HOSTS, type Platform } from '@/lib/riot';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region') as Platform | null;
  const puuid = searchParams.get('puuid');

  if (!region || !puuid) {
    return NextResponse.json(
      { error: 'Missing required params: region, puuid' },
      { status: 400 }
    );
  }

  if (!(region in PLATFORM_HOSTS)) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
  }

  try {
    const game = await getCurrentGame(region, puuid);
    return NextResponse.json({ game });
  } catch (e: any) {
    const status = e.status ?? 500;
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status });
  }
}
