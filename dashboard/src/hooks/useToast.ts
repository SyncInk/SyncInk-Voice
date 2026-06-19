import { useState, useCallback } from 'react';
import type { Toast } from '../types';

let toastIdCounter = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = String(++toastIdCounter);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
};
