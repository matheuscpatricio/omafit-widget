import { Link } from 'react-router-dom';
import { OmafitLogo } from './OmafitLogo';
import { LandingLanguageSelector } from './LandingLanguageSelector';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';

type PublicPageHeaderProps = {
  showBlogLink?: boolean;
};

/** Cabeçalho compartilhado (blog, contato, parceiros) com seletor de idioma da landing. */
export function PublicPageHeader({ showBlogLink = true }: PublicPageHeaderProps) {
  const { t } = useLandingLocale();

  return (
    <header className="border-b border-oma-line/40 bg-oma-elevated/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="transition-opacity hover:opacity-90" aria-label={t.footer.homeAria}>
          <OmafitLogo variant="onDark" />
        </Link>
        <div className="flex items-center gap-2">
          {showBlogLink ? (
            <Link
              to="/blog"
              className="rounded-lg px-3 py-2 text-sm font-medium text-oma-muted transition-colors hover:bg-oma-line/20 hover:text-oma-cream"
            >
              {t.nav.blog}
            </Link>
          ) : null}
          <Link
            to="/partners"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-oma-muted transition-colors hover:bg-oma-line/20 hover:text-oma-cream sm:inline"
          >
            {t.nav.partners}
          </Link>
          <LandingLanguageSelector solidBar />
        </div>
      </div>
    </header>
  );
}