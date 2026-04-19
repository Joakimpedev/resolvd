import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

export function useAppRefetch() {
  const qc = useQueryClient();
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') qc.invalidateQueries();
    });
    return () => sub.remove();
  }, [qc]);
}
