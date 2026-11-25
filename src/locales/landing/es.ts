import type { LandingCopy } from './types';

export const es: LandingCopy = {
  htmlLang: 'es',
  ogLocale: 'es_ES',
  seo: {
    title: 'Omafit — Asistente de moda con IA para e-commerce | Tallas y try-on',
    description:
      'Omafit es el asistente de IA en la página de producto: talla correcta, try-on fotorrealista y asesoría de estilo en un widget integrable. Lo implementamos en cualquier tienda de moda. Desde US$ 99/mes.',
    keywords:
      'Omafit, e-commerce moda, try-on virtual, IA moda, recomendación de talla, tienda online, reducir devoluciones, MediaPipe, widget, stylist IA',
  },
  nav: {
    solution: 'Solución',
    features: 'Funciones',
    pricing: 'Datos',
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
          'Omafit es el asistente de compra con IA en las páginas de producto de tu tienda. Responde “¿cuál es mi talla?”, “¿cómo me queda?” y “¿con qué lo combino?” — para que compren con confianza y devuelvan menos. Lo implementamos en cualquier tienda online.',
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
      'E-commerce de moda',
      'Try-on con IA',
      'MediaPipe',
      'En el PDP',
      'Menos devoluciones',
      'Más conversión',
      'Widget white-label',
      'Stylist IA',
      'Ropa y calzado',
      'Cualquier tienda',
    ],
  },
  pain: {
    tag: 'El problema',
    title: 'Tu marca invierte para vender.',
    titleMuted: 'Las dudas de talla pueden comprometer el resultado.',
    body:
      'Cuando el cliente no sabe qué talla elegir o cómo le va a quedar la prenda, la compra puede no ocurrir. Y cuando la pieza no cumple la expectativa, la devolución consume margen con logística inversa, reembolso y stock que no está disponible para una nueva venta.',
    close:
      'Omafit ayuda a tu marca a reducir la incertidumbre en el recorrido de compra — con más confianza para elegir y más oportunidades de convertir.',
  },
  how: {
    tag: 'Cómo funciona',
    title: 'De la talla a la compra, en el mismo lugar.',
    lead:
      'Omafit vive en la página de producto de tu tienda. El comprador no descarga una app ni sale de tu sitio. En el mismo flujo obtiene la talla, se ve con la prenda y recibe combinaciones de tu catálogo — y entonces decide comprar.',
    steps: [
      {
        title: 'Empieza en la página de producto',
        body: 'El probador Omafit aparece en la página de producto, personalizado con la identidad de tu marca. El cliente elige cuándo probarse.',
      },
      {
        title: 'Encuentra la talla correcta',
        body: 'Con una captura rápida en el móvil, Omafit analiza las medidas del cliente y recomienda la talla más adecuada para esa prenda, sin cinta métrica ni prueba y error.',
      },
      {
        title: 'Visualiza el look',
        body: 'La IA crea una vista previa realista de la prenda en el propio cliente, para que compre con más seguridad.',
      },
      {
        title: 'Descubre combinaciones',
        body: 'El asistente entiende el catálogo y sugiere piezas que combinan con la elección del cliente: recomendaciones relevantes que pueden completar el pedido.',
      },
    ],
  },
  solution: {
    tag: 'La solución',
    title: 'Omafit: inteligencia que convierte ',
    titleAccent: 'la duda en confianza',
    titleEnd: ' y ventas.',
    sub:
      'Un asistente para e-commerce de moda: talla, try-on y styling en el PDP, con tu marca. Implementamos Omafit en cualquier tienda — plataforma estándar o stack a medida.',
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
        bullets: ['Ropa mujer y hombre', 'Calzado en el mismo flujo', 'Calidad fotográfica en móvil'],
      },
      {
        title: 'Un flujo en la página de producto',
        description:
          'Omafit está donde se decide la compra: el PDP. El comprador pasa de talla a try-on a styling sin apps ni redirecciones; tú mantienes el journey en tu tienda.',
        bullets: ['Widget para tu tienda', 'Journey mobile-first', 'White-label y on-brand'],
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
        bullets: ['100% white-label', 'Cualquier tienda', 'Mobile-first'],
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
  insights: {
    title: 'Conoce a quien compra tu marca.',
    lead:
      'Conoce exactamente quién compra tu marca y sus medidas. Tu marca podrá decidir modelajes, stock y colecciones con datos y sin suposiciones.',
    exampleNote: 'Cifras de ejemplo, con la forma que la marca ve en el panel.',
    averagesTitle: 'Perfil medio de quien se prueba',
    averages: [
      { label: 'Altura media', value: '1,68 m' },
      { label: 'Peso medio', value: '64 kg' },
      { label: 'Biotipo más común', value: 'Reloj de arena · 34%' },
    ],
    sizeChartTitle: 'Talla más elegida',
    sizeChartName: 'Participación de recomendaciones aceptadas',
    sizes: [
      { label: 'XS', share: 8 },
      { label: 'S', share: 18 },
      { label: 'M', share: 41 },
      { label: 'L', share: 23 },
      { label: 'XL', share: 10 },
    ],
    tableTitle: 'Prendas que más pasan por el probador',
    colGarment: 'Prenda',
    colTries: 'Pruebas',
    colSize: 'Talla más elegida',
    rows: [
      { garment: 'Vestido midi', tries: '1.280', size: 'M' },
      { garment: 'Pantalón recto', tries: '980', size: '38' },
      { garment: 'Camisa oversized', tries: '860', size: 'L' },
      { garment: 'Zapatilla casual', tries: '640', size: '37' },
    ],
  },
  closing: {
    title: 'Mira Omafit en tu tienda.',
    lead: 'En una conversación, mostramos cómo tu cliente encuentra la talla correcta, visualiza la prenda y descubre qué combina, directo en la página de producto.',
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
        q: '¿Cuánto tarda instalar Omafit en mi tienda?',
        a: 'Normalmente menos de 5 minutos. Integra Omafit en tu e-commerce, actívalo en las páginas de producto y personaliza colores, fuentes y posición desde el panel.',
      },
      {
        q: '¿Qué plataformas soporta Omafit?',
        a: 'Implementamos Omafit en cualquier tienda de moda — SaaS, marketplace o headless. Hay conectores para los stacks más usados; Nuvemshop, WooCommerce, Yampi y más en roadmap. Para ERP, apps nativas o integración custom, Enterprise define tu proyecto.',
      },
      {
        q: '¿Cómo manejan privacidad y seguridad?',
        a: 'Alineados con LGPD y GDPR. MediaPipe corre en el dispositivo del comprador cuando es posible — sin subir imagen bruta sin consentimiento. Solo métricas anónimas necesarias.',
      },
      {
        q: '¿La IA sirve para todos los productos?',
        a: 'Sí. Omafit cubre ropa mujer y hombre y calzado, con tallas y try-on pensados para PDPs de moda. Para catálogos de nicho o marca propia, hablamos de fine-tune dedicado.',
      },
      {
        q: '¿Cómo funciona la facturación por sesión?',
        a: 'Empezar en plataformas compatibles es gratis. Growth: US$ 99/mes — 1.000 sesiones. Pro: US$ 399 — 5.000. Scale: US$ 999 — 15.000. Enterprise: a consultar, sesiones ilimitadas. Growth, Pro y Scale: 14 días de prueba.',
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
      'Asistente de IA para e-commerce de moda: talla, try-on y styling en la página de producto — menos devoluciones, compradores más seguros.',
    product: 'Producto',
    support: 'Soporte',
    company: 'Empresa',
    solution: 'Solución',
    features: 'Funciones',
    pricing: 'Datos',
    shopifyApp: 'Instalar el widget',
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
    subtitle: 'Lo implementamos en cualquier tienda. Empieza aquí:',
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