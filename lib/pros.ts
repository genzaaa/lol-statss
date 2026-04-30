// Pro player data — scraped from lolpros.gg and kept in the repo.
// Each account explicitly records its region because a Riot ID tag alone
// (e.g. "#1323" or "#EUW") isn't always enough to route API calls correctly.
//
// Source: https://lolpros.gg/multi/<team-slug>
// Last updated: April 2026
// Coverage: LCK (T1, Gen.G, HLE, KT, DK), LEC (G2, Fnatic, Karmine Corp,
//           Los Ratones/Witchcraft, Team Heretics), LCS (TL, C9, FlyQuest),
//           LPL (Bilibili Gaming).
//
// Caveat: this is a best-effort snapshot. Pros rotate accounts often, so
// some of these accounts may be retired by the time you read this. For the
// freshest data always click through to the linked profile on lolpros.gg.

import type { Platform } from './regions';

export interface ProAccount {
  gameName: string;
  tagLine: string;
  region: Platform;
}

export interface Pro {
  slug: string;
  name: string;
  country: string;
  team: string;
  role: 'Top' | 'Jungle' | 'Mid' | 'Bot' | 'Support' | 'Coach';
  primaryRegion: Platform;
  accounts: ProAccount[];
  /** Twitch login (lowercase, the slug from twitch.tv/<login>). Optional —
   * only set for pros who actually stream on Twitch with reasonable
   * frequency. When set and the channel is live, we can embed the
   * stream player directly instead of just offering the spectate
   * download. */
  twitchUsername?: string;
}

export const PROS: Pro[] = [
  // ================================ T1 (LCK) ================================
  {
    slug: 'faker',
    name: 'Faker',
    country: 'South Korea',
    team: 'T1',
    role: 'Mid',
    primaryRegion: 'kr',
    accounts: [
      { gameName: 'Hide on bush',      tagLine: 'KR1',   region: 'kr' },
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
    primaryRegion: 'kr',
    accounts: [
      { gameName: 'Keria',          tagLine: '4111',  region: 'kr' },
      { gameName: 'The Kid Keria',  tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Ai Aqua Ruby',   tagLine: '66298', region: 'euw1' },
      { gameName: 'triplestar',     tagLine: 'star',  region: 'euw1' },
    ],
  },

  // ================================ Gen.G (LCK) ================================
  {
    slug: 'kiin',
    name: 'Kiin',
    country: 'South Korea',
    team: 'Gen.G',
    role: 'Top',
    primaryRegion: 'kr',
    accounts: [
      { gameName: 'kiin', tagLine: 'KR1', region: 'kr' },{ gameName: 'asdfzxcv', tagLine: '3347', region: 'kr' }],
  },
  {
    slug: 'canyon',
    name: 'Canyon',
    country: 'South Korea',
    team: 'Gen.G',
    role: 'Jungle',
    primaryRegion: 'kr',
    accounts: [
      { gameName: 'Gen G Canyon', tagLine: '캐니언', region: 'kr' },
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
    primaryRegion: 'kr',
    accounts: [
      { gameName: '허거덩',              tagLine: '0303',  region: 'kr' },
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

  // ================================ Hanwha Life Esports (LCK) ================================
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
    primaryRegion: 'kr',
    accounts: [
      { gameName: 'T1 Gumayusi', tagLine: 'KR1', region: 'kr' },
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

  // ================================ KT Rolster (LCK) ================================
  {
    slug: 'cuzz',
    name: 'Cuzz',
    country: 'South Korea',
    team: 'KT Rolster',
    role: 'Jungle',
    primaryRegion: 'kr',
    accounts: [{ gameName: 'yort', tagLine: '05765', region: 'kr' }],
  },
  {
    slug: 'bdd',
    name: 'Bdd',
    country: 'South Korea',
    team: 'KT Rolster',
    role: 'Mid',
    primaryRegion: 'euw1',
    accounts: [{ gameName: 'byeeeeeee', tagLine: 'EUW', region: 'euw1' }],
  },
  {
    slug: 'ghost',
    name: 'Ghost',
    country: 'South Korea',
    team: 'KT Rolster',
    role: 'Support',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'KIA The new K3',  tagLine: 'EUW', region: 'euw1' },
      { gameName: 'CocaCola Monster', tagLine: 'EUW', region: 'euw1' },
    ],
  },

  // ================================ Dplus KIA (LCK) ================================
  {
    slug: 'lucid',
    name: 'Lucid',
    country: 'South Korea',
    team: 'Dplus KIA',
    role: 'Jungle',
    primaryRegion: 'kr',
    accounts: [{ gameName: 'nicemeetyou', tagLine: '1234', region: 'kr' }],
  },
  {
    slug: 'showmaker',
    name: 'ShowMaker',
    country: 'South Korea',
    team: 'Dplus KIA',
    role: 'Mid',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'nAbB2nYlLKMy2cJA',  tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'good bye iceland',   tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'dntmdgkrhtlvdjdy',   tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'Syndra',             tagLine: '0722', region: 'euw1' },
    ],
  },

  // ================================ G2 Esports (LEC) ================================
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
    twitchUsername: 'caps',
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

  // ================================ Fnatic (LEC) ================================
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
    twitchUsername: 'razork',
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
    twitchUsername: 'vladi',
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
    twitchUsername: 'upsetlol',
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

  // ================================ Karmine Corp (LEC) ================================
  {
    slug: 'canna',
    name: 'Canna',
    country: 'South Korea',
    team: 'Karmine Corp',
    role: 'Top',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'Katze',        tagLine: 'myao', region: 'euw1' },
      { gameName: 'Savage love',  tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'EJRKLJ0',      tagLine: '0000', region: 'euw1' },
      { gameName: 'K C',          tagLine: 'kcwin', region: 'euw1' },
    ],
  },
  {
    slug: 'yike',
    name: 'Yike',
    country: 'Sweden',
    team: 'Karmine Corp',
    role: 'Jungle',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'KC Yiken', tagLine: '1111', region: 'euw1' },
      { gameName: 'Yikos',    tagLine: 'EUW',  region: 'euw1' },
    ],
    twitchUsername: 'yike_lol',
  },
  {
    slug: 'kyeahoo',
    name: 'kyeahoo',
    country: 'South Korea',
    team: 'Karmine Corp',
    role: 'Mid',
    primaryRegion: 'euw1',
    accounts: [{ gameName: 'Left Hand', tagLine: 'korea', region: 'euw1' }],
  },
  {
    slug: 'caliste',
    name: 'Caliste',
    country: 'France',
    team: 'Karmine Corp',
    role: 'Bot',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'KC NEXT ADKING',   tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Exakick N1 Fan',   tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'BETTER EXAKICK',   tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'I NEED SOLOQ',     tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'MOMO KOZUKI',      tagLine: 'soloq', region: 'euw1' },
    ],
  },
  {
    slug: 'busio',
    name: 'Busio',
    country: 'United States',
    team: 'Karmine Corp',
    role: 'Support',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'basil',     tagLine: 'fan', region: 'euw1' },
      { gameName: 'Busio JNG', tagLine: 'NA1', region: 'na1' },
    ],
  },

  // ================================ Team Heretics (LEC) ================================
  {
    slug: 'tracyn',
    name: 'Tracyn',
    country: 'Spain',
    team: 'Team Heretics',
    role: 'Top',
    primaryRegion: 'euw1',
    accounts: [{ gameName: 'Tracyn', tagLine: 'EUW', region: 'euw1' }],
  },
  {
    slug: 'sheo',
    name: 'Sheo',
    country: 'Spain',
    team: 'Team Heretics',
    role: 'Jungle',
    primaryRegion: 'euw1',
    accounts: [{ gameName: 'Sheo', tagLine: 'EUW', region: 'euw1' }],
  },
  {
    slug: 'serin',
    name: 'Serin',
    country: 'South Korea',
    team: 'Team Heretics',
    role: 'Mid',
    primaryRegion: 'euw1',
    accounts: [{ gameName: 'Serin', tagLine: 'EUW', region: 'euw1' }],
  },

  // ================================ Witchcraft / Los Ratones (streamer team) ================================
  {
    slug: 'bwipo',
    name: 'Bwipo',
    country: 'Belgium',
    team: 'Witchcraft',
    role: 'Top',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'I will trade',      tagLine: 'NA1',   region: 'na1' },
      { gameName: 'for her sake',      tagLine: '78797', region: 'euw1' },
      { gameName: 'Chongus',           tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'everything to me',  tagLine: 'EUW',   region: 'euw1' },
    ],
    twitchUsername: 'bwipo',
  },
  {
    slug: 'velja',
    name: 'Velja',
    country: 'Serbia',
    team: 'Witchcraft',
    role: 'Jungle',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'Thorfinn',       tagLine: '22032', region: 'euw1' },
      { gameName: 'VELJA DEL REY',  tagLine: '2203',  region: 'euw1' },
      { gameName: 'LR Velja',       tagLine: '2203',  region: 'euw1' },
      { gameName: 'Kaiser Klein',   tagLine: '2000',  region: 'euw1' },
      { gameName: 'Frame Mogged',   tagLine: '2203',  region: 'euw1' },
      { gameName: 'Thymanna',       tagLine: 'EUW',   region: 'euw1' },
    ],
    twitchUsername: 'velja',
  },
  {
    slug: 'nemesis',
    name: 'Nemesis',
    country: 'Slovenia',
    team: 'Witchcraft',
    role: 'Mid',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'LR Nemesis',         tagLine: 'LRAT', region: 'euw1' },
      { gameName: 'the inescapable',    tagLine: 'RAT',  region: 'euw1' },
      { gameName: 'Dzukill',            tagLine: 'KISS', region: 'euw1' },
      { gameName: 'Alexander Duggan',   tagLine: 'Red',  region: 'euw1' },
      { gameName: 'tehgeokiller',       tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'Mr Ascendant',       tagLine: 'EUW',  region: 'euw1' },
    ],
    twitchUsername: 'nemesis_lol',
  },
  {
    slug: 'crownie',
    name: 'Crownie',
    country: 'Slovenia',
    team: 'Witchcraft',
    role: 'Bot',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'getogetogeto', tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'LR Crownie',    tagLine: 'LRAT', region: 'euw1' },
      { gameName: 'Yveltal',       tagLine: 'ADC',  region: 'euw1' },
    ],
  },
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
    twitchUsername: 'rekkles',
  },
  {
    slug: 'thebausffs',
    name: 'Thebausffs',
    country: 'Sweden',
    team: 'Los Ratones',
    role: 'Top',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'Streaming Badboy', tagLine: 'INT',   region: 'euw1' },
      { gameName: 'Dangerous Dork',   tagLine: 'Lick',  region: 'euw1' },
      { gameName: 'Thebausffs',       tagLine: 'COOL',  region: 'euw1' },
      { gameName: 'Thebausffs',       tagLine: '3710',  region: 'euw1' },
      { gameName: 'Bosch Drill',      tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Mollusca Slime',   tagLine: 'Yummy', region: 'euw1' },
    ],
    twitchUsername: 'thebausffs',
  },

  // ================================ Team Liquid (LCS) ================================
  {
    slug: 'tl-morgan',
    name: 'Morgan',
    country: 'South Korea',
    team: 'Team Liquid',
    role: 'Top',
    primaryRegion: 'euw1',
    accounts: [{ gameName: 'Star is coming', tagLine: 'EUW', region: 'euw1' }],
  },
  {
    slug: 'quid',
    name: 'Quid',
    country: 'South Korea',
    team: 'Team Liquid',
    role: 'Mid',
    primaryRegion: 'na1',
    accounts: [{ gameName: 'quid not quad', tagLine: '100', region: 'na1' }],
  },
  {
    slug: 'yeon',
    name: 'Yeon',
    country: 'United States',
    team: 'Team Liquid',
    role: 'Bot',
    primaryRegion: 'na1',
    accounts: [{ gameName: 'IHATEYOU', tagLine: 'TL7', region: 'na1' }],
  },
  {
    slug: 'corejj',
    name: 'CoreJJ',
    country: 'South Korea',
    team: 'Team Liquid',
    role: 'Support',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'BOL4',              tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'ChatDisabler94',    tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'TL Honda CoreJJ',   tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'TL Honda CoreJJ',   tagLine: 'EUEU', region: 'euw1' },
    ],
  },

  // ================================ Cloud9 (LCS) ================================
  {
    slug: 'blaber',
    name: 'Blaber',
    country: 'United States',
    team: 'Cloud9',
    role: 'Jungle',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'C9 Blaberfish',     tagLine: 'EUW', region: 'euw1' },
      { gameName: 'ni hui ji zhu wo',  tagLine: 'EUW', region: 'euw1' },
      { gameName: 'C9 Blaberfish2',    tagLine: 'EUW', region: 'euw1' },
      { gameName: 'jgchai2',           tagLine: 'EUW', region: 'euw1' },
    ],
  },
  {
    slug: 'apa',
    name: 'APA',
    country: 'United States',
    team: 'Cloud9',
    role: 'Mid',
    primaryRegion: 'na1',
    accounts: [{ gameName: 'TL El Debutante', tagLine: 'mid', region: 'na1' }],
  },
  {
    slug: 'zven',
    name: 'Zven',
    country: 'Denmark',
    team: 'Cloud9',
    role: 'Bot',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'Zven',       tagLine: 'GOAT',  region: 'euw1' },
      { gameName: 'C9 Zvenn',   tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'C9 ZVEN',    tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'C9 ZVENNN',  tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Zven',       tagLine: 'KEKW1', region: 'euw1' },
      { gameName: 'oi bruvv',   tagLine: 'EUW',   region: 'euw1' },
    ],
    twitchUsername: 'zvenlol',
  },
  {
    slug: 'vulcan',
    name: 'VULCAN',
    country: 'Canada',
    team: 'Cloud9',
    role: 'Support',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'GOOD FINGERS', tagLine: 'NA1', region: 'na1' },
      { gameName: 'C9 VULCANN',    tagLine: 'EUW', region: 'euw1' },
      { gameName: 'pabl0 picass0', tagLine: 'EUW', region: 'euw1' },
      { gameName: 'euw tourist',   tagLine: 'EUW', region: 'euw1' },
    ],
  },

  // ================================ FlyQuest (LCS) ================================
  {
    slug: 'gakgos',
    name: 'Gakgos',
    country: 'Türkiye',
    team: 'FlyQuest',
    role: 'Top',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'G4KG05',     tagLine: '0023', region: 'euw1' },
      { gameName: 'FLY Gakgos', tagLine: '123',  region: 'euw1' },
    ],
  },

  // ================================ Bilibili Gaming (LPL) ================================
  {
    slug: 'bin',
    name: 'Bin',
    country: 'China',
    team: 'Bilibili Gaming',
    role: 'Top',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'BLGBin ge',  tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'rsdfsaasq',  tagLine: '1111', region: 'euw1' },
    ],
  },
  {
    slug: 'knight',
    name: 'knight',
    country: 'China',
    team: 'Bilibili Gaming',
    role: 'Mid',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'ZZXE0BYCNW',    tagLine: 'EUW',  region: 'euw1' },
      { gameName: 'asdfadsasdfads', tagLine: '1234', region: 'euw1' },
    ],
  },
  {
    slug: 'viper-blg',
    name: 'Viper',
    country: 'South Korea',
    team: 'Bilibili Gaming',
    role: 'Bot',
    primaryRegion: 'euw1',
    accounts: [
      { gameName: 'jkr9bcQujpLZPySS', tagLine: 'EUW',   region: 'euw1' },
      { gameName: 'Víþer',             tagLine: '84863', region: 'euw1' },
      { gameName: 'Happy',             tagLine: 'A33',   region: 'euw1' },
    ],
  },
  {
    slug: 'on-blg',
    name: 'ON',
    country: 'China',
    team: 'Bilibili Gaming',
    role: 'Support',
    primaryRegion: 'euw1',
    accounts: [{ gameName: 'hanbaoshutiao', tagLine: 'EUW', region: 'euw1' }],
  },
];

export function primaryHrefFor(pro: Pro): string {
  const acc = pro.accounts[0];
  if (!acc) return '/';
  return `/summoner/${acc.region}/${encodeURIComponent(acc.gameName)}-${encodeURIComponent(acc.tagLine)}`;
}
