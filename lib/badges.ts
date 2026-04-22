// Per-match performance badges, computed client-side from `Match` data.
// Inspired by OP.GG's post-game badges.

import type { Match, MatchParticipant } from './riot';

export type BadgeTone = 'gold' | 'purple' | 'blue' | 'green' | 'red' | 'gray';

export interface Badge {
  id: string;
  label: string;
  tone: BadgeTone;
  tooltip: string;
}

// Compute badges for a single participant in a match.
// Order matters slightly — we prepend the headline "MVP/ACE" at position 0.
export function computeBadges(match: Match, puuid: string): Badge[] {
  const me = match.info.participants.find((p) => p.puuid === puuid);
  if (!me) return [];

  const badges: Badge[] = [];

  // Prefer teamPosition (final, matchmade), fall back to individualPosition
  const myTeam = match.info.participants.filter((p) => p.teamId === me.teamId);
  const enemyTeam = match.info.participants.filter((p) => p.teamId !== me.teamId);
  const durationSec = match.info.gameDuration;
  const durationMin = Math.max(durationSec / 60, 1);

  // --- Headline: MVP (best KDA on winning team) or ACE (best KDA on losing team) ---
  const sameTeamSortedByKda = [...myTeam].sort(
    (a, b) => kdaRatio(b) - kdaRatio(a)
  );
  if (sameTeamSortedByKda[0]?.puuid === me.puuid) {
    if (me.win) {
      badges.push({
        id: 'mvp',
        label: 'MVP',
        tone: 'gold',
        tooltip: 'Highest KDA on the winning team',
      });
    } else {
      badges.push({
        id: 'ace',
        label: 'ACE',
        tone: 'purple',
        tooltip: 'Highest KDA on the losing team',
      });
    }
  }

  // --- Multi-kills ---
  if ((me.pentaKills ?? 0) >= 1) {
    badges.push({
      id: 'penta',
      label: 'PENTAKILL',
      tone: 'red',
      tooltip: 'Pentakill achieved',
    });
  } else if ((me.quadraKills ?? 0) >= 1) {
    badges.push({
      id: 'quadra',
      label: 'Quadrakill',
      tone: 'red',
      tooltip: 'Quadrakill achieved',
    });
  } else if ((me.tripleKills ?? 0) >= 1) {
    badges.push({
      id: 'triple',
      label: 'Triple Kill',
      tone: 'purple',
      tooltip: 'Triple kill achieved',
    });
  }

  // --- Farm Lord: >9 CS/min ---
  const cs = me.totalMinionsKilled + me.neutralMinionsKilled;
  const csPerMin = cs / durationMin;
  if (csPerMin >= 9) {
    badges.push({
      id: 'farm-lord',
      label: 'Farm Lord',
      tone: 'green',
      tooltip: `${csPerMin.toFixed(1)} CS/min (${cs} total)`,
    });
  }

  // --- Damage Dealer: >= 35% of team damage to champs ---
  const teamDmg = myTeam.reduce(
    (s, p) => s + (p.totalDamageDealtToChampions ?? 0),
    0
  );
  const myDmg = me.totalDamageDealtToChampions ?? 0;
  if (teamDmg > 0 && myDmg / teamDmg >= 0.35) {
    const pct = Math.round((myDmg / teamDmg) * 100);
    badges.push({
      id: 'damage-dealer',
      label: 'Damage Dealer',
      tone: 'red',
      tooltip: `${pct}% of team's damage to champions`,
    });
  }

  // --- Vision God (for >= 20min games, >= 45 vision score) ---
  if (durationSec >= 20 * 60 && (me.visionScore ?? 0) >= 45) {
    badges.push({
      id: 'vision-god',
      label: 'Vision God',
      tone: 'blue',
      tooltip: `Vision score ${me.visionScore}`,
    });
  }

  // --- Tower Crusher: 3+ tower kills personally ---
  if ((me.turretKills ?? 0) >= 3) {
    badges.push({
      id: 'tower-crusher',
      label: 'Tower Crusher',
      tone: 'gold',
      tooltip: `${me.turretKills} turrets destroyed`,
    });
  }

  // --- Tank / Unkillable: very high damage taken + high self-mitigation ---
  const totalTaken = me.totalDamageTaken ?? 0;
  const teamTaken = myTeam.reduce((s, p) => s + (p.totalDamageTaken ?? 0), 0);
  if (teamTaken > 0 && totalTaken / teamTaken >= 0.3 && me.deaths <= 4) {
    badges.push({
      id: 'juggernaut',
      label: 'Juggernaut',
      tone: 'purple',
      tooltip: `Absorbed ${Math.round((totalTaken / teamTaken) * 100)}% of team's damage`,
    });
  }

  // --- Healer: significant healing on allies ---
  const teamHealing = me.totalHealsOnTeammates ?? 0;
  if (teamHealing >= 10000) {
    badges.push({
      id: 'healer',
      label: 'Healer',
      tone: 'green',
      tooltip: `${teamHealing.toLocaleString()} healing on teammates`,
    });
  }

  // --- Shot-caller: top damage to objectives ---
  const objDmg = me.damageDealtToObjectives ?? 0;
  const teamObjDmg = myTeam.reduce(
    (s, p) => s + (p.damageDealtToObjectives ?? 0),
    0
  );
  if (teamObjDmg > 0 && objDmg / teamObjDmg >= 0.35) {
    badges.push({
      id: 'objective-slayer',
      label: 'Objective Slayer',
      tone: 'blue',
      tooltip: `${Math.round((objDmg / teamObjDmg) * 100)}% of team's objective damage`,
    });
  }

  // --- First Blood ---
  if (me.firstBloodKill) {
    badges.push({
      id: 'first-blood',
      label: 'First Blood',
      tone: 'red',
      tooltip: 'Scored first blood',
    });
  }

  // --- Flawless Victory: win with 0 deaths ---
  if (me.win && me.deaths === 0) {
    badges.push({
      id: 'flawless',
      label: 'Flawless',
      tone: 'gold',
      tooltip: 'Won without dying',
    });
  }

  // --- Double Digit Kills ---
  if (me.kills >= 15) {
    badges.push({
      id: 'killer',
      label: 'Killer',
      tone: 'red',
      tooltip: `${me.kills} kills`,
    });
  }

  // --- Game Length flags (for context in tooltips / secondary UI) ---
  // (no visible badge, but filters above use duration)

  return badges;
}

// Helper — re-implemented here to avoid circular deps with lib/format.ts
function kdaRatio(p: MatchParticipant): number {
  if (p.deaths === 0) return p.kills + p.assists + 10; // "Perfect" > regular
  return (p.kills + p.assists) / p.deaths;
}

// Return the single most important badge (for compact display in match row)
export function primaryBadge(match: Match, puuid: string): Badge | null {
  const all = computeBadges(match, puuid);
  if (all.length === 0) return null;
  // MVP / ACE if present, otherwise the first computed one
  return all.find((b) => b.id === 'mvp' || b.id === 'ace') ?? all[0];
}

export const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  gold: 'bg-accent/20 text-accent border-accent/40',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
  green: 'bg-win/20 text-win border-win/40',
  red: 'bg-loss/20 text-loss border-loss/40',
  gray: 'bg-panel2 text-gray-300 border-line',
};
