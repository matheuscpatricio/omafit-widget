# Omafit — Product Experience & AI Commerce Application

This repository contains the customer-facing product experience and supporting application surfaces for **[Omafit](https://omafit.co)**, an AI SaaS platform for fashion e-commerce.

It demonstrates production work across **React/TypeScript product engineering, computer vision, virtual try-on workflows, sizing, merchant tooling, analytics, commerce integrations and testing**.

> Omafit is a production product. Credentials and some proprietary infrastructure are intentionally excluded from the public repository.

## What this repository demonstrates

- React + TypeScript application architecture
- customer-facing virtual try-on flows
- MediaPipe-based body analysis
- sizing and size-chart experiences
- merchant dashboard and analytics
- product and collection management
- widget configuration and storefront UX
- Shopify application surfaces and commerce workflows
- Supabase-backed application data and authentication
- automated tests with Vitest and Playwright
- Vite build tooling and Netlify deployment configuration

## Product surfaces

### Virtual try-on

The storefront experience lets a shopper move from product context into an AI try-on flow while preserving the surrounding commerce journey.

The repository includes the UI and orchestration around:

```text
Product context
      │
      ▼
Try-on experience
      │
      ├── image / user input
      ├── body-analysis support
      ├── inference job lifecycle
      └── result state
      │
      ▼
Sizing / product decision
      │
      ▼
Commerce action
```

Long-running AI inference is treated as an asynchronous workflow rather than blocking the normal UI request path.

### Body analysis and sizing

Body-analysis functionality uses **MediaPipe Tasks Vision** in the client-side application layer. The resulting measurements feed Omafit's sizing experience, which is designed separately from generative AI.

This separation is deliberate: virtual try-on benefits from generative models, while core size recommendation is handled as a constrained recommendation problem.

### Merchant application

The application also contains merchant-facing surfaces for:

- dashboard and account configuration
- products and collections
- analytics
- size-chart management
- widget customization
- subscription and billing flows

## Frontend architecture

```text
Storefront / Merchant
        │
        ▼
 React + TypeScript
        │
        ├── Product UI
        ├── Try-on UI
        ├── Sizing UI
        ├── Analytics
        └── Merchant configuration
        │
        ├────────► Application / commerce APIs
        ├────────► Supabase
        ├────────► MediaPipe vision tasks
        └────────► AI inference workflows
```

The codebase separates reusable UI, hooks, application utilities and domain-specific product flows under `src/`, with additional Shopify application surfaces under `app/`.

## Selected implementation areas

| Area | Examples |
| --- | --- |
| Product experience | `src/components/TryOnWidget.tsx`, product and widget surfaces |
| Computer vision | `src/hooks/useMediaPipePose.ts` |
| Analytics | `src/components/AnalyticsPage.tsx`, `AdvancedAnalytics.tsx` |
| Sizing | size calculator and size-chart management components |
| Authentication | `src/hooks/useAuth.ts` and auth surfaces |
| Commerce | Shopify application layer under `app/` |
| Testing | Vitest + Playwright |
| Deployment | Vite + Netlify configuration |

## Core stack

**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS  
**Product UI:** Radix UI · Framer Motion · GSAP  
**Computer Vision:** MediaPipe Tasks Vision  
**Data & Auth:** Supabase  
**Commerce:** Shopify application infrastructure  
**Testing:** Vitest · Playwright  
**Deployment:** Netlify

The repository also contains integrations and experiments used across Omafit's evolving product surface. The README focuses on the parts most relevant to the production SaaS and its engineering architecture.

## Local development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm test
npm run build
```

Configuration is provided through environment variables. Use the included `.env.example` as a reference and never commit production credentials.

## Related engineering work

For the broader system architecture — including the self-hosted GPU inference pipeline, deterministic sizing engine and Shopify integration design — see:

- [Omafit engineering case study](https://github.com/matheuscpatricio/omafit)
- [System architecture](https://github.com/matheuscpatricio/omafit/blob/main/docs/architecture.md)
- [Virtual try-on inference pipeline](https://github.com/matheuscpatricio/omafit/blob/main/docs/inference-pipeline.md)
- [Deterministic sizing engine](https://github.com/matheuscpatricio/omafit/blob/main/docs/sizing-engine.md)

## Production context

Across the production platform, Omafit supports **20+ e-commerce stores**, approximately **900 catalog products** and **~30K virtual try-ons/month**.

The broader engineering work reduced virtual try-on inference cost by **87%** and generation latency by **36%** compared with the evaluated third-party inference path.

## Links

- [Omafit](https://omafit.co)
- [Engineering case study](https://github.com/matheuscpatricio/omafit)
- [Matheus Patrício — Portfolio](https://matheuspatricio.com)
- [LinkedIn](https://www.linkedin.com/in/matheuscpatricio)

---

Built and operated by **Matheus Patrício** — AI Product Engineer · Technical Founder · Full-Stack Engineer.
