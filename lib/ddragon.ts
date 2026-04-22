// Data Dragon is Riot's free CDN for static game assets.
// No API key needed, so this can run client-side too.

const DDRAGON = 'https://ddragon.leagueoflegends.com';

// We fetch the current game version once and cache it module-wide.
let versionPromise: Promise<string> | null = null;

export async function getLatestVersion(): Promise<string> {
  if (!versionPromise) {
    versionPromise = fetch(`${DDRAGON}/api/versions.json`, {
      next: { revalidate: 3600 },
    })
      .then((r) => r.json())
      .then((arr: string[]) => arr[0])
      .catch(() => '14.13.1'); // fallback
  }
  return versionPromise;
}

export function champIconUrl(version: string, championName: string): string {
  // championName is e.g. "Aatrox" — matches Data Dragon file naming
  return `${DDRAGON}/cdn/${version}/img/champion/${championName}.png`;
}

export function itemIconUrl(version: string, itemId: number): string {
  if (!itemId || itemId === 0) return '';
  return `${DDRAGON}/cdn/${version}/img/item/${itemId}.png`;
}

export function profileIconUrl(version: string, iconId: number): string {
  return `${DDRAGON}/cdn/${version}/img/profileicon/${iconId}.png`;
}

// Summoner spells — map ID → key name
// Using CommunityDragon for simpler ID-based lookup
export function summonerSpellIconUrl(spellId: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/data/spells/icons2d/summoner_${SPELL_KEYS[spellId] ?? 'flash'}.png`;
}

const SPELL_KEYS: Record<number, string> = {
  1: 'boost',      // Cleanse
  3: 'exhaust',
  4: 'flash',
  6: 'haste',      // Ghost
  7: 'heal',
  11: 'smite',
  12: 'teleport',
  13: 'mana',      // Clarity
  14: 'dot',       // Ignite
  21: 'barrier',
  32: 'mark',      // ARAM snowball
  39: 'mark',
};

// Champion ID → name mapping. Fetched once from Data Dragon.
let championMapPromise: Promise<Record<number, string>> | null = null;

export async function getChampionMap(): Promise<Record<number, string>> {
  if (!championMapPromise) {
    championMapPromise = (async () => {
      const version = await getLatestVersion();
      const res = await fetch(`${DDRAGON}/cdn/${version}/data/en_US/champion.json`, {
        next: { revalidate: 86400 },
      });
      const data = await res.json();
      const map: Record<number, string> = {};
      for (const key of Object.keys(data.data)) {
        const c = data.data[key];
        map[parseInt(c.key, 10)] = c.id; // c.id is the name like "Aatrox"
      }
      return map;
    })();
  }
  return championMapPromise;
}

// Queue ID → human name. Partial list of common queues.
export const QUEUE_NAMES: Record<number, string> = {
  400: 'Normal Draft',
  420: 'Ranked Solo',
  430: 'Normal Blind',
  440: 'Ranked Flex',
  450: 'ARAM',
  700: 'Clash',
  830: 'Co-op vs AI Intro',
  840: 'Co-op vs AI Beginner',
  850: 'Co-op vs AI Intermediate',
  900: 'URF',
  1020: 'One for All',
  1300: 'Nexus Blitz',
  1400: 'Ultimate Spellbook',
  1700: 'Arena',
  1900: 'URF',
};

export function queueName(queueId: number): string {
  return QUEUE_NAMES[queueId] ?? `Queue ${queueId}`;
}
