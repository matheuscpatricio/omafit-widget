# AI Stylist → assistente multimodal (plano incremental)

## Mapa de dependências (estado atual)

```
Shopify theme (postMessage)
        │
        ▼
   WidgetPage ── stylistModeEnabled (UI only) ──► TryOnWidget
                                                      │
          ┌───────────────────────────────────────────┼────────────────────────────┐
          ▼                                           ▼                            ▼
  omafit catalog-search                    validate-size (Supabase)      suggestion-events
  product-by-handle                        chat_history + stylist_brief  impression|click|atc
  (HMAC → repo omafit)                     Growth+ gate SERVER-SIDE
```

| Área | Onde vive hoje | Notas |
|------|----------------|-------|
| Estado do chat | `TryOnWidget` (`chatMessages`, refs) | ~6.6k linhas; não reescrever |
| Clarificação / feedback | `stylistClarification`, `stylistFeedbackParser` | Já isolados |
| Brief / preço | `stylistContext` | Alimenta catalog-search |
| Try-on por texto | `chatTryOnIntent` | Usa últimas sugestões |
| Catálogo / eventos | `omafitCatalogClient` | Não duplicar lógica omafit |
| Plano Growth+ | `shopifyPlanAccess` + validate-size | Frontend NÃO autoriza sozinho |
| Sizing / imagem | `SizeCalculator`, `/tryon`, MediaPipe | Fora do escopo desta refatoração |

## Organização-alvo

```
src/features/stylist/
  types/       sessão, mensagens, ações, modalidade (texto|voz)
  services/    engine, session reducer, fallback, chat_history
  hooks/       useStylistSessionState (ainda não substitui TryOnWidget)
  context/     StylistSessionContext (ainda não montado)
  components/  (reservado — painel de chat nas etapas seguintes)
```

## Etapas

1. **✅ Esta PR** — Extrair tipos + sessão + contrato do motor + helpers puros; testes; TryOnWidget importa `ChatMessage` e usa fallback/`chat_history` extraídos. Sem mudança de UX.
2. Extrair handlers de sugestão (try-on / ATC) e painel de chat para `components/`.
3. Encaminhar `callGPTAssistant` para `StylistEngine.processTurn` com `completeTurn` = validate-size atual.
4. Sessão retomável (memória do parent / sessionStorage sem fotos).
5. **Gate voz:** centralizar tools comerciais + mint Enterprise + minutos no omafit.
6. Eventos de voz → mesmo motor (SDK ElevenLabs **só após** gate). Ver `VOICE_FEASIBILITY_REPORT.md`.

### Prova de voz (isolada, sem integração)

- Código: `src/features/stylist/voice/`
- Runner: `npm run stylist:voice-proof`
- Relatório: `docs/stylist/VOICE_FEASIBILITY_REPORT.md`
- **Não** montar microfone no `TryOnWidget` enquanto `architecture_ready_for_integration === false`.

## Contratos necessários no backend `omafit`

Ver secção no PR / `OMAFIT_INTEGRATION_CONTRACTS.md`.
