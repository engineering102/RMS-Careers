'use client';

import { useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query currently matches; re-renders when it changes. Server rendering (and the
 * first client render during hydration) uses `serverDefault`, so only use it for UI that is not part
 * of the initial HTML (dialogs, sheets) or where a default is acceptable.
 */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  const supported = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  return useSyncExternalStore(
    (onChange) => {
      if (!supported()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => (supported() ? window.matchMedia(query).matches : serverDefault),
    () => serverDefault
  );
}
