export interface IArkStructure {
  id: string;
  name: string;
  decaySeconds: number;
}

const DAY = 24 * 60 * 60;

export const STRUCTURE_TYPES: IArkStructure[] = [
  {
    id: 'thatch',
    name: 'Thatch',
    decaySeconds: 4 * DAY,
  },
  {
    id: 'wood',
    name: 'Wood',
    decaySeconds: 8 * DAY,
  },
  {
    id: 'adobe',
    name: 'Adobe',
    decaySeconds: 8 * DAY,
  },
  {
    id: 'stone',
    name: 'Stone',
    decaySeconds: 12 * DAY,
  },
  {
    id: 'metal',
    name: 'Metal',
    decaySeconds: 16 * DAY,
  },
  {
    id: 'tek',
    name: 'Tek',
    decaySeconds: 20 * DAY,
  },
];

export const DEFAULT_STRUCTURE_TYPE: IArkStructure = STRUCTURE_TYPES[0];

export function getStructureType(structureId: string | null | undefined): IArkStructure {
  if (!structureId) {
    return DEFAULT_STRUCTURE_TYPE;
  }
  return STRUCTURE_TYPES.find((item) => item.id === structureId) ?? DEFAULT_STRUCTURE_TYPE;
}
