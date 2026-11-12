export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
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
  description: string;
  publishedAt: string;
  updatedAt: string;
  keywords: string[];
  readingTimeMinutes: number;
  blocks: BlogBlock[];
  faqs: BlogFaq[];
};
