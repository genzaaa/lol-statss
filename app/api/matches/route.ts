import { NextRequest, NextResponse } from 'next/server';
import { getMatchIds, getMatch, PLATFORM_HOSTS, type Platform } from '@/lib/riot';

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
    const ids = await getMatchIds(region, puuid, Math.min(count, 20));
    // Fetch all matches in parallel. With 20 matches this is within rate limits.
    const matches = await Promise.all(ids.map((id) => getMatch(region, id)));
    return NextResponse.json({ matches });
  } catch (e: any) {
    const status = e.status ?? 500;
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status });
  }
}
