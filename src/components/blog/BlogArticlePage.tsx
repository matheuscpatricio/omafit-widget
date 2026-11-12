import { Link, Navigate, useParams } from 'react-router-dom';
import { formatBlogDate, getBlogPostBySlug, getAllBlogPosts } from '../../lib/blog';
import { PageSEO } from '../seo/PageSEO';
import { getSiteUrl } from '../../lib/site';
import { BlogLayout } from './BlogLayout';
import { BlogArticleBody } from './BlogArticleBody';

export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
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
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      inLanguage: 'en',
      author: { '@type': 'Organization', name: 'Omafit', url: base },
      publisher: { '@id': `${base}/#organization` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
      keywords: post.keywords.join(', '),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${base}/blog` },
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
        <p className="mt-4 text-xs text-oma-muted">
          <time dateTime={post.publishedAt}>Published {formatBlogDate(post.publishedAt)}</time>
          {post.updatedAt !== post.publishedAt ? (
            <>
              {' '}
              · Updated <time dateTime={post.updatedAt}>{formatBlogDate(post.updatedAt)}</time>
            </>
          ) : null}
          <span aria-hidden> · </span>
          {post.readingTimeMinutes} min read
        </p>
      </header>

      <BlogArticleBody blocks={post.blocks} faqs={post.faqs} />

      {related.length > 0 ? (
        <aside className="mt-14 border-t border-oma-line/40 pt-10">
          <h2 className="text-lg font-semibold text-oma-cream">Keep reading</h2>
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
