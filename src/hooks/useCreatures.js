// src/hooks/useCreatures.js
import { useCallback, useEffect, useState } from 'react';
import { DEFAULTS } from '../config/defaults';

const sortCreatures = (list) => {
  const normalize = (name = '') => name.replace(/^Aberrant\s+/i, '').trim();
  return [...list].sort((a = {}, b = {}) => {
    const nameA = normalize(a.name || '');
    const nameB = normalize(b.name || '');
    const baseCompare = nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    if (baseCompare !== 0) return baseCompare;
    return (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' });
  });
};

export function useCreatures(preferredName) {
  const [list, setList] = useState([]);
  const [current, setCurrent] = useState(null); // { name, base, masks[] }

  useEffect(() => {
    import('../data/creatures.json')
      .then((mod) => {
        const arr = Array.isArray(mod.default) ? mod.default : [];
        const sorted = sortCreatures(arr);
        setList(sorted);
        const source = sorted.length ? sorted : arr;
        const found = (preferredName && source.find((c) => c.name === preferredName)) || source.find((c) => c.name === DEFAULTS.defaultCreatureName) || source[0] || null;
        setCurrent(found);
      })
      .catch(() => setList([]));
  }, [preferredName]);

  const selectByName = useCallback(
    (name) => {
      setCurrent((prev) => {
        const next = list.find((c) => c.name === name) || prev;
        return next || prev;
      });
    },
    [list]
  );

  return { list, current, selectByName, setCurrent };
}
