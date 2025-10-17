export interface DecayServer {
  id: string;
  mapId: string;
  serverNumber: number;
  structureId: string;
  createdAt: number;
  updatedAt: number;
  note: string;
  creatureEnabled: boolean;
  creatureDecaySeconds: number;
  creatureUpdatedAt: number | null;
  hasCreatures?: boolean;
}

export interface DecayServerView extends DecayServer {
  map: { id: string; name: string; image: string };
  structure: { id: string; name: string; decaySeconds: number; image: string };
  decayAt: number;
  secondsRemaining: number;
  timeInfo: { label: string; status: 'active' | 'expired' };
  matches?: boolean;
  isFavorite?: boolean;
  structureDecayAt: number;
  structureSecondsRemaining: number;
  structureTimeInfo: { label: string; status: 'active' | 'expired' };
  creatureDecayAt: number | null;
  creatureSecondsRemaining: number | null;
  creatureTimeInfo: { label: string; status: 'active' | 'expired' } | null;
  nextDecayType: 'structure' | 'creature';
}

export type SortField = 'server' | 'map' | 'structure' | 'decay';

export interface DecayFormValues {
  mapId: string;
  structureId: string;
  serverNumber: number;
  note?: string;
  creatureEnabled?: boolean;
}
