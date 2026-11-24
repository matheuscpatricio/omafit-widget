import type { LandingCopy } from './types';

export const pt: LandingCopy = {
  htmlLang: 'pt-BR',
  ogLocale: 'pt_BR',
  seo: {
    title: 'Omafit — Assistente de moda com IA para e-commerce | Tamanho e try-on',
    description:
      'O Omafit é o assistente de IA na página do produto: tamanho certo, try-on fotorealista e consultoria de estilo em um widget embedável. Implementamos em qualquer loja de moda. A partir de US$ 99/mês.',
    keywords:
      'Omafit, e-commerce moda, provador virtual, try-on IA, recomendação de tamanho, loja online, reduzir devoluções, MediaPipe, widget, stylist IA',
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
          'O Omafit é o assistente de compra com IA nas páginas de produto da sua loja. Ele responde “qual é o meu tamanho?”, “como fica em mim?” e “o que combina?” — para o cliente comprar com confiança e devolver menos. Implementamos em qualquer loja online.',
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
      'E-commerce de moda',
      'Try-on com IA',
      'MediaPipe',
      'Na página do produto',
      'Menos devoluções',
      'Mais conversão',
      'Widget white-label',
      'Stylist IA',
      'Vestuário e calçados',
      'Qualquer loja',
    ],
  },
  pain: {
    tag: 'O problema',
    title: 'Sua marca investe para vender.',
    titleMuted: 'Dúvidas sobre tamanho podem comprometer o resultado.',
    body:
      'Quando o cliente não sabe qual tamanho escolher ou como a peça vai vestir, a compra pode não acontecer. E quando a peça não atende à expectativa, a devolução consome margem com logística reversa, reembolso e estoque indisponível para nova venda.',
    close:
      'Omafit ajuda sua marca a reduzir a incerteza na jornada de compra — com mais confiança para escolher e mais oportunidades de converter.',
  },
  how: {
    tag: 'Como funciona',
    title: 'Do tamanho à compra, no mesmo lugar.',
    lead:
      'O Omafit fica na página do produto da sua loja. O cliente não baixa aplicativo e não sai do site. No mesmo fluxo ele descobre o tamanho, vê a peça no próprio corpo e recebe combinações do seu catálogo — e só então decide comprar.',
    steps: [
      {
        title: 'Começa na página do produto',
        body: 'O provador Omafit aparece na página do produto, personalizado com a identidade da sua marca. O cliente escolhe quando experimentar.',
      },
      {
        title: 'Encontra o tamanho certo',
        body: 'Com uma captura rápida pelo celular, o Omafit analisa as medidas do cliente e recomenda o tamanho mais adequado para aquela peça, sem fita métrica nem tentativa e erro.',
      },
      {
        title: 'Visualiza o look',
        body: 'A IA cria uma prévia realista da roupa no próprio cliente, para ele ter mais segurança antes de comprar.',
      },
      {
        title: 'Descobre combinações',
        body: 'O assistente entende o catálogo e sugere peças que combinam com a escolha do cliente, recomendações relevantes, que podem complementar o pedido.',
      },
    ],
  },
  solution: {
    tag: 'A solução',
    title: 'Omafit: inteligência que transforma ',
    titleAccent: 'dúvida em confiança',
    titleEnd: ' e vendas.',
    sub:
      'Um assistente para e-commerce de moda: tamanho, try-on e styling no PDP, com a cara da sua marca. Implementamos o Omafit em qualquer loja — plataforma pronta ou stack sob medida.',
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
        bullets: ['Moda feminina e masculina', 'Calçados no mesmo fluxo', 'Qualidade fotográfica no mobile'],
      },
      {
        title: 'Um fluxo na página do produto',
        description:
          'O Omafit fica onde a decisão acontece — no PDP. O cliente passa de tamanho a try-on a styling sem apps extras nem redirecionamentos; você mantém a jornada na loja.',
        bullets: ['Widget para sua loja', 'Jornada mobile-first', 'White-label e on-brand'],
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
        bullets: ['100% white-label', 'Qualquer loja', 'Mobile-first'],
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
        q: 'Quanto tempo leva para instalar o Omafit na minha loja?',
        a: 'Em geral, menos de 5 minutos. Integre o Omafit ao seu e-commerce, ative nas páginas de produto e ajuste cores, fontes e posição pelo painel.',
      },
      {
        q: 'Quais plataformas o Omafit suporta?',
        a: 'Implementamos o Omafit em qualquer loja de moda — SaaS, marketplace ou headless. Há conectores para os stacks mais usados; Nuvemshop, WooCommerce, Yampi e outras estão no roadmap. Para ERP, apps nativos ou integração custom, o plano Enterprise escopo seu projeto.',
      },
      {
        q: 'Como vocês tratam privacidade e segurança?',
        a: 'Alinhados à LGPD e GDPR. O MediaPipe roda no dispositivo do comprador quando possível — sem enviar imagem bruta sem consentimento. Guardamos só métricas anônimas necessárias.',
      },
      {
        q: 'A IA serve para todos os tipos de produto?',
        a: 'Sim. O Omafit cobre moda feminina e masculina e calçados, com tamanho e try-on pensados para PDPs de moda. Para catálogos de nicho ou marcas próprias, conversamos sobre fine-tune dedicado.',
      },
      {
        q: 'Como funciona a cobrança por sessão?',
        a: 'Começar nas plataformas suportadas é gratuito. Growth: US$ 99/mês — 1.000 sessões. Pro: US$ 399 — 5.000. Scale: US$ 999 — 15.000. Enterprise: sob consulta, sessões ilimitadas. Growth, Pro e Scale têm 14 dias de teste.',
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
      'Assistente de IA para e-commerce de moda: tamanho, try-on e styling na página do produto — menos devoluções, compradores mais confiantes.',
    product: 'Produto',
    support: 'Suporte',
    company: 'Empresa',
    solution: 'Solução',
    features: 'Recursos',
    pricing: 'Planos',
    shopifyApp: 'Instalar o widget',
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
    subtitle: 'Implementamos em qualquer loja. Comece por aqui:',
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