import type { LandingCopy } from './types';

export const es: LandingCopy = {
  htmlLang: 'es',
  ogLocale: 'es_ES',
  seo: {
    title: 'Omafit — Asistente de moda con IA para Shopify | Try-on, tallas y AR',
    description:
      'Reduce devoluciones y sube conversión con try-on fotorrealista, MediaPipe, AR para accesorios y widget Shopify. Planes desde US$ 99/mes.',
    keywords:
      'Omafit, Shopify, try-on virtual, IA moda, ecommerce, reducir devoluciones, MediaPipe, gafas AR, widget Shopify',
  },
  nav: {
    solution: 'Solución',
    features: 'Funciones',
    pricing: 'Precios',
    faq: 'FAQ',
    blog: 'Blog',
    partners: 'Socios',
    install: 'Instalar',
  },
  lang: { label: 'Idioma', pt: 'Português', en: 'English', es: 'Español' },
  hero: {
    slides: [
      {
        id: 'intro',
        badge: 'Omafit',
        titleKind: 'intro',
        titleBefore: 'Menos devoluciones por talla. Más ',
        titleHighlight: 'confianza',
        titleAfter: ' en moda online.',
        body:
          'Omafit es el asistente inteligente que usa IA fotorrealista y medición precisa para el ajuste correcto en ropa, calzado y accesorios. Reduce costos, vende más y fideliza compradores.',
        hideBadge: true,
        compact: true,
        showCtas: true,
        subtleOverlay: true,
      },
      {
        id: 'fit',
        badge: 'Talla precisa',
        titleKind: 'mediapipe',
        titleBefore: 'La talla correcta con ',
        titleHighlight: 'MediaPipe',
        titleAfter: '.',
        body: 'Nuestra tecnología de detección corporal analiza al comprador y recomienda la talla ideal.',
        topScrim: true,
        imageObjectPosition: 'top',
      },
      {
        id: 'chat-aov',
        badge: 'Chat integrado',
        titleKind: 'aov',
        titleBefore: 'Un asesor de estilo que eleva el ',
        titleHighlight: 'valor medio del pedido',
        titleAfter: '.',
        body:
          'Cuando el comprador prueba un producto, Omafit sugiere piezas complementarias para aumentar el AOV.',
        topScrim: true,
      },
    ],
    install: 'Instalar',
    demo: 'Reservar demo personalizada',
    slideAria: (n) => `Ir a la diapositiva ${n}`,
    marquee: [
      'Shopify',
      'Try-on con IA',
      'MediaPipe',
      'WebAR',
      'Menos devoluciones',
      'Más conversión',
      'Widget white-label',
      'ChatGPT',
      'Ropa y calzado',
      'Accesorios AR',
    ],
  },
  pain: {
    tag: 'El problema',
    title: 'Tu tienda se ve increíble.',
    titleMuted: 'Aun así pierdes margen por estas razones.',
    body:
      'Las devoluciones por talla o ajuste erosionan el margen: envío inverso, reembolsos y stock de vuelta al estante cuestan caro — y el cliente puede no volver. En el checkout, la duda de talla es un motivo clave de abandono. Sin confianza en la compra, el carrito se frena y el tráfico pagado no se convierte en ingresos estables.',
  },
  solution: {
    tag: 'La solución',
    title: 'Omafit: inteligencia que convierte ',
    titleAccent: 'la duda en confianza',
    titleEnd: ' y ventas.',
    sub: 'Suite visual con IA para ropa, accesorios y calzado. Instalación rápida en tu tienda.',
    highlight: 'Destacado',
    featureBadge: 'Función',
    features: [
      {
        title: 'Talla precisa con MediaPipe',
        description:
          'Análisis en tiempo real de más de 50 puntos del cuerpo en el móvil. Sin cinta métrica, sin adivinar.',
        bullets: ['98% de precisión', 'Captura en <10s', '100% en el dispositivo'],
        accent: true,
      },
      {
        title: 'Try-on fotorrealista (ropa y calzado)',
        description:
          'La IA renderiza la prenda en el comprador con sombra, tejido y caída realistas. Lo ven antes de comprar.',
        bullets: ['Ropa mujer y hombre', 'Calzado y accesorios en un flujo', 'Calidad fotográfica'],
      },
      {
        title: 'Vista AR (gafas y accesorios)',
        description: 'Realidad aumentada en el navegador para gafas, pulseras, relojes y más. Sin app.',
        bullets: ['WebAR—sin instalar app', 'Seguimiento facial en tiempo real', 'iOS y Android'],
      },
      {
        title: 'Asistente ChatGPT integrado',
        description: 'Asesor de estilo 24/7 que conoce tu catálogo, responde dudas y sugiere looks.',
        bullets: ['Conoce tu catálogo', 'Sugiere looks completos', 'Con la voz de tu marca'],
      },
      {
        title: 'Analytics y ROI',
        description:
          'Paneles que vinculan el widget con resultados: ROI e insights agregados — siempre anónimos.',
        bullets: [
          'Modelos de ROI para conversión, AOV y devoluciones',
          'Insights de altura, peso y tipo corporal',
          'Embudo de engagement y sesiones try-on',
        ],
      },
      {
        title: 'Widget personalizable',
        description:
          'Colores, fuentes, layout y textos alineados a tu marca. Parece nativo — no un plugin ajeno.',
        bullets: ['100% white-label', 'Instalación en minutos', 'Mobile-first'],
      },
    ],
  },
  impact: {
    tag: 'Datos Omafit',
    title: 'Resultados que marcas como la tuya ven en el día a día.',
    stat1Prefix: 'Hasta ',
    stat1Suffix: ' menos devoluciones',
    stat1Sub: 'Menos logística inversa, más margen y clientes que repiten con confianza.',
    stat2Prefix: 'Quien usa Omafit tiene ',
    stat2Suffix: ' más probabilidad de comprar',
    stat2Sub: 'Talla guiada y visualización que desbloquea el checkout.',
    stat3Prefix: 'Abandono de carrito ',
    stat3Suffix: ' menor',
    stat3Sub: 'Menos duda de talla y look — más compras completadas.',
    disclaimer:
      'Métricas agregadas de tiendas con Omafit; tus resultados varían según catálogo, tráfico y categoría.',
  },
  pricing: {
    tag: 'Precios transparentes',
    title: 'Elige el plan que ',
    titleAccent: 'impulsa',
    titleEnd: ' tu crecimiento.',
    subBefore: 'Facturación mensual o anual. Growth, Pro y Scale incluyen ',
    trialDays: 'prueba de 14 días',
    subAfter: '. Paquetes con tallas, try-on fotorrealista y asistente de estilo.',
    popular: 'Popular',
    trialFree: (d) => `${d} días gratis`,
    customContract: 'Contrato a medida',
    perMo: '/mes',
    perYr: '/año',
    sessionUnlimited: 'Sesiones try-on ilimitadas',
    sessionPerMonth: (n) => `${n} sesiones try-on/mes`,
    startTrial: (d) => `Iniciar prueba de ${d} días`,
    talkSales: 'Hablar con ventas',
    billingQuestion: '¿Preguntas sobre facturación o volumen?',
    whatsapp: 'Escríbenos por WhatsApp',
    plans: {
      growth: {
        tagline: 'Para marcas que empiezan con try-on virtual con volumen estable.',
        features: [
          '1.000 sesiones try-on/mes',
          'Recomendación de talla personalizada',
          'Asistente de compras con IA',
          'Diseño de widget personalizable',
          'Extras a US$ 0,12 cada uno',
        ],
      },
      pro: {
        tagline: 'Volumen predecible y herramientas de estilo para tiendas en crecimiento.',
        features: [
          '5.000 sesiones try-on/mes',
          'Recomendación de talla personalizada',
          'Stylist y looks con IA',
          'Widget personalizable',
          'Extras a US$ 0,08 cada uno',
        ],
      },
      scale: {
        tagline: 'Alto volumen, analytics y styling para catálogos serios.',
        features: [
          '15.000 sesiones try-on/mes',
          'Widget totalmente personalizable',
          'Stylist y looks con IA',
          'Analytics e insights',
          'Extras a US$ 0,04 cada uno',
        ],
      },
      enterprise: {
        tagline: 'Try-on ilimitado y soporte dedicado para grandes operaciones.',
        features: [
          'Sesiones try-on ilimitadas',
          'Widget totalmente personalizable',
          'Stylist y looks con IA',
          'Soporte dedicado',
          'Analytics e insights',
        ],
      },
    },
  },
  faq: {
    tag: 'Preguntas respondidas',
    title: 'Preguntas frecuentes.',
    sub: 'Instalación, seguridad, integración y soporte — lo que debes saber.',
    items: [
      {
        q: '¿Cuánto tarda instalar Omafit en Shopify?',
        a: 'Unos clics en la Shopify App Store — normalmente menos de 5 minutos. Luego el widget aparece en producto y puedes ajustar colores, fuentes y posición en el admin.',
      },
      {
        q: '¿Qué plataformas soporta Omafit?',
        a: 'Hoy integración nativa con Shopify. Nuvemshop, WooCommerce y Yampi en roadmap. Para ERP, headless o apps, el equipo Enterprise puede ayudar.',
      },
      {
        q: '¿Cómo manejan privacidad y seguridad?',
        a: 'Alineados con LGPD y GDPR. MediaPipe corre en el dispositivo del comprador cuando es posible — sin subir imagen bruta sin consentimiento. Solo métricas anónimas necesarias.',
      },
      {
        q: '¿La IA sirve para todos los productos?',
        a: 'Sí: ropa mujer y hombre, calzado y accesorios AR (gafas, gorras, relojes). Categorías muy específicas pueden tener fine-tune dedicado.',
      },
      {
        q: '¿Cómo funciona la facturación por sesión?',
        a: 'Instalar en Shopify es gratis. Growth: US$ 99/mes — 1.000 sesiones. Pro: US$ 399 — 5.000. Scale: US$ 999 — 15.000. Enterprise: US$ 2.499 — ilimitado. Growth, Pro y Scale: 14 días de prueba.',
      },
      {
        q: '¿Omafit ralentiza mi tienda?',
        a: 'El widget se carga bajo demanda; el bundle inicial <50KB. El procesamiento empieza solo al pulsar probar.',
      },
      {
        q: '¿Qué soporte hay tras instalar?',
        a: 'Todos los planes: docs, tutoriales y email. Pro y Scale: onboarding guiado. Enterprise: soporte dedicado y SLA.',
      },
      {
        q: '¿Puedo personalizar el widget a mi marca?',
        a: 'Totalmente: colores, fuentes, layout, textos, botones y posición. Sin “Powered by Omafit” para el cliente final.',
      },
    ],
  },
  footer: {
    blurb:
      'Asistente de IA fotorrealista para ropa, calzado y accesorios. Talla precisa, try-on realista, menos devoluciones.',
    product: 'Producto',
    support: 'Soporte',
    company: 'Empresa',
    solution: 'Solución',
    features: 'Funciones',
    pricing: 'Precios',
    shopifyApp: 'App Shopify',
    faq: 'FAQ',
    contact: 'Contacto',
    blog: 'Blog',
    partners: 'Socios',
    privacy: 'Privacidad',
    terms: 'Términos',
    rights: 'Todos los derechos reservados.',
    madeIn: 'Hecho con cuidado en São Paulo, Brasil',
    homeAria: 'Omafit — inicio',
    instagramAria: 'Omafit en Instagram',
  },
  installModal: {
    title: 'Instalar Omafit',
    subtitle: 'Elige tu plataforma',
    close: 'Cerrar',
    shopify: 'Shopify',
    shopifyHint: 'Instalar desde App Store',
    nuvemSoon: 'Nuvemshop — próximamente',
  },
  demoEmail: {
    subject: 'Demo personalizada Omafit',
    body:
      'Hola, me gustaría agendar una demo de Omafit para mi tienda.\n\nNombre de la tienda:\nCategoría (ropa / calzado / accesorios):\nVolumen mensual estimado:\nMejor horario para una llamada:',
  },
};