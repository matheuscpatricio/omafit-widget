import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '../landing/Footer';
import { PublicPageHeader } from '../landing/PublicPageHeader';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';

type BlogLayoutProps = {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function BlogLayout({
  children,
  backHref = '/blog',
  backLabel,
}: BlogLayoutProps) {
  const { t } = useLandingLocale();
  const label = backLabel ?? t.blog.allArticles;

  return (
    <div className="min-h-screen bg-oma-canvas text-oma-cream">
      <PublicPageHeader />

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        {backHref ? (
          <Link
            to={backHref}
            className="mb-8 inline-flex items-center gap-2 text-sm text-oma-muted transition-colors hover:text-oma-accent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        ) : null}
        {children}
      </main>

      <Footer />
    </div>
  );
}