import { Link } from 'react-router-dom';
import type { BlogBlock, BlogFaq } from '../../content/blog/types';

type BlogArticleBodyProps = {
  blocks: BlogBlock[];
  faqs: BlogFaq[];
};

export function BlogArticleBody({ blocks, faqs }: BlogArticleBodyProps) {
  return (
  <article className="prose-oma space-y-6">
    {blocks.map((block, i) => {
      switch (block.type) {
        case 'h2':
          return (
            <h2
              key={i}
              className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight text-oma-cream first:mt-0"
            >
              {block.text}
            </h2>
          );
        case 'h3':
          return (
            <h3 key={i} className="mt-6 text-xl font-semibold text-oma-cream">
              {block.text}
            </h3>
          );
        case 'p':
          return (
            <p key={i} className="text-base leading-relaxed text-oma-muted">
              {block.text}
            </p>
          );
        case 'ul':
          return (
            <ul key={i} className="list-disc space-y-2 pl-5 text-oma-muted">
              {block.items.map((item, j) => (
                <li key={j} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          );
        case 'ol':
          return (
            <ol key={i} className="list-decimal space-y-2 pl-5 text-oma-muted">
              {block.items.map((item, j) => (
                <li key={j} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ol>
          );
        case 'callout':
          return (
            <aside
              key={i}
              className={
                block.variant === 'definition'
                  ? 'rounded-2xl border border-oma-tech/35 bg-oma-tech/10 p-5 sm:p-6'
                  : 'rounded-2xl border border-oma-accent/30 bg-oma-elevated/70 p-5 sm:p-6'
              }
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-oma-accent">
                {block.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-oma-cream">{block.text}</p>
            </aside>
          );
        case 'cta':
          return (
            <div
              key={i}
              className="mt-8 rounded-2xl border border-oma-accent/30 bg-oma-elevated/60 p-6 sm:p-8"
            >
              <h3 className="text-lg font-semibold text-oma-cream">{block.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-oma-muted">{block.text}</p>
              {block.href.startsWith('http') || block.external ? (
                <a
                  href={block.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex rounded-lg bg-oma-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  {block.label}
                </a>
              ) : (
                <Link
                  to={block.href}
                  className="mt-4 inline-flex rounded-lg bg-oma-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  {block.label}
                </Link>
              )}
            </div>
          );
        default:
          return null;
      }
    })}

    {faqs.length > 0 ? (
      <section className="mt-12 border-t border-oma-line/40 pt-10" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-2xl font-semibold text-oma-cream">
          Frequently asked questions
        </h2>
        <dl className="mt-6 space-y-6">
          {faqs.map((faq, i) => (
            <div key={i}>
              <dt className="font-medium text-oma-cream">{faq.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-oma-muted">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    ) : null}
  </article>
  );
}
