export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function kda(k: number, d: number, a: number): string {
  if (d === 0) return 'Perfect';
  return ((k + a) / d).toFixed(2);
}

export function winrate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

// Tier colors for ranked badges
export const TIER_COLORS: Record<string, string> = {
  IRON: '#51484a',
  BRONZE: '#8c5630',
  SILVER: '#84969b',
  GOLD: '#cd8837',
  PLATINUM: '#4e9996',
  EMERALD: '#2ec27e',
  DIAMOND: '#576bce',
  MASTER: '#9d48e0',
  GRANDMASTER: '#cd4545',
  CHALLENGER: '#f4c874',
  UNRANKED: '#4a5568',
};

export function tierColor(tier?: string): string {
  if (!tier) return TIER_COLORS.UNRANKED;
  return TIER_COLORS[tier.toUpperCase()] ?? TIER_COLORS.UNRANKED;
}

// Tier icons — using Community Dragon CDN
export function tierIconUrl(tier: string): string {
  const t = tier.toLowerCase();
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-regalia/${t}.png`;
}
