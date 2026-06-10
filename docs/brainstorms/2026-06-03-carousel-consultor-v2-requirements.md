# Carrossel Instagram — Consultor inteligente (v2)

**Data:** 2026-06-03  
**Status:** Aprovado para produção  
**Formato:** 6 slides · 1080×1350 (4:5) · PT-BR

## Objetivo

Comunicar que lojas Shopify precisam de um **vendedor inteligente** (consultor Omafit) que entende desejo, estação e ocasião — não apenas um catálogo. Tom editorial, premium, mais laranja e **layout edge-to-edge** (sem cartão pequeno centralizado).

## Critérios de sucesso

- Textos mais expansivos e narrativos que a v1 (cada slide conta parte da história).
- Identidade Omafit legível em 2 segundos: fundo escuro + **laranja #D96845 dominante**.
- Design ocupa **100% do canvas** (full bleed); tipografia grande (título ~40–55% da altura útil).
- Pronto para publicar como carrossel no Instagram.

## Direção visual (não negociável)

| Token | Hex | Uso v2 |
|-------|-----|--------|
| Canvas | `#16100A` | Fundo full bleed |
| Elevated | `#241A10` | Gradiente / profundidade |
| Cream | `#F6F0E2` | Texto principal |
| **Accent (laranja)** | **`#D96845`** | **40%+ da composição:** pills, linhas, glow, CTAs, palavras-chave |
| Accent dark | `#B8522E` | Botões, sombras quentes |
| Tech | `#5BAF8A` | Apenas números / passos 01–04 |
| Muted | `#7A6A58` | Corpo secundário |

**Layout:** sem margens brancas; sem “card flutuante” no centro; elementos ancorados às bordas; foto (se houver) com overlay escuro + faixa laranja diagonal ou glow superior.

**Tipografia:** títulos serif (Gloock); corpo sans (Bricolage/Outfit); números mono (DM Mono).

## Roteiro — 6 slides (copy final v2)

### Slide 1 — Capa
- **Pill:** Consultor de moda com IA
- **Título:** Sua loja online merece um vendedor que **entende** — não um catálogo mudo
- **Corpo:** No físico, alguém percebe o clima, o evento e o estilo antes de sugerir a peça. O Omafit traz essa inteligência para dentro da sua Shopify.
- **Rodapé:** omafit.co · Arrasta para ver →

### Slide 2 — Problema
- **Pill:** O custo do silêncio
- **Título:** Catálogo impecável. Jornada sozinha.
- **Bullets:** Milhares de SKUs, zero narrativa · O cliente hesita no tamanho, na combinação, na estação · Cada dúvida vira abandono ou devolução
- **Fecho:** Comprar online sem consultor é entrar numa loja fechada.

### Slide 3 — Expectativa
- **Pill:** O que esperamos do vendedor
- **Título:** Percepção antes da venda
- **Bullets:** Lê o tom: casual, formal, audácia, conforto · Contextualiza verão, inverno, festa, trabalho, viagem · Monta look completo — não isola uma peça
- **Quote (laranja, itálico):** “Preciso de algo leve pro calor” → conjunto coerente, não um item perdido

### Slide 4 — Solução
- **Pill:** Omafit na sua loja
- **Título:** Consultor inteligente embutido no provador
- **Corpo:** Após try-on fotorrealista ou AR, o assistente já sabe o que o cliente viu no corpo. Cruza com seu catálogo, sugere complementares e fala como sua marca — 24h, sem fila.
- **Badge:** 24/7 · sem turno · white-label

### Slide 5 — Fluxo
- **Pill:** Na prática
- **Título:** Da intenção ao look em um só fluxo
- **Passos:** 01 Experimenta (try-on/AR) · 02 Conta ocasião, estação e estilo · 03 Consultor devolve peças do catálogo · 04 Looks complementares → mais ticket
- **Fecho:** Menos devolução. Mais AOV. Mais recompra.

### Slide 6 — CTA
- **Pill:** Shopify · moda
- **Título:** Traga a sala de provadores para o digital
- **Corpo:** Widget personalizável, medição MediaPipe, try-on IA e consultor integrado (Growth+).
- **CTA:** Conheça o Omafit — omafit.co

## Fora de escopo (v2)

- Vídeo/Reels animado
- Versão EN/ES (fase seguinte)
- Dados numéricos da landing (63%, 3×) — foco narrativo consultor

## Dependências

- Canva MCP para layout editável
- `GEMINI_API_KEY` (opcional) para fundos fotográficos custom via `scripts/generate-omafit-carousel-gemini.py`

## Referências no repo

- Tokens: `src/index.css`, `tailwind.config.js`
- Produto consultor: `src/components/landing/Solution.tsx`, `src/components/TryOnWidget.tsx`
