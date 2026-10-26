'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

/** Keep results scoped to their request; changed inputs render the initial state immediately. */
export function useRequestState<T>(requestKey: object, initialValue: T): readonly [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState({ requestKey, value: initialValue });
  const value = state.requestKey === requestKey ? state.value : initialValue;

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setState((current) => ({
      requestKey,
      value: typeof next === 'function'
        ? (next as (previous: T) => T)(current.requestKey === requestKey ? current.value : initialValue)
        : next,
    }));
  }, [initialValue, requestKey]);

  return [value, setValue];
}
