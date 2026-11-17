import { Link } from 'react-router-dom';
import { getAllBlogPosts, formatBlogDate } from '../../lib/blog';
import { PageSEO } from '../seo/PageSEO';
import { getSiteUrl } from '../../lib/site';
import { BlogLayout } from './BlogLayout';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';

export function BlogIndexPage() {
  const { locale, t } = useLandingLocale();
  const b = t.blog;
  const posts = getAllBlogPosts();
  const base = getSiteUrl();

  const jsonLdGraph = [
    {
      '@type': 'CollectionPage',
      '@id': `${base}/blog#webpage`,
      url: `${base}/blog`,
      name: b.collectionName,
      description: b.collectionDescription,
      isPartOf: { '@id': `${base}/#website` },
      inLanguage: t.htmlLang,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: b.breadcrumbHome, item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: b.breadcrumbBlog, item: `${base}/blog` },
      ],
    },
  ];

  return (
    <BlogLayout backHref="/" backLabel={b.backToSite}>
      <PageSEO
        title={b.seoTitle}
        description={b.seoDescription}
        path="/blog"
        keywords={[
          'fashion e-commerce blog',
          'virtual try-on',
          'Shopify fashion',
          'Omafit',
          'fashion SEO',
        ]}
        jsonLdGraph={jsonLdGraph}
      />

      <header className="mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-oma-muted">
          {b.forMerchants}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl">
          {b.indexTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-oma-muted">{b.indexSubtitle}</p>
        {b.articleLanguageNote ? (
          <p className="mt-3 text-sm text-oma-muted/90">{b.articleLanguageNote}</p>
        ) : null}
      </header>

      <ul className="space-y-8">
        {posts.map((post) => (
          <li key={post.slug}>
            <article className="group rounded-2xl border border-oma-line/40 bg-oma-elevated/40 p-6 transition-colors hover:border-oma-accent/35 sm:p-8">
              <time dateTime={post.publishedAt} className="text-xs text-oma-muted">
                {formatBlogDate(post.publishedAt, locale)}
                <span aria-hidden> · </span>
                {post.readingTimeMinutes} {b.minRead}
              </time>
              <h2 className="mt-2 text-xl font-semibold text-oma-cream group-hover:text-oma-accent sm:text-2xl">
                <Link
                  to={`/blog/${post.slug}`}
                  className="outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-oma-accent"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-oma-muted">{post.description}</p>
              <Link
                to={`/blog/${post.slug}`}
                className="mt-4 inline-block text-sm font-medium text-oma-accent hover:underline"
              >
                {b.readArticle}
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </BlogLayout>
  );
}