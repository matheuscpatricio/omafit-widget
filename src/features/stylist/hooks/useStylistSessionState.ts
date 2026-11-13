import { useCallback, useState } from 'react';
import type { CreateStylistSessionInput, StylistSession } from '../types';
import {
  createStylistSession,
  reduceStylistSession,
  resumeStylistSession,
  type StylistSessionAction,
} from '../services/sessionState';

/**
 * Hook leve sobre o reducer de sessão.
 * Ainda não substitui o estado de chat do TryOnWidget — preparação incremental.
 */
export function useStylistSessionState(initial?: CreateStylistSessionInput) {
  const [session, setSession] = useState<StylistSession>(() => createStylistSession(initial));

  const dispatch = useCallback((action: StylistSessionAction) => {
    setSession((prev) => reduceStylistSession(prev, action));
  }, []);

  const resume = useCallback(
    (
      snapshot: Partial<StylistSession> & { session_id: string },
      overrides?: Partial<CreateStylistSessionInput>
    ) => {
      setSession(resumeStylistSession(snapshot, overrides));
    },
    []
  );

  const reset = useCallback((input?: CreateStylistSessionInput) => {
    setSession(createStylistSession(input));
  }, []);

  return { session, dispatch, resume, reset };
}
