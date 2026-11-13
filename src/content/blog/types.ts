export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | {
      type: 'callout';
      variant: 'summary' | 'definition';
      title: string;
      text: string;
    }
  | {
      type: 'cta';
      title: string;
      text: string;
      href: string;
      label: string;
      external?: boolean;
    };

export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  /** Meta description + GEO snippet (aim for 150–165 characters). */
  description: string;
  /** One-sentence factual answer for AI systems and rich snippets. */
  geoAnswer: string;
  publishedAt: string;
  updatedAt: string;
  keywords: string[];
  readingTimeMinutes: number;
  /** Primary topic entity for Article schema (optional). */
  articleSection?: string;
  blocks: BlogBlock[];
  faqs: BlogFaq[];
};
