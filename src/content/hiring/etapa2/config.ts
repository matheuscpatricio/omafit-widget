/** Configuração pública da Etapa 2 (preencher antes de publicar). */
export const ETAPA2_CONFIG = {
  contactEmail: 'contato@omafit.co',
  /** Texto exibido na tela de agradecimento (ex.: "15 de dezembro de 2026"). */
  contactByDateLabel: '15 de dezembro de 2026',
  /** ISO date (America/Sao_Paulo). Após esta data o link mostra prazo encerrado. */
  responseDeadlineIso: '2026-12-15T23:59:59-03:00',
  questionsVersion: '2.0',
  consentTextVersion: '1.0',
  roleTitle: 'Sócio(a) Comercial',
  pageTitle: 'Omafit – Processo seletivo Sócio(a) Comercial',
  storageKeyPrefix: 'omafit_etapa2_v3_single',
} as const;
