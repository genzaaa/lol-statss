// Client-safe constants — no process.env access here, so this file can be
// safely imported by client components without leaking server secrets.

export const PLATFORM_HOSTS = {
  na1: 'na1.api.riotgames.com',
  euw1: 'euw1.api.riotgames.com',
  eun1: 'eun1.api.riotgames.com',
  kr: 'kr.api.riotgames.com',
  br1: 'br1.api.riotgames.com',
  la1: 'la1.api.riotgames.com',
  la2: 'la2.api.riotgames.com',
  jp1: 'jp1.api.riotgames.com',
  oc1: 'oc1.api.riotgames.com',
  tr1: 'tr1.api.riotgames.com',
  ru: 'ru.api.riotgames.com',
} as const;

export const REGIONAL_HOSTS = {
  americas: 'americas.api.riotgames.com',
  europe: 'europe.api.riotgames.com',
  asia: 'asia.api.riotgames.com',
  sea: 'sea.api.riotgames.com',
} as const;

export type Platform = keyof typeof PLATFORM_HOSTS;

export function regionalFor(platform: Platform): keyof typeof REGIONAL_HOSTS {
  if (['na1', 'br1', 'la1', 'la2'].includes(platform)) return 'americas';
  if (['euw1', 'eun1', 'tr1', 'ru'].includes(platform)) return 'europe';
  if (['kr', 'jp1'].includes(platform)) return 'asia';
  return 'sea';
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  na1: 'NA',
  euw1: 'EUW',
  eun1: 'EUNE',
  kr: 'KR',
  br1: 'BR',
  la1: 'LAN',
  la2: 'LAS',
  jp1: 'JP',
  oc1: 'OCE',
  tr1: 'TR',
  ru: 'RU',
};
