import type { LandingCopy } from './types';

export const pt: LandingCopy = {
  htmlLang: 'pt-BR',
  ogLocale: 'pt_BR',
  seo: {
    title: 'Omafit — Assistente de moda com IA para Shopify | Try-on, tamanhos e AR',
    description:
      'Reduza devoluções e aumente conversão com provador virtual, MediaPipe, AR para acessórios e widget Shopify. Planos a partir de US$ 99/mês.',
    keywords:
      'Omafit, Shopify, provador virtual, try-on IA, e-commerce moda, reduzir devoluções, MediaPipe, óculos AR, widget Shopify',
  },
  nav: {
    solution: 'Solução',
    features: 'Recursos',
    pricing: 'Planos',
    faq: 'FAQ',
    blog: 'Blog',
    partners: 'Parceiros',
    install: 'Instalar',
  },
  lang: { label: 'Idioma', pt: 'Português', en: 'English', es: 'Español' },
  hero: {
    slides: [
      {
        id: 'intro',
        badge: 'Omafit',
        titleKind: 'intro',
        titleBefore: 'Fim nas devoluções por tamanho. Mais ',
        titleHighlight: 'confiança',
        titleAfter: ' na moda online.',
        body:
          'O Omafit é o assistente inteligente que usa IA fotorealista e medição precisa para o caimento certo em vestuário, calçados e acessórios. Reduza custos, venda mais e encante quem compra.',
        hideBadge: true,
        compact: true,
        showCtas: true,
        subtleOverlay: true,
      },
      {
        id: 'fit',
        badge: 'Tamanho preciso',
        titleKind: 'mediapipe',
        titleBefore: 'O tamanho certo com ',
        titleHighlight: 'MediaPipe',
        titleAfter: '.',
        body: 'Nossa tecnologia de detecção corporal analisa o cliente e recomenda o tamanho ideal.',
        topScrim: true,
        imageObjectPosition: 'top',
      },
      {
        id: 'chat-aov',
        badge: 'Chat integrado',
        titleKind: 'aov',
        titleBefore: 'Um consultor de estilo que aumenta o ',
        titleHighlight: 'ticket médio',
        titleAfter: '.',
        body:
          'Quando o cliente experimenta uma peça, o Omafit sugere itens complementares e aumenta o AOV da loja.',
        topScrim: true,
      },
    ],
    install: 'Instalar',
    demo: 'Agendar demonstração',
    slideAria: (n) => `Ir para o slide ${n}`,
    marquee: [
      'Shopify',
      'Try-on com IA',
      'MediaPipe',
      'WebAR',
      'Menos devoluções',
      'Mais conversão',
      'Widget white-label',
      'ChatGPT',
      'Vestuário e calçados',
      'Acessórios em AR',
    ],
  },
  pain: {
    tag: 'O problema',
    title: 'Sua loja é linda.',
    titleMuted: 'Mesmo assim a margem escorre por estes motivos.',
    body:
      'Devoluções por tamanho ou caimento corroem margem: frete reverso, reembolso e estoque de volta à prateleira custam caro — e o cliente pode não voltar. Na finalização da compra, a dúvida de tamanho é uma das principais causas de abandono. Sem confiança na compra, o carrinho trava e o tráfego pago não vira receita recorrente.',
  },
  solution: {
    tag: 'A solução',
    title: 'Omafit: inteligência que transforma ',
    titleAccent: 'dúvida em confiança',
    titleEnd: ' e vendas.',
    sub: 'Suite visual com IA para vestuário, acessórios e calçados. Instalação rápida na sua loja.',
    highlight: 'Destaque',
    featureBadge: 'Recurso',
    features: [
      {
        title: 'Tamanho preciso com MediaPipe',
        description:
          'Análise em tempo real de mais de 50 pontos do corpo no celular do cliente. Sem fita métrica, sem chute.',
        bullets: ['98% de precisão na recomendação', 'Captura em <10s', '100% no dispositivo'],
        accent: true,
      },
      {
        title: 'Try-on fotorealista (roupas e calçados)',
        description:
          'A IA renderiza a peça no cliente com sombra, tecido e caimento realistas. Ele vê antes de comprar.',
        bullets: ['Moda feminina e masculina', 'Calçados e acessórios no mesmo fluxo', 'Qualidade fotográfica'],
      },
      {
        title: 'Prévia AR (óculos e acessórios)',
        description: 'Realidade aumentada no navegador para óculos, pulseiras, relógios e mais. Sem app.',
        bullets: ['WebAR—sem instalar app', 'Rastreamento facial em tempo real', 'iOS e Android'],
      },
      {
        title: 'Assistente ChatGPT integrado',
        description: 'Consultor de estilo 24/7 que conhece seu catálogo, tira dúvidas e monta looks.',
        bullets: ['Conhece seu catálogo', 'Sugere looks completos', 'Na voz da sua marca'],
      },
      {
        title: 'Analytics e ROI',
        description:
          'Painéis que ligam o widget a resultados: ROI e perfis agregados de compradores — sempre anônimos.',
        bullets: [
          'Modelos de ROI para conversão, AOV e devoluções',
          'Insights de altura, peso e tipo corporal',
          'Funil de engajamento e sessões de try-on',
        ],
      },
      {
        title: 'Widget personalizável',
        description:
          'Cores, fontes, layout e textos alinhados à marca. Parece nativo na loja — não um plugin solto.',
        bullets: ['100% white-label', 'Instalação em minutos', 'Mobile-first'],
      },
    ],
  },
  impact: {
    tag: 'Dados Omafit',
    title: 'Resultados que marcas como a sua veem no dia a dia.',
    stat1Prefix: 'Até ',
    stat1Suffix: ' menos devoluções',
    stat1Sub: 'Menos logística reversa, mais margem e clientes que voltam com confiança.',
    stat2Prefix: 'Quem usa Omafit tem ',
    stat2Suffix: ' mais chance de comprar',
    stat2Sub: 'Tamanho e visualização guiados que destravam o checkout.',
    stat3Prefix: 'Abandono de carrinho ',
    stat3Suffix: ' menor',
    stat3Sub: 'Menos dúvida de tamanho e visual — mais compras concluídas.',
    disclaimer:
      'Métricas agregadas de lojas com Omafit; seus resultados variam conforme catálogo, tráfego e categoria.',
  },
  pricing: {
    tag: 'Planos transparentes',
    title: 'Escolha o plano que ',
    titleAccent: 'acelera',
    titleEnd: ' seu crescimento.',
    subBefore: 'Cobrança mensal ou anual. Growth, Pro e Scale incluem ',
    trialDays: 'teste de 14 dias',
    subAfter: '. Pacotes com tamanhos, try-on fotorealista e assistente de estilo.',
    popular: 'Popular',
    trialFree: (d) => `${d} dias grátis`,
    customContract: 'Contrato sob medida',
    perMo: '/mês',
    perYr: '/ano',
    sessionUnlimited: 'Sessões de try-on ilimitadas',
    sessionPerMonth: (n) => `${n} sessões de try-on/mês`,
    startTrial: (d) => `Iniciar teste de ${d} dias`,
    talkSales: 'Falar com vendas',
    billingQuestion: 'Dúvidas sobre cobrança ou volume?',
    whatsapp: 'Fale conosco no WhatsApp',
    plans: {
      growth: {
        tagline: 'Para marcas começando com try-on virtual em volume estável.',
        features: [
          '1.000 sessões de try-on/mês',
          'Recomendação de tamanho personalizada',
          'Assistente de compras com IA',
          'Widget personalizável',
          'Extras a US$ 0,12 cada',
        ],
      },
      pro: {
        tagline: 'Volume previsível e ferramentas de estilo para lojas em crescimento.',
        features: [
          '5.000 sessões de try-on/mês',
          'Recomendação de tamanho personalizada',
          'Stylist e looks com IA',
          'Widget personalizável',
          'Extras a US$ 0,08 cada',
        ],
      },
      scale: {
        tagline: 'Alto volume, analytics e styling para catálogos sérios.',
        features: [
          '15.000 sessões de try-on/mês',
          'Widget totalmente personalizável',
          'Stylist e looks com IA',
          'Analytics e insights',
          'Extras a US$ 0,04 cada',
        ],
      },
      enterprise: {
        tagline: 'Try-on ilimitado e suporte dedicado para grandes operações.',
        features: [
          'Sessões de try-on ilimitadas',
          'Widget totalmente personalizável',
          'Stylist e looks com IA',
          'Suporte dedicado',
          'Analytics e insights',
        ],
      },
    },
  },
  faq: {
    tag: 'Perguntas respondidas',
    title: 'Perguntas frequentes.',
    sub: 'Instalação, segurança, integração e suporte — o que você precisa saber.',
    items: [
      {
        q: 'Quanto tempo leva para instalar o Omafit na Shopify?',
        a: 'Alguns cliques na Shopify App Store — em geral menos de 5 minutos. Depois, o widget aparece nas páginas de produto e você ajusta cores, fontes e posição no admin.',
      },
      {
        q: 'Quais plataformas o Omafit suporta?',
        a: 'Hoje temos integração nativa com Shopify. Nuvemshop, WooCommerce e Yampi estão no roadmap. Para ERP, headless ou apps, o time Enterprise pode ajudar.',
      },
      {
        q: 'Como vocês tratam privacidade e segurança?',
        a: 'Alinhados à LGPD e GDPR. O MediaPipe roda no dispositivo do comprador quando possível — sem enviar imagem bruta sem consentimento. Guardamos só métricas anônimas necessárias.',
      },
      {
        q: 'A IA serve para todos os tipos de produto?',
        a: 'Sim: moda feminina e masculina, calçados e acessórios em AR (óculos, bonés, relógios). Categorias muito específicas podem ter fine-tune dedicado.',
      },
      {
        q: 'Como funciona a cobrança por sessão?',
        a: 'Instalação na Shopify é gratuita. Growth: US$ 99/mês — 1.000 sessões. Pro: US$ 399 — 5.000. Scale: US$ 999 — 15.000. Enterprise: US$ 2.499 — ilimitado. Growth, Pro e Scale têm 14 dias de teste.',
      },
      {
        q: 'O Omafit deixa a loja lenta?',
        a: 'O widget carrega sob demanda; o bundle inicial fica abaixo de 50KB. O processamento começa só quando o cliente clica em experimentar.',
      },
      {
        q: 'Que suporte existe após a instalação?',
        a: 'Todos os planos têm docs, tutoriais e e-mail. Pro e Scale incluem onboarding guiado. Enterprise tem suporte dedicado e SLA.',
      },
      {
        q: 'Posso personalizar o widget para minha marca?',
        a: 'Totalmente: cores, fontes, layout, textos, botões e posição. Sem “Powered by Omafit” para o cliente final.',
      },
    ],
  },
  footer: {
    blurb:
      'Assistente de IA fotorealista para vestuário, calçados e acessórios. Tamanho preciso, try-on realista, menos devoluções.',
    product: 'Produto',
    support: 'Suporte',
    company: 'Empresa',
    solution: 'Solução',
    features: 'Recursos',
    pricing: 'Planos',
    shopifyApp: 'App Shopify',
    faq: 'FAQ',
    contact: 'Contato',
    blog: 'Blog',
    partners: 'Parceiros',
    privacy: 'Privacidade',
    terms: 'Termos',
    rights: 'Todos os direitos reservados.',
    madeIn: 'Feito com cuidado em São Paulo, Brasil',
    homeAria: 'Omafit — início',
    instagramAria: 'Instagram do Omafit',
  },
  installModal: {
    title: 'Instalar Omafit',
    subtitle: 'Escolha sua plataforma',
    close: 'Fechar',
    shopify: 'Shopify',
    shopifyHint: 'Instalar pela App Store',
    nuvemSoon: 'Nuvemshop — em breve',
  },
  demoEmail: {
    subject: 'Demonstração personalizada Omafit',
    body:
      'Olá, gostaria de agendar uma demonstração do Omafit para minha loja.\n\nNome da loja:\nCategoria (vestuário / calçados / acessórios):\nVolume mensal estimado:\nMelhor horário para conversar:',
  },
};