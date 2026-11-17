import type { LandingLocale } from './types';

export type BlogCopy = {
  seoTitle: string;
  seoDescription: string;
  collectionName: string;
  collectionDescription: string;
  breadcrumbHome: string;
  breadcrumbBlog: string;
  backToSite: string;
  allArticles: string;
  forMerchants: string;
  indexTitle: string;
  indexSubtitle: string;
  minRead: string;
  readArticle: string;
  keepReading: string;
  quickAnswer: string;
  faqHeading: string;
  published: string;
  updated: string;
  articleLanguageNote?: string;
};

const en: BlogCopy = {
  seoTitle: 'Omafit Blog — virtual try-on, Shopify & reducing returns',
  seoDescription:
    'Guides for fashion merchants: AI virtual try-on, MediaPipe sizing, AR for accessories, and PDP conversion on Shopify.',
  collectionName: 'Omafit Blog — fashion, try-on & e-commerce',
  collectionDescription:
    'Articles on virtual try-on, Shopify, body measurement, AR, and reducing returns for fashion stores.',
  breadcrumbHome: 'Home',
  breadcrumbBlog: 'Blog',
  backToSite: 'Back to site',
  allArticles: 'All articles',
  forMerchants: 'For merchants',
  indexTitle: 'Omafit Blog',
  indexSubtitle: 'Virtual try-on, the right size, and PDP conversion—written for Shopify fashion brands.',
  minRead: 'min read',
  readArticle: 'Read article →',
  keepReading: 'Keep reading',
  quickAnswer: 'Quick answer:',
  faqHeading: 'Frequently asked questions',
  published: 'Published',
  updated: 'Updated',
};

const pt: BlogCopy = {
  seoTitle: 'Blog Omafit — try-on virtual, Shopify e menos devoluções',
  seoDescription:
    'Guias para lojistas de moda: try-on com IA, MediaPipe, AR para acessórios e conversão no Shopify.',
  collectionName: 'Blog Omafit — moda, try-on e e-commerce',
  collectionDescription:
    'Artigos sobre try-on virtual, Shopify, medição corporal, AR e redução de devoluções em moda.',
  breadcrumbHome: 'Início',
  breadcrumbBlog: 'Blog',
  backToSite: 'Voltar ao site',
  allArticles: 'Todos os artigos',
  forMerchants: 'Para lojistas',
  indexTitle: 'Blog Omafit',
  indexSubtitle:
    'Try-on virtual, tamanho certo e conversão no PDP — conteúdo para marcas de moda na Shopify.',
  minRead: 'min de leitura',
  readArticle: 'Ler artigo →',
  keepReading: 'Continue lendo',
  quickAnswer: 'Resposta rápida:',
  faqHeading: 'Perguntas frequentes',
  published: 'Publicado',
  updated: 'Atualizado',
  articleLanguageNote:
    'Os artigos abaixo estão em inglês; estamos expandindo versões em português.',
};

const es: BlogCopy = {
  seoTitle: 'Blog Omafit — try-on virtual, Shopify y menos devoluciones',
  seoDescription:
    'Guías para comercios de moda: try-on con IA, MediaPipe, AR para accesorios y conversión en Shopify.',
  collectionName: 'Blog Omafit — moda, try-on y ecommerce',
  collectionDescription:
    'Artículos sobre try-on virtual, Shopify, medición corporal, AR y reducción de devoluciones.',
  breadcrumbHome: 'Inicio',
  breadcrumbBlog: 'Blog',
  backToSite: 'Volver al sitio',
  allArticles: 'Todos los artículos',
  forMerchants: 'Para comercios',
  indexTitle: 'Blog Omafit',
  indexSubtitle:
    'Try-on virtual, talla correcta y conversión en el PDP — para marcas de moda en Shopify.',
  minRead: 'min de lectura',
  readArticle: 'Leer artículo →',
  keepReading: 'Sigue leyendo',
  quickAnswer: 'Respuesta rápida:',
  faqHeading: 'Preguntas frecuentes',
  published: 'Publicado',
  updated: 'Actualizado',
  articleLanguageNote: 'Los artículos siguen están en inglés; pronto habrá versiones en español.',
};

export const blogCopy: Record<LandingLocale, BlogCopy> = { pt, en, es };