# Stylist voice: rollout

Voice is a second way to talk to the same stylist. The text chat is unchanged, and every voice turn lands in the same `chatMessages` thread.

## Pieces

| Where | What |
| --- | --- |
| omafit `POST /api/widget/voice-session/{mint,heartbeat,end}` | Plan gate, monthly quota per shop, concurrency cap, server-issued ElevenLabs `conversation_token`, signed `voice_ticket` |
| omafit `POST /api/voice-tools/{search-catalog,get-product,create-cart-intent}` | Webhook tools for the agent. They reuse the catalog-search pipeline, and the shop comes only from the ticket. |
| omafit `elevenlabs/stylist-voice-agent.json` + `scripts/elevenlabs-provision-agent.mjs` | Private agent: prompt, tools, client events, no recording |
| widget `utils/omafitVoiceSessionClient.ts` | HMAC client for the session routes |
| widget `features/stylist/voice/{elevenLabsTransport,voiceSessionController}.ts` | Lazy-loaded SDK adapter. Handles session lifecycle, heartbeat, the duration limit and ending on disconnect. |
| widget `features/stylist/hooks/useStylistVoiceSession.ts` | React binding. Ends the session on `pagehide` or unmount using `keepalive`. |
| widget `features/stylist/components/StylistVoiceControls.tsx` | Mic button, consent prompt, live state, remaining time, fallback messages |

## Plans and limits (enforced in omafit)

| Plan | Voice | Default minutes/month |
| --- | --- | --- |
| growth / pro / professional | yes | 30 (`VOICE_MINUTES_LIMIT_GROWTH`) |
| enterprise | yes | 120 (`VOICE_MINUTES_LIMIT_ENTERPRISE`) |
| other plans | no (`403 plan_required`) | 0 |

Billed time is the lower of the server clock and the duration the client reports. If heartbeats stop for 120s, the session is closed and billed up to the last heartbeat plus 30s. When a shop's quota runs out, mint returns `402 minutes_exhausted` and the widget falls back to text.

## Rollout steps (no deploy without approval)

1. omafit: run the Prisma migration `20261026120000_widget_voice_session`.
2. omafit env: `ELEVENLABS_API_KEY`, `VOICE_TOOL_SECRET`, optionally `VOICE_TICKET_SECRET`, and the limits in `elevenlabs/README.md`.
3. Provision the agent with `node scripts/elevenlabs-provision-agent.mjs --apply`, then set `ELEVENLABS_VOICE_AGENT_ID`.
4. Widget env: `VITE_OMAFIT_STYLIST_VOICE_ENABLED=true`. The flag defaults to off, and the button only appears for stylist (Growth+) shops.
5. Live staging proof on a Growth test shop, measuring time to first audio, barge-in, product cards from `search_catalog`, try-on and add-to-cart from voice, ending at the duration limit, and `minutes_exhausted` with `VOICE_MINUTES_LIMIT_GROWTH=1`.
6. Check `WidgetVoiceUsage`. `usedSeconds` and `estimatedCostUsd` should match the ElevenLabs dashboard to within a few seconds per session.

## Known limits

- The widget HMAC secret ships in the bundle, the same as catalog-search. Paid access does not rely on it: the server checks plan, `public_id` ↔ shop, quota and concurrency, and the tools require a server-signed ticket.
- The automated tests use fakes. Step 5 still needs the real ElevenLabs agent and a deployed omafit.
