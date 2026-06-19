import { useState, useEffect, useCallback } from 'react';

export const useUnsavedChanges = <T>(initial: T) => {
  const [saved, setSaved] = useState<T>(initial);
  const [current, setCurrent] = useState<T>(initial);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(JSON.stringify(saved) !== JSON.stringify(current));
  }, [saved, current]);

  const update = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setCurrent(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setCurrent(saved);
  }, [saved]);

  const markSaved = useCallback(() => {
    setSaved(current);
    setHasChanges(false);
  }, [current]);

  const initialize = useCallback((data: T) => {
    setSaved(data);
    setCurrent(data);
    setHasChanges(false);
  }, []);

  return { current, hasChanges, update, reset, markSaved, initialize, setCurrent };
};
