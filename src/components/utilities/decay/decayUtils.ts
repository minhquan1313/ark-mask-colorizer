import { ARK_MAPS, DEFAULT_ARK_MAP, getArkMap } from '../../../data/arkMaps';
import { DEFAULT_STRUCTURE_TYPE, STRUCTURE_TYPES, getStructureType } from '../../../data/structureTypes';
import { i18n } from '../../../i18n';
import type { DecayServer, DecayServerView, SortField } from './decayTypes';

export const DAY_SECONDS = 24 * 60 * 60;
export const CREATURE_DEFAULT_DECAY_SECONDS = 7 * DAY_SECONDS;
export const SORT_FIELDS: SortField[] = ['server', 'map', 'structure', 'decay'];

export function generateServerId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `decay-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function normalizeText(value: unknown): string {
  const str = String(value ?? '');
  try {
    return str
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  } catch {
    return str.toLowerCase();
  }
}

export function formatTimeRemaining(
  secondsRemaining: number,
  translate: (key: string, fallback: string, values?: Record<string, unknown>) => string,
): { label: string; status: 'active' | 'expired' } {
  const suffix = translate ? translate('utilities.decay.time.leftSuffix', 'left') : 'left';
  const expiredLabel = translate ? translate('utilities.decay.time.expired', 'Expired') : 'Expired';
  if (secondsRemaining <= 0) {
    return { label: expiredLabel, status: 'expired' };
  }
  const days = Math.floor(secondsRemaining / DAY_SECONDS);
  const hours = Math.floor((secondsRemaining % DAY_SECONDS) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = Math.floor(secondsRemaining % 60);

  if (days >= 1) {
    return { label: `${days}d ${hours}h ${suffix}`, status: 'active' };
  }

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (hours === 0 && minutes === 0) parts.push(`${seconds}s`);
  const label = parts.length ? `${parts.join(' ')} ${suffix}` : `${minutes}m ${suffix}`;
  return { label, status: 'active' };
}

export function formatDecayDate(decayTimestamp: number | null | undefined, locale?: string): string {
  if (!decayTimestamp) return 'Unknown';
  try {
    const resolvedLocale = locale ?? i18n?.language ?? (typeof navigator !== 'undefined' ? navigator.language : undefined);
    return new Intl.DateTimeFormat(resolvedLocale, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(decayTimestamp));
  } catch {
    const fallbackLocale = locale ?? i18n?.language ?? (typeof navigator !== 'undefined' ? navigator.language : undefined);
    return new Date(decayTimestamp).toLocaleString(fallbackLocale);
  }
}

export function normalizeServer(entry?: Partial<DecayServer>): DecayServer {
  if (!entry) {
    const timestamp = Date.now();
    return {
      id: generateServerId(),
      mapId: DEFAULT_ARK_MAP.id,
      serverNumber: 0,
      structureId: DEFAULT_STRUCTURE_TYPE.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      note: '',
      creatureEnabled: false,
      creatureDecaySeconds: CREATURE_DEFAULT_DECAY_SECONDS,
      creatureUpdatedAt: null,
    };
  }

  const id = entry.id ? String(entry.id) : generateServerId();
  const createdAt = Number(entry.createdAt ?? Date.now());
  const updatedAt = Number(entry.updatedAt ?? createdAt);
  const creatureEnabled = Boolean(entry.creatureEnabled ?? entry.hasCreatures);
  const creatureDecayRaw = Number(entry.creatureDecaySeconds);
  const creatureDecaySeconds = Number.isFinite(creatureDecayRaw) && creatureDecayRaw > 0 ? creatureDecayRaw : CREATURE_DEFAULT_DECAY_SECONDS;

  return {
    id,
    mapId: entry.mapId ?? DEFAULT_ARK_MAP.id,
    serverNumber: Number.isFinite(Number(entry.serverNumber)) ? Number(entry.serverNumber) : 0,
    structureId: entry.structureId ?? DEFAULT_STRUCTURE_TYPE.id,
    createdAt,
    updatedAt,
    note: typeof entry.note === 'string' ? entry.note : '',
    creatureEnabled,
    creatureDecaySeconds,
    creatureUpdatedAt: creatureEnabled ? Number(entry.creatureUpdatedAt ?? updatedAt) : null,
  };
}

export function normalizeServerList(input: unknown): DecayServer[] {
  if (!Array.isArray(input)) return [];
  return input.map((entry) => normalizeServer(entry as Partial<DecayServer>));
}

export function buildServerView(
  server: DecayServer,
  translate: (key: string, fallback: string, values?: Record<string, unknown>) => string,
): DecayServerView {
  const map = getArkMap(server.mapId);
  const structure = getStructureType(server.structureId);
  const updatedAt = server.updatedAt ?? server.createdAt ?? Date.now();
  const structureDecayAt = updatedAt + structure.decaySeconds * 1000;
  const structureSecondsRemaining = Math.max(0, Math.round((structureDecayAt - Date.now()) / 1000));
  const structureTimeInfo = formatTimeRemaining(structureSecondsRemaining, translate);

  let creatureDecayAt: number | null = null;
  let creatureSecondsRemaining: number | null = null;
  let creatureTimeInfo: { label: string; status: 'active' | 'expired' } | null = null;

  if (server.creatureEnabled) {
    const creatureBase = server.creatureUpdatedAt ?? updatedAt;
    creatureDecayAt = creatureBase + server.creatureDecaySeconds * 1000;
    creatureSecondsRemaining = Math.max(0, Math.round((creatureDecayAt - Date.now()) / 1000));
    creatureTimeInfo = formatTimeRemaining(creatureSecondsRemaining, translate);
  }

  let nextDecayType: 'structure' | 'creature' = 'structure';
  let decayAt = structureDecayAt;
  let secondsRemaining = structureSecondsRemaining;
  let timeInfo = structureTimeInfo;

  if (
    creatureDecayAt != null &&
    creatureSecondsRemaining != null &&
    (creatureDecayAt < decayAt || (creatureDecayAt === decayAt && creatureSecondsRemaining < secondsRemaining))
  ) {
    nextDecayType = 'creature';
    decayAt = creatureDecayAt;
    secondsRemaining = creatureSecondsRemaining;
    timeInfo = creatureTimeInfo ?? structureTimeInfo;
  }

  return {
    ...server,
    map,
    structure,
    decayAt,
    secondsRemaining,
    timeInfo,
    structureDecayAt,
    structureSecondsRemaining,
    structureTimeInfo,
    creatureDecayAt,
    creatureSecondsRemaining,
    creatureTimeInfo,
    nextDecayType,
  };
}

export function itemStatusToColor(status: 'active' | 'expired'): string {
  return status === 'expired' ? 'volcano' : 'geekblue';
}

export { ARK_MAPS, STRUCTURE_TYPES, getArkMap, getStructureType, DEFAULT_ARK_MAP, DEFAULT_STRUCTURE_TYPE };
