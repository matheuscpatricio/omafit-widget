import { Instagram } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-white border-t border-black/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-14 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-2">
            <span
              className="font-bungee text-[24px] text-ink-800"
              style={{ fontFamily: '"Bungee", sans-serif' }}
            >
              OMAFIT
            </span>
            <p className="mt-3 text-sm text-ink-500 max-w-xs leading-relaxed">
              Assistente Inteligente com IA fotorrealista para moda, calçados e acessórios.
              Medidas precisas, try-on realista, menos devoluções.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://www.instagram.com/omafit.co/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram do Omafit"
                className="h-9 w-9 grid place-items-center rounded-lg border border-black/5 text-ink-600 hover:bg-ink-50 hover:text-ink-800 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          <FooterCol title="Produto">
            <FooterLink href="#solucao">Solução</FooterLink>
            <FooterLink href="#recursos">Recursos</FooterLink>
            <FooterLink href="#planos">Planos</FooterLink>
            <FooterLink
              href="https://apps.shopify.com/omafit"
              external
            >
              Shopify App
            </FooterLink>
          </FooterCol>

          <FooterCol title="Suporte">
            <FooterLink href="#faq">FAQ</FooterLink>
            <FooterLink href="/contato">Contato</FooterLink>
            <FooterLink href="mailto:contato@omafit.co" external>
              contato@omafit.co
            </FooterLink>
          </FooterCol>

          <FooterCol title="Empresa">
            <FooterLink href="/privacidade">Privacidade</FooterLink>
            <FooterLink href="#faq">Termos</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-14 pt-8 border-t border-black/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-ink-400">
            &copy; {year} Omafit. Todos os direitos reservados.
          </p>
          <p className="text-xs text-ink-400">
            Feito com precisão em São Paulo, Brasil
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
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-4">
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
        className="text-sm text-ink-600 hover:text-ink-800 transition-colors"
      >
        {children}
      </a>
    </li>
  );
}
