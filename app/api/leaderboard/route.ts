import { NextRequest, NextResponse } from 'next/server';
import { getChallengerLeague, PLATFORM_HOSTS, type Platform } from '@/lib/riot';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region') as Platform | null;
  const queue = searchParams.get('queue') ?? 'RANKED_SOLO_5x5';

  if (!region) {
    return NextResponse.json(
      { error: 'Missing required param: region' },
      { status: 400 }
    );
  }

  if (!(region in PLATFORM_HOSTS)) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
  }

  try {
    const league = await getChallengerLeague(region, queue);
    // Sort by LP desc and take top 50 for display
    const top = [...league.entries]
      .sort((a, b) => b.leaguePoints - a.leaguePoints)
      .slice(0, 50);
    return NextResponse.json({ league: { ...league, entries: top } });
  } catch (e: any) {
    const status = e.status ?? 500;
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status });
  }
}
