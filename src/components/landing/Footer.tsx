import { Instagram } from 'lucide-react';
import { OmafitLogo } from './OmafitLogo';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-oma-line/40 bg-oma-elevated">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-14 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-2">
            <a
              href="#top"
              aria-label="Omafit — home"
              className="inline-block transition-opacity hover:opacity-95"
            >
              <OmafitLogo variant="onDark" />
            </a>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-oma-muted">
              Photorealistic AI assistant for apparel, footwear, and accessories.
              Precise sizing, realistic try-on, fewer returns.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://www.instagram.com/omafit.co/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram do Omafit"
                className="grid h-9 w-9 place-items-center rounded-lg border border-oma-line/50 text-oma-muted transition-colors hover:bg-oma-line/20 hover:text-oma-cream"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          <FooterCol title="Product">
            <FooterLink href="#solucao">Solution</FooterLink>
            <FooterLink href="#recursos">Features</FooterLink>
            <FooterLink href="#planos">Pricing</FooterLink>
            <FooterLink
              href="https://apps.shopify.com/omafit"
              external
            >
              Shopify App
            </FooterLink>
          </FooterCol>

          <FooterCol title="Support">
            <FooterLink href="#faq">FAQ</FooterLink>
            <FooterLink href="/contato">Contact</FooterLink>
            <FooterLink href="mailto:contato@omafit.co" external>
              contato@omafit.co
            </FooterLink>
          </FooterCol>

          <FooterCol title="Company">
            <FooterLink href="/blog">Blog</FooterLink>
            <FooterLink href="/partners">Partners</FooterLink>
            <FooterLink href="/privacidade">Privacy</FooterLink>
            <FooterLink href="#faq">Terms</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-oma-line/40 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-oma-muted">
            &copy; {year} Omafit. All rights reserved.
          </p>
          <p className="text-xs text-oma-muted">
            Built with care in São Paulo, Brazil
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-oma-muted">
        {title}
      </h4>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="text-sm text-oma-muted transition-colors hover:text-oma-cream"
      >
        {children}
      </a>
    </li>
  );
}
