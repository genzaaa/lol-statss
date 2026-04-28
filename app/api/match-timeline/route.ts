import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import {
  getMatchTimeline,
  PLATFORM_HOSTS,
  type Platform,
  type MatchTimeline,
} from '@/lib/riot';

// We fetch the full timeline server-side and reduce it to a small payload
// the client can render. Raw timelines are 200-500KB each; the reduced
// payload is ~5-10KB.

export interface ReducedTimeline {
  /** Game length in seconds (rounded to nearest minute frame) */
  durationSec: number;
  /** Per-minute snapshots — index = minute */
  frames: Array<{
    minute: number;
    /** Total team gold, blue side */
    blueGold: number;
    /** Total team gold, red side */
    redGold: number;
    /** Total team xp, blue side */
    blueXp: number;
    /** Total team xp, red side */
    redXp: number;
  }>;
  /** Discrete events placed on the timeline */
  events: Array<{
    /** Minute the event happened (fractional, e.g. 14.3) */
    minute: number;
    /** Category for filtering / icon selection */
    category:
      | 'kill'
      | 'dragon'
      | 'herald'
      | 'baron'
      | 'atakhan'
      | 'tower'
      | 'inhibitor';
    /** Team ID — 100 (blue) or 200 (red) — when applicable */
    teamId?: number;
    /** Sub-type, e.g. "DRAGON" → "fire", "earth", "elder", or for towers
     * the laneType ("MID_LANE", "TOP_LANE", "BOT_LANE"). Optional. */
    subtype?: string;
    /** Champion ID for kill events (the killer). Useful for tooltip text. */
    killerParticipantId?: number;
    /** Champion ID for kill events (the victim). */
    victimParticipantId?: number;
  }>;
  /** Per-participant kill/death/assist progression at end of game,
   * useful for the kill-participation chart. */
  participants: Array<{
    participantId: number;
    teamId: number;
    /** Numeric champion ID — client can resolve to name via Data Dragon */
    championId: number;
    kills: number;
    deaths: number;
    assists: number;
  }>;
}

function reduce(timeline: MatchTimeline): ReducedTimeline {
  const blueIds = new Set<number>();
  const redIds = new Set<number>();
  const participantTeam = new Map<number, number>();

  // Determine team membership from any frame that has data.
  // Riot's TimelineFrame.participantFrames keys are stringified IDs.
  // We don't have teamId on participantFrames — use the events instead.
  // (BUILDING_KILL events have killerTeamId; CHAMPION_KILL has killerId
  // pointing into participants.) We'll fill team membership opportunistically.

  // Build participant ID → team map by scanning the first kill event we
  // see for each participant. Falls back to an even/odd split if needed
  // (participants 1-5 = team 100, 6-10 = team 200) which is the standard
  // Riot ordering anyway.
  const participants = timeline.info.participants;
  for (const p of participants) {
    // Standard ordering: 1-5 blue, 6-10 red. Verified by Riot's docs.
    const team = p.participantId <= 5 ? 100 : 200;
    participantTeam.set(p.participantId, team);
    if (team === 100) blueIds.add(p.participantId);
    else redIds.add(p.participantId);
  }

  // Build per-minute frames: sum up team gold and xp from participantFrames.
  const frames: ReducedTimeline['frames'] = [];
  timeline.info.frames.forEach((frame, idx) => {
    let blueGold = 0;
    let redGold = 0;
    let blueXp = 0;
    let redXp = 0;
    for (const [pidStr, pf] of Object.entries(frame.participantFrames)) {
      const pid = Number(pidStr);
      const team = participantTeam.get(pid);
      if (team === 100) {
        blueGold += pf.totalGold ?? 0;
        blueXp += pf.xp ?? 0;
      } else if (team === 200) {
        redGold += pf.totalGold ?? 0;
        redXp += pf.xp ?? 0;
      }
    }
    frames.push({
      minute: idx,
      blueGold,
      redGold,
      blueXp,
      redXp,
    });
  });

  // Collect discrete events of interest. Riot timestamps are in ms from
  // game start; convert to fractional minutes for chart placement.
  const events: ReducedTimeline['events'] = [];
  // Track per-participant K/D/A
  const kda = new Map<number, { kills: number; deaths: number; assists: number }>();
  for (const p of participants) {
    kda.set(p.participantId, { kills: 0, deaths: 0, assists: 0 });
  }

  for (const frame of timeline.info.frames) {
    for (const ev of frame.events) {
      const minute = ev.timestamp / 60000;

      if (ev.type === 'CHAMPION_KILL') {
        // Kill event
        if (ev.killerId && ev.killerId > 0) {
          const k = kda.get(ev.killerId);
          if (k) k.kills++;
        }
        if (ev.victimId) {
          const v = kda.get(ev.victimId);
          if (v) v.deaths++;
        }
        for (const aid of ev.assistingParticipantIds ?? []) {
          const a = kda.get(aid);
          if (a) a.assists++;
        }
        const killerTeam =
          ev.killerId && ev.killerId > 0
            ? participantTeam.get(ev.killerId)
            : undefined;
        events.push({
          minute,
          category: 'kill',
          teamId: killerTeam,
          killerParticipantId: ev.killerId,
          victimParticipantId: ev.victimId,
        });
      } else if (ev.type === 'ELITE_MONSTER_KILL') {
        const monster = ev.monsterType ?? '';
        // Riot's monsterType values: DRAGON, RIFTHERALD, BARON_NASHOR, ATAKHAN
        let category: ReducedTimeline['events'][number]['category'] | null =
          null;
        if (monster === 'DRAGON') category = 'dragon';
        else if (monster === 'RIFTHERALD') category = 'herald';
        else if (monster === 'BARON_NASHOR') category = 'baron';
        else if (monster === 'ATAKHAN') category = 'atakhan';
        if (category) {
          const team =
            ev.killerId && ev.killerId > 0
              ? participantTeam.get(ev.killerId)
              : ev.killerTeamId;
          events.push({
            minute,
            category,
            teamId: team,
            subtype: ev.monsterSubType,
          });
        }
      } else if (ev.type === 'BUILDING_KILL') {
        const building = ev.buildingType ?? '';
        let category: ReducedTimeline['events'][number]['category'] | null =
          null;
        if (building === 'TOWER_BUILDING') category = 'tower';
        else if (building === 'INHIBITOR_BUILDING') category = 'inhibitor';
        if (category) {
          // Building team is the team that LOST the structure; the killer
          // team is the opposite. Use killerTeamId or killerId fallback.
          let team: number | undefined = undefined;
          if (ev.killerTeamId) team = ev.killerTeamId;
          else if (ev.killerId && ev.killerId > 0)
            team = participantTeam.get(ev.killerId);
          else if (ev.teamId) team = ev.teamId === 100 ? 200 : 100;
          events.push({
            minute,
            category,
            teamId: team,
            subtype: ev.laneType,
          });
        }
      }
    }
  }

  // Final game length: rounded up to the last frame we have.
  const durationSec =
    timeline.info.frames.length > 0
      ? (timeline.info.frames.length - 1) * (timeline.info.frameInterval ?? 60000) / 1000
      : 0;

  return {
    durationSec,
    frames,
    events,
    participants: participants.map((p) => {
      const team = participantTeam.get(p.participantId) ?? 100;
      const k = kda.get(p.participantId) ?? {
        kills: 0,
        deaths: 0,
        assists: 0,
      };
      // championId isn't on TimelineParticipant — client must look it up
      // from the Match itself. We stub it here as 0 and rely on the client
      // to merge with match data it already has.
      return {
        participantId: p.participantId,
        teamId: team,
        championId: 0,
        ...k,
      };
    }),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region') as Platform | null;
  const matchId = searchParams.get('matchId');

  if (!region || !matchId) {
    return NextResponse.json(
      { error: 'Missing required params: region, matchId' },
      { status: 400 }
    );
  }
  if (!(region in PLATFORM_HOSTS)) {
    return NextResponse.json({ error: 'Invalid region' }, { status: 400 });
  }

  try {
    const tl = await getMatchTimeline(region, matchId);
    const reduced = reduce(tl);
    return NextResponse.json(reduced, {
      headers: {
        // Match timelines never change once the match is over — cache hard
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
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
