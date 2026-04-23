// Pro player data — scraped once from lolpros.gg and kept in the repo.
// Each account explicitly records its region because a Riot ID tag alone
// (e.g. "#1323" or "#EUW") isn't always enough to route API calls correctly.
//
// Source: https://lolpros.gg/multi/<team-slug>
// Last updated: April 2026
// If you want to refresh this data, grab a team's multi page and transcribe
// its accounts — we don't hit lolpros.gg at runtime.

import type { Platform } from './regions';

export interface ProAccount {
  gameName: string;
  tagLine: string;
  region: Platform;
}

export interface Pro {
  /** Stable slug, used as React key and for fuzzy-matching */
  slug: string;
  /** Display name */
  name: string;
  /** e.g. "South Korea", "Germany" */
  country: string;
  /** e.g. "T1", "G2 Esports" */
  team: string;
  /** Lane / position */
  role: 'Top' | 'Jungle' | 'Mid' | 'Bot' | 'Support' | 'Coach';
  /** Primary region for routing searches */
  primaryRegion: Platform;
  /** Every known SoloQ account */
  accounts: ProAccount[];
}

// All tag lines here were taken verbatim from lolpros.gg multi pages.
// When a tag ends in letters (e.g. "#EUW") the region is clear; when it's
// numeric (e.g. "#1323" or "#61151"), lolpros.gg's site attributes it to the
// region where the account lives — usually EUW or KR depending on the player.
export const PROS: Pro[] = [
  // ========================= T1 (LCK) =========================
  {
    slug: 'faker',
    name: 'Faker',
    country: 'South Korea',
    team: 'T1',
    role: 'Mid',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'THmCX8U4yahp39sz', tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'wincg',             tagLine: '84926', region: 'euw1' },
      { gameName: 'silent silence',    tagLine: '08022', region: 'euw1' },
      { gameName: 'Hide on bush',      tagLine: '61151', region: 'euw1' },
    ],
  },
  {
    slug: 'doran',
    name: 'Doran',
    country: 'South Korea',
    team: 'T1',
    role: 'Top',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'h9aM1DQHxKnrilLD', tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'HO1WQYETAN',        tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'HLE TOP',           tagLine: '1234', region: 'euw1' },
    ],
  },
  {
    slug: 'oner',
    name: 'Oner',
    country: 'South Korea',
    team: 'T1',
    role: 'Jungle',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'Thinking PLZ ', tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'T1 Roach',       tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'BONG BONG U',    tagLine: '123',  region: 'euw1' },
    ],
  },
  {
    slug: 'peyz',
    name: 'Peyz',
    country: 'South Korea',
    team: 'T1',
    role: 'Bot',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'ABCDPEYZ',     tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'qwewqrsad2w',  tagLine: '11111', region: 'euw1' },
    ],
  },
  {
    slug: 'keria',
    name: 'Keria',
    country: 'South Korea',
    team: 'T1',
    role: 'Support',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'The Kid Keria',  tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Ai Aqua Ruby',   tagLine: '66298', region: 'euw1' },
      { gameName: 'triplestar',     tagLine: 'star',  region: 'euw1' },
    ],
  },

  // ========================= Gen.G (LCK) =========================
  {
    slug: 'kiin',
    name: 'Kiin',
    country: 'South Korea',
    team: 'Gen.G',
    role: 'Top',
    primaryRegion: 'kr',
    accounts: [{ gameName: 'asdfzxcv', tagLine: '3347', region: 'kr' }],
  },
  {
    slug: 'canyon',
    name: 'Canyon',
    country: 'South Korea',
    team: 'Gen.G',
    role: 'Jungle',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'npAWwznisdpExCDc', tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Eventual victory',  tagLine: '34148', region: 'euw1' },
      { gameName: 'happy gαme',        tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'asfdwrqe',          tagLine: '123',   region: 'euw1' },
    ],
  },
  {
    slug: 'chovy',
    name: 'Chovy',
    country: 'South Korea',
    team: 'Gen.G',
    role: 'Mid',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'Pd8JbseaJwwjQpNH', tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Shrimp Shark',      tagLine: '43083', region: 'euw1' },
      { gameName: 'lIlIlIIllIlllIIl',  tagLine: 'EUW',   region: 'euw1' },
    ],
  },
  {
    slug: 'ruler',
    name: 'Ruler',
    country: 'South Korea',
    team: 'Gen.G',
    role: 'Bot',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'Gen G Ru1er',  tagLine: 'EUW', region: 'euw1' },
      { gameName: 'tkffuwnjwpqkf', tagLine: 'EUW', region: 'euw1' },
    ],
  },

  // ========================= Hanwha Life Esports (LCK) =========================
  {
    slug: 'zeus',
    name: 'Zeus',
    country: 'South Korea',
    team: 'Hanwha Life Esports',
    role: 'Top',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'Pom Michutda', tagLine: 'EUW', region: 'euw1' },
      { gameName: 'Zimmer',       tagLine: 'god', region: 'euw1' },
    ],
  },
  {
    slug: 'kanavi',
    name: 'Kanavi',
    country: 'South Korea',
    team: 'Hanwha Life Esports',
    role: 'Jungle',
    primaryRegion: 'euw1',
    accounts: [{ gameName: 'srcrd', tagLine: 'EUW', region: 'euw1' }],
  },
  {
    slug: 'zeka',
    name: 'Zeka',
    country: 'South Korea',
    team: 'Hanwha Life Esports',
    role: 'Mid',
    primaryRegion: 'kr',
    accounts: [{ gameName: 'Dkdldb', tagLine: '516', region: 'kr' }],
  },
  {
    slug: 'gumayusi',
    name: 'Gumayusi',
    country: 'South Korea',
    team: 'Hanwha Life Esports',
    role: 'Bot',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'Giant Monster', tagLine: '09494', region: 'euw1' },
      { gameName: 'MQLWKENRK',      tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'taco genius',    tagLine: '8848',  region: 'euw1' },
    ],
  },
  {
    slug: 'delight',
    name: 'Delight',
    country: 'South Korea',
    team: 'Hanwha Life Esports',
    role: 'Support',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'GDB CARRY', tagLine: 'EUW', region: 'euw1' },
      { gameName: 'Delight11', tagLine: 'kor', region: 'euw1' },
    ],
  },

  // ========================= G2 Esports (LEC) =========================
  {
    slug: 'brokenblade',
    name: 'BrokenBlade',
    country: 'Germany',
    team: 'G2 Esports',
    role: 'Top',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'G2 BrokenBlade', tagLine: '1918', region: 'euw1' },
      { gameName: 'brokenblade22',  tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'brokenblade12',  tagLine: 'EUW',  region: 'euw1' },
    ],
  },
  {
    slug: 'skewmond',
    name: 'SkewMond',
    country: 'France',
    team: 'G2 Esports',
    role: 'Jungle',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'G2 SkewMond',       tagLine: '3327',  region: 'euw1' },
      { gameName: 'Miyamoto Musashi',  tagLine: '2783',  region: 'euw1' },
      { gameName: 'DontTryMyWind',     tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Samurai Madara',    tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Little Dark Âge',   tagLine: '39427', region: 'euw1' },
    ],
  },
  {
    slug: 'caps',
    name: 'Caps',
    country: 'Denmark',
    team: 'G2 Esports',
    role: 'Mid',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'G2 Caps',            tagLine: '1323', region: 'euw1' },
      { gameName: 'A 99 mid laner',     tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'Speedy McJingles',   tagLine: 'EUW',  region: 'euw1' },
    ],
  },
  {
    slug: 'hans-sama',
    name: 'Hans Sama',
    country: 'France',
    team: 'G2 Esports',
    role: 'Bot',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'G2 Hans Sama',   tagLine: '12838', region: 'euw1' },
      { gameName: '02170216',        tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'RGE Hαns sαmα',   tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Tαng sαn',        tagLine: 'EUW',   region: 'euw1' },
    ],
  },

  // ========================= Fnatic (LEC) =========================
  {
    slug: 'empyros',
    name: 'Empyros',
    country: 'Greece',
    team: 'Fnatic',
    role: 'Top',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'pt4',               tagLine: '000',  region: 'euw1' },
      { gameName: 'platamon prodigy',  tagLine: '0000', region: 'euw1' },
      { gameName: 'CrystaliAgS',       tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'panosad',           tagLine: 'EUW',  region: 'euw1' },
    ],
  },
  {
    slug: 'razork',
    name: 'Razork',
    country: 'Spain',
    team: 'Fnatic',
    role: 'Jungle',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'Razørk Activoo',    tagLine: 'razzz', region: 'euw1' },
      { gameName: 'Cachorro Alpha',    tagLine: 'razzz', region: 'euw1' },
      { gameName: 'Golfilla',          tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'G2 Argøs',          tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'NavikrozaR',        tagLine: 'EUW',   region: 'euw1' },
    ],
  },
  {
    slug: 'vladi',
    name: 'Vladi',
    country: 'Greece',
    team: 'Fnatic',
    role: 'Mid',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'J1HUIV',             tagLine: '000',  region: 'euw1' },
      { gameName: 'DepresedMegaMind',   tagLine: '7503', region: 'euw1' },
      { gameName: 'VIEGOXDXD',          tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'YONEXDXD',           tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'Melissoula',         tagLine: 'EUW',  region: 'euw1' },
    ],
  },
  {
    slug: 'upset',
    name: 'Upset',
    country: 'Germany',
    team: 'Fnatic',
    role: 'Bot',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'afkdoks',          tagLine: '3101',  region: 'euw1' },
      { gameName: 'FNC Upset22',      tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Meruem12',         tagLine: '96603', region: 'euw1' },
      { gameName: 'asdfasdf',         tagLine: '0308',  region: 'euw1' },
      { gameName: 'FNC Upset',        tagLine: '0308',  region: 'euw1' },
    ],
  },
  {
    slug: 'lospa',
    name: 'Lospa',
    country: 'South Korea',
    team: 'Fnatic',
    role: 'Support',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'i want to win',  tagLine: '이기고싶다', region: 'euw1' },
      { gameName: 'FUT Lospa',      tagLine: 'FUT',      region: 'euw1' },
    ],
  },

  // ========================= Notable legend (streamer/retired) =========================
  {
    slug: 'rekkles',
    name: 'Rekkles',
    country: 'Sweden',
    team: 'Witchcraft',
    role: 'Support',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'Rekkles', tagLine: 'ADC96', region: 'euw1' },
      { gameName: 'Rekkles', tagLine: '1996',  region: 'euw1' },
      { gameName: 'Rekkles', tagLine: 'SUP',   region: 'euw1' },
    ],
  },
];

// Derive the primary URL path for a pro's first account (used when clicking
// a pro card to jump to their profile on our site).
export function primaryHrefFor(pro: Pro): string {
  const acc = pro.accounts[0];
  if (!acc) return '/';
  return `/summoner/${acc.region}/${encodeURIComponent(acc.gameName)}-${encodeURIComponent(acc.tagLine)}`;
}
