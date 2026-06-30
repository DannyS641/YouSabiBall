'use client';

import { useState, useEffect } from 'react';

export interface Breakpoint {
  isMobile:  boolean; // < 640px
  isTablet:  boolean; // 640–1023px
  isDesktop: boolean; // ≥ 1024px
  width:     number;
}

export function useBreakpoint(): Breakpoint {
  // Server defaults to 375 (safe mobile-first) — corrected on mount
  const [width, setWidth] = useState(375);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    handler(); // measure immediately so the first paint is correct
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return {
    isMobile:  width < 640,
    isTablet:  width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    width,
  };
}
