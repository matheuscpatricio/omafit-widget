import { Link } from 'react-router-dom';
import { getAllBlogPosts, formatBlogDate } from '../../lib/blog';
import { PageSEO } from '../seo/PageSEO';
import { getSiteUrl } from '../../lib/site';
import { BlogLayout } from './BlogLayout';

export function BlogIndexPage() {
  const posts = getAllBlogPosts();
  const base = getSiteUrl();

  const jsonLdGraph = [
    {
      '@type': 'CollectionPage',
      '@id': `${base}/blog#webpage`,
      url: `${base}/blog`,
      name: 'Omafit Blog — fashion, try-on & e-commerce',
      description:
        'Articles on virtual try-on, Shopify, body measurement, AR, and reducing returns for fashion stores.',
      isPartOf: { '@id': `${base}/#website` },
      inLanguage: 'en',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${base}/blog` },
      ],
    },
  ];

  return (
    <BlogLayout backHref="/" backLabel="Back to site">
      <PageSEO
        title="Omafit Blog — virtual try-on, Shopify & reducing returns"
        description="Guides for fashion merchants: AI virtual try-on, MediaPipe sizing, AR for accessories, and PDP conversion on Shopify."
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
          For merchants
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl">
          Omafit Blog
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-oma-muted">
          Virtual try-on, the right size, and PDP conversion—written for Shopify fashion brands.
        </p>
      </header>

      <ul className="space-y-8">
        {posts.map((post) => (
          <li key={post.slug}>
            <article className="group rounded-2xl border border-oma-line/40 bg-oma-elevated/40 p-6 transition-colors hover:border-oma-accent/35 sm:p-8">
              <time dateTime={post.publishedAt} className="text-xs text-oma-muted">
                {formatBlogDate(post.publishedAt)}
                <span aria-hidden> · </span>
                {post.readingTimeMinutes} min read
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
                Read article →
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </BlogLayout>
  );
}
