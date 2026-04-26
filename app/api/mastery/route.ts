import { NextRequest, NextResponse } from 'next/server';
import {
  getTopMasteries,
  getMasteryScore,
  PLATFORM_HOSTS,
  type Platform,
} from '@/lib/riot';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region') as Platform | null;
  const puuid = searchParams.get('puuid');
  const count = parseInt(searchParams.get('count') ?? '10', 10);

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
    const [masteries, score] = await Promise.all([
      getTopMasteries(region, puuid, Math.min(count, 20)),
      getMasteryScore(region, puuid).catch(() => 0),
    ]);
    return NextResponse.json({ masteries, score });
  } catch (e: any) {
    const status = e.status ?? 500;
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status });
  }
}
