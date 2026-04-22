import { useLayoutEffect, useState } from 'react';

/**
 * Mobile-first: `false` até hidratar, depois segue `window.matchMedia`.
 * Use para desativar parallax / efeitos pesados em viewport estreita.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useLayoutEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** Desktop/tablet a partir de 768px (Tailwind `md`). */
export function useIsMdUp() {
  return useMediaQuery('(min-width: 768px)');
}
