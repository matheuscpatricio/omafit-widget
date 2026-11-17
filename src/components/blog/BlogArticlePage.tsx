import { Link, Navigate, useParams } from 'react-router-dom';
import { formatBlogDate, getBlogPostBySlug, getAllBlogPosts } from '../../lib/blog';
import { PageSEO } from '../seo/PageSEO';
import { getSiteUrl } from '../../lib/site';
import { BlogLayout } from './BlogLayout';
import { BlogArticleBody } from './BlogArticleBody';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';

export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { locale, t } = useLandingLocale();
  const b = t.blog;
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const base = getSiteUrl();
  const path = `/blog/${post.slug}`;
  const pageUrl = `${base}${path}`;

  const jsonLdGraph = [
    {
      '@type': 'BlogPosting',
      '@id': `${pageUrl}#article`,
      headline: post.title,
      description: post.description,
      abstract: post.geoAnswer,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      inLanguage: t.htmlLang,
      author: { '@type': 'Organization', name: 'Omafit', url: base },
      publisher: { '@id': `${base}/#organization` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
      keywords: post.keywords.join(', '),
      ...(post.articleSection ? { articleSection: post.articleSection } : {}),
      about: post.keywords.slice(0, 5).map((name) => ({ '@type': 'Thing', name })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: b.breadcrumbHome, item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: b.breadcrumbBlog, item: `${base}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: pageUrl },
      ],
    },
  ];

  const related = getAllBlogPosts()
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  return (
    <BlogLayout>
      <PageSEO
        title={`${post.title} | Omafit Blog`}
        description={post.description}
        path={path}
        keywords={post.keywords}
        ogType="article"
        article={{ publishedAt: post.publishedAt, updatedAt: post.updatedAt }}
        jsonLdGraph={jsonLdGraph}
        faqs={post.faqs}
      />

      <header className="mb-10 border-b border-oma-line/40 pb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-oma-muted">
          Omafit Blog
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-oma-muted">{post.description}</p>
        <p className="mt-3 rounded-xl border border-oma-line/40 bg-oma-elevated/50 px-4 py-3 text-sm leading-relaxed text-oma-cream">
          <span className="font-medium text-oma-accent">{b.quickAnswer} </span>
          {post.geoAnswer}
        </p>
        {b.articleLanguageNote ? (
          <p className="mt-3 text-sm text-oma-muted/90">{b.articleLanguageNote}</p>
        ) : null}
        <p className="mt-4 text-xs text-oma-muted">
          <time dateTime={post.publishedAt}>
            {b.published} {formatBlogDate(post.publishedAt, locale)}
          </time>
          {post.updatedAt !== post.publishedAt ? (
            <>
              {' '}
              · {b.updated}{' '}
              <time dateTime={post.updatedAt}>{formatBlogDate(post.updatedAt, locale)}</time>
            </>
          ) : null}
          <span aria-hidden> · </span>
          {post.readingTimeMinutes} {b.minRead}
        </p>
      </header>

      <BlogArticleBody blocks={post.blocks} faqs={post.faqs} faqHeading={b.faqHeading} />

      {related.length > 0 ? (
        <aside className="mt-14 border-t border-oma-line/40 pt-10">
          <h2 className="text-lg font-semibold text-oma-cream">{b.keepReading}</h2>
          <ul className="mt-4 space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  to={`/blog/${r.slug}`}
                  className="text-sm text-oma-muted transition-colors hover:text-oma-accent"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </BlogLayout>
  );
}
