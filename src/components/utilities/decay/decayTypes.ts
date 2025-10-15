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
}

export interface DecayServerView extends DecayServer {
  map: { id: string; name: string; image: string };
  structure: { id: string; name: string; decaySeconds: number; image: string };
  decayAt: number;
  secondsRemaining: number;
  timeInfo: { label: string; status: 'active' | 'expired' };
  matches?: boolean;
}

export type SortField = 'server' | 'map' | 'structure';

export interface DecayFormValues {
  mapId: string;
  structureId: string;
  serverNumber: number;
  note?: string;
}
