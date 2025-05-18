'use client';

import { useEffect, useState } from 'react';

/**
 * Custom hook to determine if the component has mounted.
 * Useful for preventing hydration mismatches when rendering client-side only components.
 * @returns {boolean} True if the component has mounted, false otherwise.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
