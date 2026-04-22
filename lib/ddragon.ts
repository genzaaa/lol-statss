// Data Dragon is Riot's free CDN for static game assets.
// No API key needed, so this can run client-side too.

const DDRAGON = 'https://ddragon.leagueoflegends.com';
const CDRAGON = 'https://raw.communitydragon.org/latest';

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

// Summoner spells — map ID → Data Dragon key.
// Keeping the old SPELL_KEYS export for backward compatibility but using
// the official Data Dragon icons which are more reliable.
const SPELL_KEY_BY_ID: Record<number, string> = {
  1: 'SummonerBoost',      // Cleanse
  3: 'SummonerExhaust',
  4: 'SummonerFlash',
  6: 'SummonerHaste',      // Ghost
  7: 'SummonerHeal',
  11: 'SummonerSmite',
  12: 'SummonerTeleport',
  13: 'SummonerMana',      // Clarity
  14: 'SummonerDot',       // Ignite
  21: 'SummonerBarrier',
  30: 'SummonerPoroRecall',
  31: 'SummonerPoroThrow',
  32: 'SummonerSnowball',  // ARAM Mark
  39: 'SummonerSnowURFSnowball_Mark',
  54: 'Summoner_UltBookPlaceholder',
  55: 'Summoner_UltBookSmitePlaceholder',
};

export function summonerSpellIconUrl(spellId: number): string {
  const key = SPELL_KEY_BY_ID[spellId];
  if (!key) return '';
  // Data Dragon stores spell images under img/spell/<Key>.png
  // We use a fixed recent version path via CommunityDragon which stays updated.
  return `${CDRAGON}/plugins/rcp-be-lol-game-data/global/default/data/spells/icons2d/${key.toLowerCase()}.png`;
}

// Legacy alias kept so any existing imports still work
export const SPELL_KEYS = SPELL_KEY_BY_ID;

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
  100: 'ARAM (Butcher\'s Bridge)',
  400: 'Normal Draft',
  420: 'Ranked Solo',
  430: 'Normal Blind',
  440: 'Ranked Flex',
  450: 'ARAM',
  480: 'Swiftplay',
  490: 'Quickplay',
  700: 'Clash',
  720: 'ARAM Clash',
  830: 'Co-op vs AI Intro',
  840: 'Co-op vs AI Beginner',
  850: 'Co-op vs AI Intermediate',
  870: 'Co-op vs AI Intro',
  880: 'Co-op vs AI Beginner',
  890: 'Co-op vs AI Intermediate',
  900: 'URF',
  1020: 'One for All',
  1300: 'Nexus Blitz',
  1400: 'Ultimate Spellbook',
  1700: 'Arena',
  1710: 'Arena',
  1900: 'URF',
  2400: 'ARAM: Mayhem',
};

export function queueName(queueId: number): string {
  return QUEUE_NAMES[queueId] ?? `Queue ${queueId}`;
}

// Exposed set of queues used for filter dropdowns in the UI.
// Each option may map to multiple queue IDs — e.g. "ARAM" combines the
// regular Howling Abyss queue (450), ARAM: Mayhem (2400), Butcher's Bridge
// (100), and ARAM Clash (720) so they all appear under one filter.
export interface QueueFilterOption {
  /** Stable string used in URL query params */
  value: string;
  /** Human-readable label */
  label: string;
  /** Queue IDs covered by this option. Undefined = "all queues" / no filter. */
  queueIds?: number[];
}

export const QUEUE_FILTER_OPTIONS: QueueFilterOption[] = [
  { value: 'all',       label: 'All queues' },
  { value: 'ranked-solo', label: 'Ranked Solo',  queueIds: [420] },
  { value: 'ranked-flex', label: 'Ranked Flex',  queueIds: [440] },
  { value: 'normal',    label: 'Normal',         queueIds: [400, 430, 480, 490] },
  { value: 'aram',      label: 'ARAM',           queueIds: [450, 2400, 100, 720] },
  { value: 'arena',     label: 'Arena',          queueIds: [1700, 1710] },
];

// Lookup helper for the API route + components
export function queueIdsForFilter(value: string): number[] | undefined {
  const opt = QUEUE_FILTER_OPTIONS.find((o) => o.value === value);
  return opt?.queueIds;
}

// ========================= Runes (Community Dragon) =========================
// Community Dragon exposes rune metadata at a stable URL; we resolve rune IDs
// (which match Data Dragon perk IDs) to icon paths.

export interface RuneStyle {
  id: number;
  name: string;
  icon: string;
  slots: Array<{ runes: Array<{ id: number; name: string; icon: string }> }>;
}

let runesPromise: Promise<RuneStyle[]> | null = null;

export async function getRuneStyles(): Promise<RuneStyle[]> {
  if (!runesPromise) {
    runesPromise = (async () => {
      try {
        const version = await getLatestVersion();
        const res = await fetch(
          `${DDRAGON}/cdn/${version}/data/en_US/runesReforged.json`,
          { next: { revalidate: 86400 } }
        );
        const data: RuneStyle[] = await res.json();
        return data;
      } catch {
        return [];
      }
    })();
  }
  return runesPromise;
}

// Resolve rune/style icon from ID. Returns empty string if not found.
export async function runeIconUrl(runeOrStyleId: number): Promise<string> {
  if (!runeOrStyleId) return '';
  const styles = await getRuneStyles();
  for (const style of styles) {
    if (style.id === runeOrStyleId) {
      return `${DDRAGON}/cdn/img/${style.icon}`;
    }
    for (const slot of style.slots) {
      for (const rune of slot.runes) {
        if (rune.id === runeOrStyleId) {
          return `${DDRAGON}/cdn/img/${rune.icon}`;
        }
      }
    }
  }
  return '';
}

// Find rune metadata by ID
export async function findRune(
  runeId: number
): Promise<{ id: number; name: string; icon: string } | null> {
  if (!runeId) return null;
  const styles = await getRuneStyles();
  for (const style of styles) {
    if (style.id === runeId) return { id: style.id, name: style.name, icon: style.icon };
    for (const slot of style.slots) {
      for (const rune of slot.runes) {
        if (rune.id === runeId) return rune;
      }
    }
  }
  return null;
}

// ========================= Role helpers =========================
export const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'Bot',
  UTILITY: 'Support',
  SUPPORT: 'Support',
  '': '',
};

export function roleLabel(position?: string): string {
  if (!position) return '';
  return ROLE_LABELS[position.toUpperCase()] ?? position;
}
