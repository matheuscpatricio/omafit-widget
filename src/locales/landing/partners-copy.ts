import type { LandingLocale } from './types';

export type PartnersBenefit = { title: string; description: string };
export type PartnersStep = { step: string; title: string; body: string };

export type PartnersCopy = {
  seo: { title: string; description: string };
  back: string;
  tag: string;
  h1: string;
  heroBefore: string;
  heroEmphasis: string;
  heroAfter: string;
  revenueTitle: string;
  revenueBodyBefore: string;
  revenueEmphasis: string;
  revenueBodyAfter: string;
  revenueBullets: string[];
  benefitsTitle?: string;
  benefits: PartnersBenefit[];
  stepsTitle: string;
  steps: PartnersStep[];
  ecosystemTitle: string;
  ecosystemBeforeLink: string;
  ecosystemAfterMiko: string;
  ecosystemAfterEmphasis: string;
  talkTitle: string;
  talkDesc: string;
  contactFormHint: string;
  contactFormLink: string;
  sentTitle: string;
  sentDesc: string;
  formTitle: string;
  agencyName: string;
  agencyNamePh: string;
  contactName: string;
  contactNamePh: string;
  workEmail: string;
  workEmailPh: string;
  website: string;
  websitePh: string;
  message: string;
  messagePh: string;
  submitting: string;
  submit: string;
  privacyPrefix: string;
  privacyLink: string;
  mailSubject: string;
  mailSubjectForm: (agency: string) => string;
  mailLines: { agency: string; contact: string; email: string; website: string; message: string };
};

const en: PartnersCopy = {
  seo: {
    title: 'Agency & Partner Program — Revenue Share | Omafit',
    description:
      'Ecommerce agencies partner with Omafit on a revenue-share model. Shopify virtual try-on and AI sizing for your merchant portfolio.',
  },
  back: 'Back to home',
  tag: 'Agency program',
  h1: 'Partner with Omafit',
  heroBefore: 'Built for ecommerce agencies on Shopify. We work on a ',
  heroEmphasis: 'revenue share',
  heroAfter:
    ' model — you bring merchants, we share recurring subscription revenue when they subscribe through your partnership.',
  revenueTitle: 'Revenue share, stated clearly',
  revenueBodyBefore: 'Omafit does not charge agencies a platform fee to join. Instead, we align on a ',
  revenueEmphasis: 'percentage of paid merchant revenue',
  revenueBodyAfter:
    ' attributed to your agency (referrals, installs you manage, or co-branded onboarding). Payouts are recurring while the merchant stays on a paid plan — so your upside grows with client retention, not just the first install.',
  revenueBullets: [
    'Transparent attribution and reporting',
    'No upfront partner buy-in',
    'Scales across your merchant book',
    'Fashion, footwear, and accessories focus',
  ],
  benefits: [
    {
      title: 'Revenue share',
      description:
        'Earn a recurring share of subscription revenue from merchants you refer or onboard. Terms are transparent and agreed upfront.',
    },
    {
      title: 'Shopify-native fit',
      description:
        'One-click install from the Shopify App Store, merchant-friendly onboarding, and positioning that complements your theme and CRO work.',
    },
    {
      title: 'Partner enablement',
      description:
        'Demo assets, talk tracks for reducing returns, and priority responses for your agency team when you bring a merchant live.',
    },
    {
      title: 'Co-selling motion',
      description:
        'Joint outreach for pilot stores, case studies, and launches — built for agencies that manage multiple ecommerce accounts.',
    },
  ],
  stepsTitle: 'How we onboard partners',
  steps: [
    {
      step: '01',
      title: 'Introduce your agency',
      body: 'Tell us about your portfolio (Shopify Plus, DTC, fashion, footwear, accessories) and how you work with merchants.',
    },
    {
      step: '02',
      title: 'Align on revenue share',
      body: 'We agree on referral attribution, payout cadence, and support boundaries before any merchant goes live.',
    },
    {
      step: '03',
      title: 'Launch with merchants',
      body: 'Install Omafit on client stores, measure try-on and sizing impact, and grow recurring partner revenue with us.',
    },
  ],
  ecosystemTitle: 'Agencies in our ecosystem',
  ecosystemBeforeLink: 'We collaborate with Shopify specialists who ship for serious merchants. ',
  ecosystemAfterMiko:
    ' — the native Shopify app studio from Tripster Developers (Shopify Plus partner since 2016) — builds wholesale, loyalty, and growth apps used by thousands of stores. Agencies like Miko and Tripster serve the same brands that benefit from AI try-on and sizing; our partner program is designed to fit alongside your app stack and services, with shared ',
  ecosystemAfterEmphasis: ' when you introduce Omafit to your clients.',
  talkTitle: 'Talk to partnerships',
  talkDesc:
    'Share your agency profile and we will reply within two business days with next steps and revenue-share terms.',
  contactFormHint: 'Prefer the general contact form?',
  contactFormLink: 'Contact page',
  sentTitle: 'Request sent',
  sentDesc:
    'Your email client should open with the partnership details. We will follow up shortly.',
  formTitle: 'Apply for the partner program',
  agencyName: 'Agency name *',
  agencyNamePh: 'Your agency',
  contactName: 'Contact name *',
  contactNamePh: 'Full name',
  workEmail: 'Work email *',
  workEmailPh: 'you@agency.com',
  website: 'Agency website *',
  websitePh: 'https://',
  message: 'Message *',
  messagePh:
    'Merchant verticals, countries you serve, expected referral volume, and questions about revenue share…',
  submitting: 'Opening email…',
  submit: 'Send partnership request',
  privacyPrefix: 'By submitting, you agree to our',
  privacyLink: 'Privacy Policy',
  mailSubject: 'Omafit agency partnership',
  mailSubjectForm: (agency) => `Omafit agency partnership — ${agency}`,
  mailLines: {
    agency: 'Agency',
    contact: 'Contact',
    email: 'Email',
    website: 'Website',
    message: 'Message',
  },
};

const pt: PartnersCopy = {
  seo: {
    title: 'Programa de Parceiros — Revenue Share | Omafit',
    description:
      'Agências de ecommerce parceiras do Omafit com modelo de revenue share. Try-on virtual e IA de tamanhos na Shopify.',
  },
  back: 'Voltar ao início',
  tag: 'Programa de agências',
  h1: 'Seja parceiro Omafit',
  heroBefore: 'Feito para agências de ecommerce na Shopify. Trabalhamos com ',
  heroEmphasis: 'revenue share',
  heroAfter:
    ': você traz lojistas, nós compartilhamos a receita recorrente das assinaturas atribuídas à sua parceria.',
  revenueTitle: 'Revenue share, explicado com clareza',
  revenueBodyBefore:
    'O Omafit não cobra taxa de entrada para agências. Alinhamos um ',
  revenueEmphasis: 'percentual da receita paga do lojista',
  revenueBodyAfter:
    ' atribuída à sua agência (indicação, instalação que você gerencia ou onboarding co-branded). O repasse é recorrente enquanto o cliente permanecer no plano pago — seu ganho cresce com a retenção, não só na primeira instalação.',
  revenueBullets: [
    'Atribuição e relatórios transparentes',
    'Sem investimento inicial de parceiro',
    'Escala na sua carteira de lojas',
    'Foco em moda, calçados e acessórios',
  ],
  benefits: [
    {
      title: 'Revenue share',
      description:
        'Participação recorrente na assinatura dos lojistas que você indica ou implementa. Termos claros desde o início.',
    },
    {
      title: 'Nativo na Shopify',
      description:
        'Instalação pela App Store, onboarding amigável e posicionamento que complementa tema e CRO.',
    },
    {
      title: 'Enablement de parceiro',
      description:
        'Materiais de demo, talk tracks sobre devoluções e respostas prioritárias quando você publica uma loja.',
    },
    {
      title: 'Co-venda',
      description:
        'Pilotos, cases e lançamentos conjuntos — para agências com várias contas de ecommerce.',
    },
  ],
  stepsTitle: 'Como onboardamos parceiros',
  steps: [
    {
      step: '01',
      title: 'Apresente sua agência',
      body: 'Conte sobre seu portfólio (Shopify Plus, DTC, moda, calçados, acessórios) e como você atende lojistas.',
    },
    {
      step: '02',
      title: 'Alinhar revenue share',
      body: 'Definimos atribuição, cadência de repasse e limites de suporte antes de qualquer loja ir ao ar.',
    },
    {
      step: '03',
      title: 'Lançar com lojistas',
      body: 'Instale o Omafit nas lojas clientes, meça try-on e tamanho, e cresça a receita recorrente conosco.',
    },
  ],
  ecosystemTitle: 'Agências no nosso ecossistema',
  ecosystemBeforeLink: 'Trabalhamos com especialistas Shopify que entregam para marcas sérias. ',
  ecosystemAfterMiko:
    ' — estúdio de apps nativos da Tripster Developers (Shopify Plus desde 2016) — constrói wholesale, loyalty e growth para milhares de lojas. Agências como Miko e Tripster atendem as mesmas marcas que se beneficiam de try-on e tamanhos; nosso programa encaixa no seu stack, com ',
  ecosystemAfterEmphasis: ' compartilhado quando você apresenta o Omafit aos clientes.',
  talkTitle: 'Falar com parcerias',
  talkDesc:
    'Envie o perfil da agência e respondemos em até dois dias úteis com próximos passos e termos de revenue share.',
  contactFormHint: 'Prefere o formulário geral?',
  contactFormLink: 'Página de contato',
  sentTitle: 'Solicitação enviada',
  sentDesc: 'Seu cliente de e-mail deve abrir com os detalhes. Entraremos em contato em breve.',
  formTitle: 'Candidate-se ao programa de parceiros',
  agencyName: 'Nome da agência *',
  agencyNamePh: 'Sua agência',
  contactName: 'Nome do contato *',
  contactNamePh: 'Nome completo',
  workEmail: 'E-mail corporativo *',
  workEmailPh: 'voce@agencia.com',
  website: 'Site da agência *',
  websitePh: 'https://',
  message: 'Mensagem *',
  messagePh:
    'Verticais, países, volume de indicações esperado e dúvidas sobre revenue share…',
  submitting: 'Abrindo e-mail…',
  submit: 'Enviar solicitação de parceria',
  privacyPrefix: 'Ao enviar, você concorda com nossa',
  privacyLink: 'Política de Privacidade',
  mailSubject: 'Parceria de agência Omafit',
  mailSubjectForm: (agency) => `Parceria Omafit — ${agency}`,
  mailLines: {
    agency: 'Agência',
    contact: 'Contato',
    email: 'E-mail',
    website: 'Site',
    message: 'Mensagem',
  },
};

const es: PartnersCopy = {
  seo: {
    title: 'Programa de Socios — Revenue Share | Omafit',
    description:
      'Agencias ecommerce asociadas a Omafit con revenue share. Try-on virtual y tallas con IA en Shopify.',
  },
  back: 'Volver al inicio',
  tag: 'Programa de agencias',
  h1: 'Asóciate con Omafit',
  heroBefore: 'Para agencias ecommerce en Shopify. Trabajamos con ',
  heroEmphasis: 'revenue share',
  heroAfter:
    ': traes comercios, compartimos ingresos recurrentes de suscripciones atribuidas a tu alianza.',
  revenueTitle: 'Revenue share, sin letra pequeña',
  revenueBodyBefore: 'Omafit no cobra cuota de entrada a agencias. Alineamos un ',
  revenueEmphasis: 'porcentaje de los ingresos pagados del comercio',
  revenueBodyAfter:
    ' atribuido a tu agencia (referido, instalación que gestionas u onboarding co-branded). Los pagos son recurrentes mientras el cliente permanezca en plan de pago — tu upside crece con la retención, no solo con la primera instalación.',
  revenueBullets: [
    'Atribución e informes transparentes',
    'Sin compra inicial del partner',
    'Escala en tu cartera de comercios',
    'Enfoque en moda, calzado y accesorios',
  ],
  benefits: [
    {
      title: 'Revenue share',
      description:
        'Participación recurrente en la suscripción de comercios que refieres o implementas. Términos claros desde el inicio.',
    },
    {
      title: 'Nativo en Shopify',
      description:
        'Instalación desde App Store, onboarding amigable y posicionamiento que complementa tema y CRO.',
    },
    {
      title: 'Enablement de socios',
      description:
        'Demos, guiones sobre devoluciones y respuestas prioritarias al publicar una tienda.',
    },
    {
      title: 'Co-venta',
      description:
        'Pilotos, casos y lanzamientos conjuntos — para agencias con múltiples cuentas ecommerce.',
    },
  ],
  stepsTitle: 'Cómo incorporamos socios',
  steps: [
    {
      step: '01',
      title: 'Presenta tu agencia',
      body: 'Cuéntanos tu portafolio (Shopify Plus, DTC, moda, calzado, accesorios) y cómo trabajas con comercios.',
    },
    {
      step: '02',
      title: 'Alinear revenue share',
      body: 'Acordamos atribución, calendario de pagos y límites de soporte antes de publicar tiendas.',
    },
    {
      step: '03',
      title: 'Lanzar con comercios',
      body: 'Instala Omafit, mide try-on y tallas, y haz crecer ingresos recurrentes con nosotros.',
    },
  ],
  ecosystemTitle: 'Agencias en nuestro ecosistema',
  ecosystemBeforeLink: 'Colaboramos con especialistas Shopify que trabajan con marcas serias. ',
  ecosystemAfterMiko:
    ' — estudio de apps nativas de Tripster Developers (Shopify Plus desde 2016) — construye wholesale, loyalty y growth para miles de tiendas. Agencias como Miko y Tripster sirven a las mismas marcas que se benefician del try-on; nuestro programa encaja en tu stack, con ',
  ecosystemAfterEmphasis: ' compartido cuando presentas Omafit a tus clientes.',
  talkTitle: 'Hablar con partnerships',
  talkDesc:
    'Comparte el perfil de tu agencia y respondemos en dos días hábiles con próximos pasos y términos.',
  contactFormHint: '¿Prefieres el formulario general?',
  contactFormLink: 'Página de contacto',
  sentTitle: 'Solicitud enviada',
  sentDesc: 'Tu cliente de correo debería abrir con los detalles. Te contactaremos pronto.',
  formTitle: 'Solicitar el programa de socios',
  agencyName: 'Nombre de la agencia *',
  agencyNamePh: 'Tu agencia',
  contactName: 'Nombre de contacto *',
  contactNamePh: 'Nombre completo',
  workEmail: 'Correo laboral *',
  workEmailPh: 'tu@agencia.com',
  website: 'Sitio de la agencia *',
  websitePh: 'https://',
  message: 'Mensaje *',
  messagePh: 'Verticales, países, volumen esperado y dudas sobre revenue share…',
  submitting: 'Abriendo correo…',
  submit: 'Enviar solicitud de alianza',
  privacyPrefix: 'Al enviar, aceptas nuestra',
  privacyLink: 'Política de Privacidad',
  mailSubject: 'Alianza de agencia Omafit',
  mailSubjectForm: (agency) => `Alianza Omafit — ${agency}`,
  mailLines: {
    agency: 'Agencia',
    contact: 'Contacto',
    email: 'Correo',
    website: 'Sitio',
    message: 'Mensaje',
  },
};

export const partnersCopy: Record<LandingLocale, PartnersCopy> = { pt, en, es };