// Classic League of Legends champion combos.
//
// These are long-standing, patch-stable pairings — the kind that casters
// and community call out by name ("the Malphite-Yasuo combo"). This is
// NOT meta stats, NOT winrate data, and NOT a replacement for sites like
// u.gg that aggregate match data. These are curated "iconic pairings"
// that have been famous in the game for years.
//
// Each combo lists the champion IDs (Data Dragon naming — "MissFortune"
// not "Miss Fortune") it involves and a short description of what makes
// it work.

export interface ClassicCombo {
  champions: string[]; // Data Dragon champion IDs (keys)
  title: string;
  description: string;
  /** One of: 'engage', 'disengage', 'teamfight', 'pick', 'lane', 'siege' */
  tag: 'engage' | 'teamfight' | 'pick' | 'lane' | 'siege';
}

export const CLASSIC_COMBOS: ClassicCombo[] = [
  {
    champions: ['Malphite', 'Yasuo'],
    title: 'Rock Solid',
    description:
      "Malphite R catches multiple targets in the air; Yasuo follows up with his ultimate on any airborne enemy for a huge teamfight opener.",
    tag: 'engage',
  },
  {
    champions: ['Malphite', 'Yone'],
    title: 'Stone Walker',
    description:
      'Same setup as Malphite-Yasuo — the Unstoppable Force launches the team into the air, Yone lands his ult on the knocked-up crowd.',
    tag: 'engage',
  },
  {
    champions: ['Orianna', 'Yasuo'],
    title: 'Ball Delivery',
    description:
      "Yasuo's tornado knocks up a cluster; Orianna's Shockwave pulls the whole team into the ball at the same point. Also works as Orianna R into Yasuo R.",
    tag: 'teamfight',
  },
  {
    champions: ['Malzahar', 'Yasuo'],
    title: 'Void Wind',
    description:
      "Malzahar's suppression locks a target; Yasuo dashes onto them with free resets from any knockup lingering nearby.",
    tag: 'pick',
  },
  {
    champions: ['Amumu', 'MissFortune'],
    title: 'Sadness Bullets',
    description:
      "Amumu R stuns the whole enemy team; Miss Fortune channels Bullet Time on top of them without interruption. The classic low-elo teamfight-winner.",
    tag: 'teamfight',
  },
  {
    champions: ['Amumu', 'Kennen'],
    title: 'Electric Mummy',
    description:
      "Amumu's Curse of the Sad Mummy sets up Kennen's Slicing Maelstrom for a guaranteed stun chain across the enemy team.",
    tag: 'teamfight',
  },
  {
    champions: ['Leona', 'Jinx'],
    title: 'Shield and Sword',
    description:
      "Leona's E-Q engage leads to her ult locking targets down; Jinx freely dumps rockets onto stunned enemies. Brutal lane pressure.",
    tag: 'lane',
  },
  {
    champions: ['LeeSin', 'Karthus'],
    title: 'The Insec Kick',
    description:
      "Lee Sin's Dragon's Rage kicks a priority target into Karthus's Wall of Pain. Classic coordinated kill setup since season 2.",
    tag: 'pick',
  },
  {
    champions: ['Ashe', 'Malphite'],
    title: 'Arrow and Anvil',
    description:
      "Ashe's Enchanted Crystal Arrow is a global CC setup; Malphite R turns a stunned target into a full team wipe initiation.",
    tag: 'engage',
  },
  {
    champions: ['Ashe', 'Kennen'],
    title: 'Arrow Storm',
    description:
      "Ashe locks a target down across the map; Kennen flashes in with ult for a massive follow-up AoE stun.",
    tag: 'engage',
  },
  {
    champions: ['Bard', 'Trundle'],
    title: 'Temporal Trap',
    description:
      "Bard's stasis zone holds the enemy carry; Trundle's ult shreds their stats. Pick-comp gold when the Q from Trundle slows the escape.",
    tag: 'pick',
  },
  {
    champions: ['Taric', 'Yasuo'],
    title: 'Gemmed Wind',
    description:
      "Taric's ult grants invulnerability through Yasuo's dive — Yasuo can ult and tornado multiple targets while the team is immune to damage.",
    tag: 'teamfight',
  },
  {
    champions: ['Nautilus', 'Yasuo'],
    title: 'Anchor Drop',
    description:
      "Nautilus Q pulls + his R knocks up chained targets; Yasuo ults the lifted primary. A staple engage in bot lane rushing mid.",
    tag: 'engage',
  },
  {
    champions: ['Rakan', 'Xayah'],
    title: "Lovers' Leap",
    description:
      "Literal in-kit synergy — Rakan's W recasts to dash to Xayah and vice versa, they share a recall animation, and their ults chain naturally.",
    tag: 'lane',
  },
  {
    champions: ['Alistar', 'Tristana'],
    title: 'Headbutt Rocket',
    description:
      "Alistar Q-W knocks a target into tower range; Trist ult sends them back under your bot lane. Classic bot lane 2v2 kill pattern.",
    tag: 'lane',
  },
  {
    champions: ['Thresh', 'Vayne'],
    title: 'Tumble Hook',
    description:
      "Thresh Q locks a target; Vayne condemns them into a wall for a brutal stun chain. Lane bully pairing since Vayne's release.",
    tag: 'lane',
  },
  {
    champions: ['Sion', 'Sivir'],
    title: 'Steamroller',
    description:
      "Sion's Unstoppable Onslaught lets him cross the map; Sivir's On The Hunt gives the whole team speed to pile on top.",
    tag: 'siege',
  },
  {
    champions: ['Rammus', 'Galio'],
    title: 'Curled Defender',
    description:
      "Rammus taunts, Galio Ws to the fight, Galio R knocks everyone up — the classic 'if both your lanes get CC'd you just lose' combo.",
    tag: 'engage',
  },
  {
    champions: ['Wukong', 'Yasuo'],
    title: 'Monkey Wind',
    description:
      "Wukong's Cyclone knocks up every enemy around him; Yasuo follows with his ultimate for a clean teamfight reset.",
    tag: 'teamfight',
  },
  {
    champions: ['Galio', 'Kennen'],
    title: 'Storm Colossus',
    description:
      "Both ultimates are AoE teamfight winners. Kennen stuns, Galio knocks up survivors. Anyone in the middle takes so much damage they die twice.",
    tag: 'teamfight',
  },
  {
    champions: ['Pantheon', 'Shen'],
    title: 'Global Ganks',
    description:
      "Shen's R and Pantheon's R both deploy globally. Combine them and any team fight on the map suddenly becomes 7v5 from nowhere.",
    tag: 'engage',
  },
  {
    champions: ['Braum', 'Caitlyn'],
    title: 'Frozen Trap',
    description:
      "Caitlyn's W traps root; Braum's passive procs after 4 auto attacks. Together they shut down any aggression on them in lane.",
    tag: 'lane',
  },
  {
    champions: ['Nocturne', 'Kennen'],
    title: 'Shadow Storm',
    description:
      "Nocturne's Paranoia blinds vision and locks everyone to follow him into the fight; Kennen flashes + ults for the teamfight-ending AoE.",
    tag: 'engage',
  },
];

export function combosInvolving(championId: string): ClassicCombo[] {
  return CLASSIC_COMBOS.filter((c) => c.champions.includes(championId));
}
