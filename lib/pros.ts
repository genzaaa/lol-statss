// Famous pro players — hand-curated.
// Keys are Riot IDs as they appear in-client. Tag = short region label.
// If a pro changes accounts frequently, we pick a stable main account.

import type { Platform } from './regions';

export interface ProPlayer {
  region: Platform;
  gameName: string;
  tagLine: string;
  /** Display name (usually same as gameName but sometimes cleaner) */
  label: string;
  /** Team or role — shown underneath the name */
  subtitle: string;
}

// Keep this list small (≈ 20) so the home page stays snappy and we don't
// hammer the Riot API resolving ranks for dozens of pros on every visit.
export const PRO_PLAYERS: ProPlayer[] = [
  // LCK
  { region: 'kr',   gameName: 'Hide on bush',      tagLine: 'KR1',  label: 'Faker',  subtitle: 'T1 · Mid' },
  { region: 'kr',   gameName: 'T1 Gumayusi',       tagLine: 'KR1',  label: 'Gumayusi', subtitle: 'T1 · ADC' },
  { region: 'kr',   gameName: 'T1 Keria',          tagLine: 'KR1',  label: 'Keria',  subtitle: 'T1 · Support' },
  { region: 'kr',   gameName: 'Hle Zeus',          tagLine: 'KR1',  label: 'Zeus',   subtitle: 'HLE · Top' },
  { region: 'kr',   gameName: 'GEN Canyon',        tagLine: 'KR1',  label: 'Canyon', subtitle: 'GEN · Jungle' },
  { region: 'kr',   gameName: 'GEN Chovy',         tagLine: 'KR1',  label: 'Chovy',  subtitle: 'GEN · Mid' },
  { region: 'kr',   gameName: 'HLE Viper',         tagLine: 'KR1',  label: 'Viper',  subtitle: 'HLE · ADC' },
  { region: 'kr',   gameName: 'Peyz',              tagLine: 'KR1',  label: 'Peyz',   subtitle: 'GEN · ADC' },

  // LEC
  { region: 'euw1', gameName: 'Caps',              tagLine: 'EUW',  label: 'Caps',     subtitle: 'G2 · Mid' },
  { region: 'euw1', gameName: 'Rekkles',           tagLine: 'EUW',  label: 'Rekkles',  subtitle: 'FNC · ADC' },
  { region: 'euw1', gameName: 'Hans Sama',         tagLine: 'EUW',  label: 'Hans Sama', subtitle: 'G2 · ADC' },
  { region: 'euw1', gameName: 'Jankos',            tagLine: 'EUW',  label: 'Jankos',   subtitle: 'Streamer · Jungle' },
  { region: 'euw1', gameName: 'BrokenBlade',       tagLine: 'EUW',  label: 'BrokenBlade', subtitle: 'G2 · Top' },

  // LCS / NA
  { region: 'na1',  gameName: 'Doublelift',        tagLine: 'NA1',  label: 'Doublelift',  subtitle: 'Streamer · ADC' },
  { region: 'na1',  gameName: 'Bjergsen',          tagLine: 'NA1',  label: 'Bjergsen',    subtitle: 'TSM Legend · Mid' },
  { region: 'na1',  gameName: 'Sneaky',            tagLine: 'NA1',  label: 'Sneaky',      subtitle: 'Streamer · ADC' },

  // Streamers / notable
  { region: 'na1',  gameName: 'Tyler1',            tagLine: 'NA1',  label: 'Tyler1',      subtitle: 'Streamer' },
  { region: 'euw1', gameName: 'Agurin',            tagLine: 'EUW',  label: 'Agurin',      subtitle: 'Solo queue demon' },
  { region: 'kr',   gameName: '피닉스',             tagLine: 'KR1',  label: 'Faker (alt)', subtitle: 'Challenger KR' },
];
