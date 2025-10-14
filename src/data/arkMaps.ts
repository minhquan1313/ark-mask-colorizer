export interface IArkMap {
  id: string;
  name: string;
  image: string;
}

// image should be in ratio 4:3
export const ARK_MAPS: IArkMap[] = [
  {
    id: 'the-island',
    name: 'The Island',
    image: '/assets/maps/the-island-600-400.png',
  },
  {
    id: 'the-center',
    name: 'The Center',
    image: '/assets/maps/the-center-600-400.png',
  },
  {
    id: 'scorched-earth',
    name: 'Scorched Earth',
    image: '/assets/maps/scorched-earth-600-400.png',
  },
  {
    id: 'aberration',
    name: 'Aberration',
    image: '/assets/maps/aberration-600-400.png',
  },
  {
    id: 'extinction',
    name: 'Extinction',
    image: '/assets/maps/extinction-600-400.png',
  },
  {
    id: 'astraeos',
    name: 'Astraeos',
    image: '/assets/maps/astraeos-600-400.png',
  },
  {
    id: 'ragnarok',
    name: 'Ragnarok',
    image: '/assets/maps/ragnarok-600-400.png',
  },
  {
    id: 'valguero',
    name: 'Valguero',
    image: '/assets/maps/valguero-600-400.png',
  },
];

export const DEFAULT_ARK_MAP: IArkMap = ARK_MAPS[0];

export function getArkMap(mapId: string | null | undefined): IArkMap {
  if (!mapId) {
    return DEFAULT_ARK_MAP;
  }
  return ARK_MAPS.find((map) => map.id === mapId) ?? DEFAULT_ARK_MAP;
}
