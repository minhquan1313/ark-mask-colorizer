// src/hooks/useCreatures.js
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { DEFAULTS } from '../config/defaults';
import type { CreatureEntry } from '../types/creatures';

const sortCreatures = (list: CreatureEntry[]): CreatureEntry[] => {
  const normalize = (name = ''): string => name.replace(/^Aberrant\s+/i, '').trim();
  return [...list].sort((a, b) => {
    const nameA = normalize(a?.name ?? '');
    const nameB = normalize(b?.name ?? '');
    const baseCompare = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    if (baseCompare !== 0) return baseCompare;
    return (b?.name ?? '').localeCompare(a?.name ?? '', undefined, { sensitivity: 'base' });
  });
};

export interface UseCreaturesResult {
  list: CreatureEntry[];
  current: CreatureEntry | null;
  selectByName: (name: string) => void;
  setCurrent: Dispatch<SetStateAction<CreatureEntry | null>>;
}

export function useCreatures(preferredName?: string | null): UseCreaturesResult {
  const [list, setList] = useState<CreatureEntry[]>([]);
  const [current, setCurrent] = useState<CreatureEntry | null>(null); // { name, base, masks[] }

  useEffect(() => {
    void import('../data/creatures.json')
      .then((mod) => {
        const arr = Array.isArray(mod.default) ? (mod.default as CreatureEntry[]) : [];
        const sorted = sortCreatures(arr);
        setList(sorted);
        const source = sorted.length ? sorted : arr;
        const found =
          (preferredName && source.find((c) => c.name === preferredName)) ||
          source.find((c) => c.name === DEFAULTS.defaultCreatureName) ||
          source[0] ||
          null;
        setCurrent(found);
      })
      .catch(() => setList([]));
  }, [preferredName]);

  const selectByName = useCallback(
    (name: string) => {
      setCurrent((prev) => {
        const next = list.find((c) => c.name === name) || prev;
        return next || prev;
      });
    },
    [list],
  );

  return { list, current, selectByName, setCurrent };
}
