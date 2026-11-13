# Relatório de viabilidade — Voz em tempo real (ElevenLabs)

**Data:** 2026-10-21  
**Escopo desta entrega:** prova técnica isolada + relatório. **Sem** integração no `TryOnWidget`, **sem** deploy, **sem** exposição de API keys.

---

## 1. Gate obrigatório — arquitetura conversacional

### Veredicto: **NÃO PRONTA** → integração de voz no widget **bloqueada**

| Requisito | Estado atual | Evidência |
|-----------|--------------|-----------|
| Ferramentas comerciais centralizadas | ❌ Parcial | Catalog/ATC/suggestion ainda embutidos em `TryOnWidget.callGPTAssistant` + HMAC client; não há tools server-side omafit invocáveis por um agent |
| Sessões seguras | ❌ Ausente p/ voz | Existe `StylistSession` tipada e `session_id` local; **não** há mint de credencial temporária ElevenLabs, nem gate Enterprise, nem quota de minutos |
| Contexto compartilhado FE↔BE | ⚠️ Incipiente | Tipos/reducer em `src/features/stylist`; o chat real ainda é estado React + payload ad-hoc para `validate-size` |
| Um único sistema de recomendações | ✅ Conceito / ❌ Runtime | Catálogo continua no omafit; motor tipado preparado, mas **não** ligado; risco alto se o agent ElevenLabs inventar produtos sem tools |

**Conclusão do gate:** a prova técnica abaixo valida o *protocolo* e a máquina de estados. **Não** avançar para microfone/SDK no widget até fechar os bloqueadores listados na secção 5.

---

## 2. Documentação ElevenLabs (revisão 2026)

Fontes: [JS SDK](https://elevenlabs.io/docs/eleven-agents/libraries/java-script), [Authentication](https://elevenlabs.io/docs/eleven-agents/customization/authentication), [Client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools), [Client events](https://elevenlabs.io/docs/eleven-agents/customization/events/client-events), [Custom LLM](https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm).

### Capacidades relevantes

| Capacidade | Como | Adequação Omafit |
|------------|------|------------------|
| Conversa contínua + barge-in | WebRTC (token) ou WebSocket (signed URL); `interruption` + `agent_response_correction`; `onModeChange` listening/speaking | ✅ Cobre “ChatGPT-like” |
| Credenciais temporárias | Server: `get-signed-url` (15 min) ou `conversation/token`; **nunca** `xi-api-key` no cliente | ✅ Obrigatório |
| Sync texto/áudio | `audio` alignment + `agent_chat_response_part` (enable em `client_events`) | ✅ Cards enquanto fala |
| Tool calling | **Webhook** (server) + **Client** (UI) + system | ✅ Separar commerce vs UI |
| Custom LLM | OpenAI-compatible SSE; **não** combina com Realtime model | ⚠️ Controlo máximo, latência maior |

### Modo de integração recomendado (quando a arquitetura estiver pronta)

```
┌─────────────┐   mic/speaker    ┌──────────────────┐
│  Widget UI  │◄────────────────►│ ElevenLabs Agents│
│  (client    │  client tools    │  (voz: STT/TTS,  │
│   tools UI) │  show_cards etc. │   turn-taking)   │
└──────┬──────┘                  └────────┬─────────┘
       │                                  │ webhook tools
       │ signed URL / token               ▼
       │                         ┌──────────────────┐
       └────────────────────────►│ omafit backend   │
           mint + Enterprise     │ catalog-search   │
           + minutes quota       │ recommend/ATC    │
                                 │ validate-size    │
                                 └──────────────────┘
```

1. **ElevenLabs = camada de voz** (não dono do catálogo).  
2. **Webhook tools → omafit** = único caminho de recomendação / preço / plano.  
3. **Client tools → widget** = `show_product_cards`, `request_try_on`, `add_to_cart`, `end_conversation`.  
4. **Custom LLM** só se precisarmos que `validate-size` seja o cérebro verbal — trade-off de latência; alternativa: prompt EL + webhooks obrigatórios (“nunca inventar handle”).

**Não recomendado:** agent ElevenLabs com knowledge próprio de produtos (segundo sistema de recomendações).

---

## 3. Prova técnica isolada

Código: `src/features/stylist/voice/`  
Runner: `npm run stylist:voice-proof` (vitest dos cenários mock)

### O que foi medido (mock de protocolo, sem API key / sem mic)

| Cenário | Resultado típico | Critério |
|---------|------------------|----------|
| Happy path — TTFA, tools, sync | TTFA ≈ 120 ms (simulado), products UI ≈ 5 ms, alignment ≈ 1.0 | TTFA &lt; 800 ms mock; coverage ≥ 0.85 |
| Barge-in | `interruption` + `agent_response_correction` | Estado `interrupted` / listening |
| Fallback textual | Connect fail → `used_text_fallback` | Widget permanece usável sem voz |

> Números de TTFA são **limites inferiores simulados**. TTFA real WebRTC+LLM+TTS tipicamente 500–1500 ms+; exige prova live com agent e chave server-side após o gate.

### O que a prova NÃO fez

- Não instalou `@elevenlabs/client` no bundle do widget  
- Não pediu permissão de microfone  
- Não ligou `TryOnWidget`  
- Não chamou Shopify  
- Não persistiu áudio  

---

## 4. Viabilidade (go / conditional / no-go)

| Dimensão | Avaliação |
|----------|-----------|
| Viabilidade técnica ElevenLabs | **GO condicional** — API/SDK cobrem contínua, interrupt, tools, sync, auth temporária |
| Viabilidade no Omafit hoje | **NO-GO integração** — gate de arquitetura falhou |
| Risco de dois cérebros de recomendação | Alto se EL falar sem webhook omafit |
| Risco de custo/minutos | Alto sem metering server-side + Enterprise gate |
| Fallback textual | Viável (já existe no chat; prova marca `used_text_fallback`) |

**Decisão:** continuar preparação (sessão, tools omafit, mint Enterprise). **Não** implementar UX de microfone nesta fase.

---

## 5. Bloqueadores antes da implementação completa

1. Endpoint omafit `POST /api/widget/voice-session/mint`  
   - Valida plano **Enterprise**  
   - Verifica/consome **minutos** por `shop_domain`  
   - Devolve `conversationToken` ou `signedUrl` (TTL curto)  
   - Nunca devolve `xi-api-key`
2. Webhook tools no agent apontando só para allowlist omafit (catalog / recommend / cart policy) — **sem** Shopify Admin arbitrário  
3. `TryOnWidget` consumindo `StylistEngine` + `StylistSession` (texto e voz no mesmo histórico)  
4. Client tools registados no SDK mapeados para `StylistStructuredAction` (já prototipado em `protocolBridge.ts`)  
5. Métricas: duração, TTFA, erros, minutos, custo estimado — persistência server-side  
6. Encerramento: `endSession` no unmount / limite / `end_conversation`  
7. Consentimento `consents.voice_recording` (default false; sem persistir gravações por padrão)  
8. Prova **live** (staging) com agent privado + allowlist de hostname do widget  

---

## 6. Contratos omafit adicionais (voz)

Ver também `OMAFIT_INTEGRATION_CONTRACTS.md`.

```http
POST /api/widget/voice-session/mint
Body: { shop_domain, public_id, session_id, language, consents }
→ 200 { conversation_token | signed_url, expires_at, minutes_remaining, conversation_id? }
→ 402/403 plan_required | minutes_exhausted
```

```http
POST /api/widget/voice-session/heartbeat  (opcional)
POST /api/widget/voice-session/end      { conversation_id, duration_ms, metrics }
```

Webhook tools (ElevenLabs → omafit): `search_catalog`, `get_product`, `create_cart_intent` (allowlisted).  
Client tools (EL → browser): `show_product_cards`, `request_try_on`, `add_to_cart`, `show_selection_options`, `end_conversation`.

---

## 7. Como reproduzir a prova

```bash
npm run stylist:voice-proof
# ou
npx vitest run src/features/stylist/voice/proof/runVoiceProof.test.ts
```

Relatório markdown gerado também pode ser impresso via `formatVoiceProofMarkdown(await runVoiceProof())`.
