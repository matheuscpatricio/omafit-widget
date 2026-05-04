import type { ReactNode } from 'react';

/**
 * Invólucro do layout clássico do try-on: sem alterações estruturais —
 * apenas repassa os filhos (comportamento actual do TryOnWidget).
 */
export function TryOnLayoutShellDefault({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
