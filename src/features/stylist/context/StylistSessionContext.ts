import { createContext } from 'react';
import type { StylistSession } from '../types';
import type { StylistSessionAction } from '../services/sessionState';

/**
 * Contexto React preparado para painel Stylist independente do try-on.
 * Não montado no WidgetPage nesta etapa — evita mudança de comportamento.
 */
export type StylistSessionContextValue = {
  session: StylistSession | null;
  dispatch: (action: StylistSessionAction) => void;
  /** Host sinaliza se o plano Growth+ foi autorizado no servidor (não só frontend). */
  stylistPlanAuthorized: boolean;
};

export const StylistSessionContext = createContext<StylistSessionContextValue | null>(null);
