# Auditoria de `TryOnWidget.tsx`

Arquivo: `src/components/TryOnWidget.tsx` (~6600 linhas). Um único componente exportado (`TryOnWidget`) concentra sessão, rede, sizing e UI.

Não houve extração nesta organização. Isolar o polling ou o `handleSubmit` exige carregar dezenas de estados e refs do mesmo closure. Não há teste do componente. O build atual depende desse arquivo do jeito que está.

Já existem extrações anteriores, e o widget as importa:

| Módulo | Responsabilidade já fora do arquivo |
| --- | --- |
| `src/services/tryonImagePrep.ts` | resize, URL otimizada de imagem remota, upload via `tryon-upload-url` |
| `src/services/tryonProductContext.ts` | contexto de produto / variante (tem teste) |
| `src/services/tryonAssistantCopy.ts` | copy de fallback do assistente (tem teste) |
| `src/components/tryon/*` | shell visual (sidebar, hero, splash), constantes, types, debug |
| `src/utils/sizeCalculation.ts` | cálculo de tamanho (tem teste; não mexer no algoritmo) |
| `src/hooks/useMediaPipePose.ts` | pose no cliente |
| `src/hooks/useShopperProfileController.ts` | perfil do shopper |

## Onde cada preocupação vive hoje

| Preocupação | Onde |
| --- | --- |
| Estado de sessão / UI | `useState` / `useRef` a partir da abertura do componente (~linha 126): idioma, cores, chat GPT, medidas, `step`, preview, refs de polling (`pollingTimeoutRef`, `pollingDeadlineRef` ~433) |
| Navegação de passos | `setStep('info' \| 'calculator' \| 'photo' \| 'processing' \| 'result')` espalhado; efeitos que reagem a `step === 'calculator'` |
| Contexto de produto | listener `postMessage` (`omafit-context`, `omafit-config-update`) ~1288–1534, mais `tryonProductContext.ts` |
| Size chart | efeito que termina ~2852, usando `resolveSizeChart` / `pickPreferredCollectionHandle` |
| Upload / prep de imagem | `handleImageChange` ~2863; prep e upload de fato em `tryonImagePrep.ts` |
| Validação da foto | `validatePhotoForCollection` ~2894 |
| Submit + API | `handleSubmit` ~3076: `track-footwear-tryon`, `tryon`, e mais adiante `validate-size` |
| Polling | bloco ~3468–3892: `tryon-status`, deadline, `getPollingDelayMs`, mensagens de progresso |
| Erros | `setError` e ramos `catch` dentro dos fluxos acima |
| Copy de fallback | `tryonAssistantCopy.ts`, chamado a partir do widget |
| Sizing | comentário de arquitetura em 5 blocos ~1932; a matemática importada de `sizeCalculation.ts`. O widget orquestra, não é o lugar para reescrever a fórmula |

`WidgetGeneratorPage.tsx` também chama `tryon` e `tryon-status` por conta própria. Extrair um client HTTP sem incluir essa página deixa dois clientes.

## Estrutura proposta (não implementada)

```text
src/features/tryon/
  TryOnWidget.tsx
  hooks/
    useTryOnSession.ts
    useTryOnPolling.ts
    useTryOnUpload.ts
    useTryOnProductSelection.ts
  services/
    tryonApi.ts
    imagePrep.ts          # hoje src/services/tryonImagePrep.ts
  components/
    TryOnUpload.tsx
    TryOnProgress.tsx
    TryOnResult.tsx
  types/
```

Ordem segura, quando houver aprovação para refactor:

1. Mover constantes e types que `tryonImagePrep.ts` e `tryonProductContext.ts` importam de `components/tryon/` para um módulo sem UI. Hoje o service depende do componente. Isso não é ciclo (o grafo estático de `src/` não tem ciclo), mas impede mover `services/` sozinho.
2. Extrair `tryonApi.ts` só com `fetch` de `tryon`, `tryon-status` e `tryon-upload-url`, com teste de contrato de URL/headers (sem mudar payload).
3. Extrair o agendamento de polling para um hook testável com timers fake, ainda chamado pelo mesmo `handleSubmit`.
4. Só então quebrar a UI em `TryOnUpload` / `TryOnProgress` / `TryOnResult`.

Até lá, o mapa de risco está em `docs/architecture/frontend-refactor-plan.md`.
