// src/hooks/useCreatures.js
import { useCallback, useEffect, useState } from 'react';
import { DEFAULTS } from '../config/defaults';

export function useCreatures(preferredName) {
  const [list, setList] = useState([]);
  const [current, setCurrent] = useState(null); // { name, base, masks[] }

  useEffect(() => {
    import('../data/creatures.json')
      .then((mod) => {
        const arr = mod.default || [];
        setList(arr);
        const found = (preferredName && arr.find((c) => c.name === preferredName)) || arr.find((c) => c.name === DEFAULTS.defaultCreatureName) || arr[0] || null;
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
