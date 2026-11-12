import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '../landing/Footer';
import { OmafitLogo } from '../landing/OmafitLogo';

type BlogLayoutProps = {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function BlogLayout({
  children,
  backHref = '/blog',
  backLabel = 'All articles',
}: BlogLayoutProps) {
  return (
    <div className="min-h-screen bg-oma-canvas text-oma-cream">
      <header className="border-b border-oma-line/40 bg-oma-elevated/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link to="/" className="transition-opacity hover:opacity-90" aria-label="Omafit — home">
            <OmafitLogo variant="onDark" />
          </Link>
          <Link
            to="/blog"
            className="text-sm font-medium text-oma-muted transition-colors hover:text-oma-cream"
          >
            Blog
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        {backHref ? (
          <Link
            to={backHref}
            className="mb-8 inline-flex items-center gap-2 text-sm text-oma-muted transition-colors hover:text-oma-accent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        ) : null}
        {children}
      </main>

      <Footer />
    </div>
  );
}
