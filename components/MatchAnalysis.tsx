'use client';

import type { Match, MatchParticipant } from '@/lib/riot';

interface Props {
  match: Match;
  me: MatchParticipant;
}

interface Signal {
  /** Headline */
  text: string;
  /** Plain-language detail */
  detail?: string;
  /** Severity color */
  tone: 'bad' | 'mixed' | 'neutral';
}

/**
 * Surfaces objective, non-judgmental signals about a match. Deliberately
 * avoids the word "inting" — that requires intent which we cannot infer.
 * Instead we report observable facts and let the user form their own
 * conclusions.
 *
 * Signals we look for:
 * - Lowest team KDA among the 5 ally roles
 * - Death disparity: a player with 2x+ deaths vs team average
 * - Significant CS gap on the same role across teams
 * - Damage outlier: a player below 50% of team's average damage
 * - Vision score gap: support with much lower vision than enemy support
 * - Game-end gold deficit: team ended >5k gold behind
 *
 * We render at most ~5 signals to keep the panel scannable.
 */
function gatherSignals(match: Match, me: MatchParticipant): Signal[] {
  const signals: Signal[] = [];
  const myTeam = match.info.participants.filter((p) => p.teamId === me.teamId);
  const enemyTeam = match.info.participants.filter((p) => p.teamId !== me.teamId);
  const otherAllies = myTeam.filter((p) => p.puuid !== me.puuid);

  // Helper: average of a numeric field across an array
  const avg = (arr: MatchParticipant[], pick: (p: MatchParticipant) => number) =>
    arr.length ? arr.reduce((s, p) => s + pick(p), 0) / arr.length : 0;

  // 1. Death disparity within team
  const teamAvgDeaths = avg(myTeam, (p) => p.deaths);
  const highDeathAllies = otherAllies
    .filter((p) => p.deaths >= teamAvgDeaths * 2 && p.deaths >= 7)
    .sort((a, b) => b.deaths - a.deaths);
  if (highDeathAllies.length > 0) {
    const ally = highDeathAllies[0];
    const role = (ally.teamPosition || '').toLowerCase() || 'an ally';
    signals.push({
      text: `${ally.championName} (${humanRole(role)}) died ${ally.deaths} times`,
      detail: `Team average was ${teamAvgDeaths.toFixed(1)}. Repeated deaths often correlate with lost lanes or risky engages.`,
      tone: 'bad',
    });
  }

  // 2. Damage outlier: someone on your team below 50% of team avg damage
  // (excluding supports — they're expected to do less damage)
  const damageDealers = myTeam.filter(
    (p) => (p.teamPosition || '').toUpperCase() !== 'UTILITY'
  );
  if (damageDealers.length >= 3) {
    const teamDmgAvg = avg(damageDealers, (p) => p.totalDamageDealtToChampions ?? 0);
    const lowDmg = damageDealers
      .filter(
        (p) =>
          p.puuid !== me.puuid &&
          (p.totalDamageDealtToChampions ?? 0) < teamDmgAvg * 0.5 &&
          teamDmgAvg > 5000
      )
      .sort(
        (a, b) =>
          (a.totalDamageDealtToChampions ?? 0) -
          (b.totalDamageDealtToChampions ?? 0)
      );
    if (lowDmg.length > 0) {
      const p = lowDmg[0];
      const dmg = p.totalDamageDealtToChampions ?? 0;
      const pct = Math.round((dmg / teamDmgAvg) * 100);
      signals.push({
        text: `${p.championName} dealt only ${pct}% of team's average damage`,
        detail: `${dmg.toLocaleString()} vs team avg ${Math.round(teamDmgAvg).toLocaleString()}.`,
        tone: 'bad',
      });
    }
  }

  // 3. CS gap on same role
  for (const ally of myTeam) {
    if (ally.puuid === me.puuid) continue;
    const role = (ally.teamPosition || '').toUpperCase();
    if (!role || role === 'UTILITY') continue; // supports don't farm
    const enemyOpponent = enemyTeam.find(
      (e) => (e.teamPosition || '').toUpperCase() === role
    );
    if (!enemyOpponent) continue;
    const allyCS = ally.totalMinionsKilled + ally.neutralMinionsKilled;
    const enemyCS =
      enemyOpponent.totalMinionsKilled + enemyOpponent.neutralMinionsKilled;
    const minutes = match.info.gameDuration / 60;
    if (minutes < 15) continue;
    const gap = enemyCS - allyCS;
    if (gap >= 60 && enemyCS > 0) {
      signals.push({
        text: `${ally.championName} fell ${gap} CS behind their lane opponent`,
        detail: `${allyCS} vs ${enemyCS} (${(allyCS / minutes).toFixed(1)} vs ${(enemyCS / minutes).toFixed(1)} CS/min over ${Math.floor(minutes)} mins).`,
        tone: 'bad',
      });
      break; // one CS callout is enough
    }
  }

  // 4. Vision score for support
  if ((me.teamPosition || '').toUpperCase() !== 'UTILITY') {
    const mySupport = myTeam.find(
      (p) => (p.teamPosition || '').toUpperCase() === 'UTILITY'
    );
    const enemySupport = enemyTeam.find(
      (p) => (p.teamPosition || '').toUpperCase() === 'UTILITY'
    );
    if (mySupport && enemySupport) {
      const myVS = mySupport.visionScore ?? 0;
      const enVS = enemySupport.visionScore ?? 0;
      if (enVS > myVS * 1.5 && enVS - myVS > 15) {
        signals.push({
          text: `${mySupport.championName} had ${myVS} vision score (enemy support: ${enVS})`,
          detail: `Lower vision usually means fewer wards placed and more enemy ganks unseen.`,
          tone: 'mixed',
        });
      }
    }
  }

  // 5. Game-end objective tally
  const myTeamData = match.info.teams?.find((t) => t.teamId === me.teamId);
  const enemyTeamData = match.info.teams?.find((t) => t.teamId !== me.teamId);
  if (myTeamData && enemyTeamData) {
    const myObjectives =
      (myTeamData.objectives?.dragon?.kills ?? 0) +
      (myTeamData.objectives?.baron?.kills ?? 0) * 2 +
      (myTeamData.objectives?.tower?.kills ?? 0) * 0.5;
    const enObjectives =
      (enemyTeamData.objectives?.dragon?.kills ?? 0) +
      (enemyTeamData.objectives?.baron?.kills ?? 0) * 2 +
      (enemyTeamData.objectives?.tower?.kills ?? 0) * 0.5;
    if (enObjectives > myObjectives * 2 && enObjectives >= 8) {
      signals.push({
        text: `Enemy team controlled objectives`,
        detail: `Towers ${myTeamData.objectives?.tower?.kills ?? 0} vs ${enemyTeamData.objectives?.tower?.kills ?? 0}, dragons ${myTeamData.objectives?.dragon?.kills ?? 0} vs ${enemyTeamData.objectives?.dragon?.kills ?? 0}, barons ${myTeamData.objectives?.baron?.kills ?? 0} vs ${enemyTeamData.objectives?.baron?.kills ?? 0}.`,
        tone: 'mixed',
      });
    }
  }

  return signals.slice(0, 5);
}

function humanRole(r: string): string {
  const m: Record<string, string> = {
    top: 'Top',
    jungle: 'Jungle',
    middle: 'Mid',
    bottom: 'Bot',
    utility: 'Support',
  };
  return m[r.toLowerCase()] ?? r;
}

export function MatchAnalysis({ match, me }: Props) {
  const signals = gatherSignals(match, me);

  // No signals = nothing useful to surface. Skip the panel entirely.
  if (signals.length === 0) return null;

  return (
    <div className="bg-panel border border-line rounded-md p-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Match analysis
        </h4>
        <span className="text-[10px] text-gray-600">
          Objective signals · not judgements
        </span>
      </div>
      <div className="space-y-2">
        {signals.map((s, i) => (
          <SignalRow key={i} signal={s} />
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-3 pt-2 border-t border-line">
        These are statistical patterns from the match data. They don't imply
        intent — high deaths can mean a tough lane, a dive comp, or just bad
        luck. We don't judge teammates for you.
      </p>
    </div>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const toneClass =
    signal.tone === 'bad'
      ? 'border-loss/30 bg-loss/5'
      : signal.tone === 'mixed'
        ? 'border-amber-400/30 bg-amber-400/5'
        : 'border-line bg-panel2/30';
  return (
    <div className={`rounded-md border ${toneClass} p-2`}>
      <p className="text-xs text-gray-200 font-semibold">{signal.text}</p>
      {signal.detail && (
        <p className="text-[11px] text-gray-500 mt-0.5">{signal.detail}</p>
      )}
    </div>
  );
}
