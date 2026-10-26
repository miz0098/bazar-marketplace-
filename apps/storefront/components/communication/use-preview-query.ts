'use client';

import { useEffect, useMemo } from 'react';
import { useRequestState } from '@/components/account/use-request-state';

export function usePreviewQuery<T>(load: () => Promise<T>, attempt = 0) {
  const key = useMemo(() => ({ load, attempt }), [load, attempt]);
  const [data, setData] = useRequestState<T | null>(key, null);
  const [error, setError] = useRequestState(key, '');
  useEffect(() => {
    let active = true;
    load().then((value) => { if (active) setData(value); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити демо-дані.');
    });
    return () => { active = false; };
  }, [load, setData, setError]);
  return { data, setData, error };
}
