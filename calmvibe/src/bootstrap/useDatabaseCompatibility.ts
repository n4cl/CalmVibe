import { useEffect, useState } from 'react';
import { ensureDatabaseCompatibility } from './databaseCompatibility';

type CompatibilityState = {
  ready: boolean;
};

export const useDatabaseCompatibility = (): CompatibilityState => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    ensureDatabaseCompatibility()
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { ready };
};
