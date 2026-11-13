import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Handshake,
  Mail,
  Percent,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { OmafitLogo } from './landing/OmafitLogo';
import { Footer } from './landing/Footer';
import { Button } from './ui/button';
import { PageSEO } from './seo/PageSEO';

const PARTNERS_EMAIL = 'contato@omafit.co';

const benefits = [
  {
    title: 'Revenue share',
    description:
      'Earn a recurring share of subscription revenue from merchants you refer or onboard. Terms are transparent and agreed upfront — no hidden tiers.',
    icon: Percent,
  },
  {
    title: 'Shopify-native fit',
    description:
      'One-click install from the Shopify App Store, merchant-friendly onboarding, and positioning that complements your theme and CRO work.',
    icon: Sparkles,
  },
  {
    title: 'Partner enablement',
    description:
      'Demo assets, talk tracks for reducing returns, and priority responses for your agency team when you bring a merchant live.',
    icon: Users,
  },
  {
    title: 'Co-selling motion',
    description:
      'Joint outreach for pilot stores, case studies, and launches — built for agencies that manage multiple ecommerce accounts.',
    icon: Handshake,
  },
];

const steps = [
  {
    step: '01',
    title: 'Introduce your agency',
    body: 'Tell us about your portfolio (Shopify Plus, DTC, fashion, footwear, accessories) and how you work with merchants.',
  },
  {
    step: '02',
    title: 'Align on revenue share',
    body: 'We agree on referral attribution, payout cadence, and support boundaries before any merchant goes live.',
  },
  {
    step: '03',
    title: 'Launch with merchants',
    body: 'Install Omafit on client stores, measure try-on and sizing impact, and grow recurring partner revenue with us.',
  },
];

export function PartnersPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    agencyName: '',
    contactName: '',
    email: '',
    website: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const inputClass =
    'w-full rounded-xl border border-oma-line/50 bg-oma-canvas/80 px-4 py-3 text-oma-cream shadow-inner placeholder:text-oma-muted/55 transition-[border-color,box-shadow] focus:border-oma-accent/50 focus:outline-none focus:ring-2 focus:ring-oma-accent/35';

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const subject = `Omafit agency partnership — ${formData.agencyName}`;
    const body = [
      `Agency: ${formData.agencyName}`,
      `Contact: ${formData.contactName}`,
      `Email: ${formData.email}`,
      `Website: ${formData.website}`,
      '',
      'Message:',
      formData.message,
    ].join('\n');

    window.location.href = `mailto:${PARTNERS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({
        agencyName: '',
        contactName: '',
        email: '',
        website: '',
        message: '',
      });
      setTimeout(() => setIsSubmitted(false), 4000);
    }, 1000);
  };

  return (
    <div className="landing-page min-h-screen bg-oma-canvas text-oma-cream antialiased">
      <PageSEO
        title="Agency & Partner Program — Revenue Share | Omafit"
        description="Ecommerce agencies partner with Omafit on a revenue-share model. Shopify virtual try-on and AI sizing for your merchant portfolio. Contact us to co-sell with Miko Apps and leading agencies."
        path="/partners"
        keywords={[
          'Omafit partner program',
          'Shopify agency partnership',
          'revenue share',
          'virtual try-on reseller',
          'Miko Apps',
        ]}
      />

      <header className="border-b border-oma-line/40 bg-oma-elevated/95 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-6 flex items-center gap-2 text-sm font-medium text-oma-muted transition-colors hover:text-oma-cream"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span>Back to home</span>
          </button>
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <div className="rounded-2xl border border-oma-line/40 bg-oma-canvas/60 p-3 shadow-inner">
              <OmafitLogo variant="onDark" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-oma-accent">
                Agency program
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl">
                Partner with Omafit
              </h1>
              <p className="mt-2 max-w-2xl text-oma-muted">
                Built for ecommerce agencies on Shopify. We work on a{' '}
                <strong className="font-medium text-oma-cream">revenue share</strong> model — you
                bring merchants, we share recurring subscription revenue when they subscribe through
                your partnership.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="mb-14 rounded-2xl border border-oma-accent/30 bg-gradient-to-br from-oma-elevated via-oma-canvas to-oma-elevated p-6 shadow-elegant sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-oma-cream sm:text-2xl">
            Revenue share, stated clearly
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-oma-muted sm:text-base">
            Omafit does not charge agencies a platform fee to join. Instead, we align on a{' '}
            <strong className="font-medium text-oma-cream">percentage of paid merchant revenue</strong>{' '}
            attributed to your agency (referrals, installs you manage, or co-branded onboarding).
            Payouts are recurring while the merchant stays on a paid plan — so your upside grows with
            client retention, not just the first install.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              'Transparent attribution and reporting',
              'No upfront partner buy-in',
              'Scales across your merchant book',
              'Fashion, footwear, and accessories focus',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-oma-muted">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-oma-tech" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-5 shadow-elegant backdrop-blur-sm"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-oma-line/40 bg-oma-canvas/50">
                <Icon className="h-5 w-5 text-oma-accent" aria-hidden />
              </div>
              <h3 className="font-semibold text-oma-cream">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-oma-muted">{description}</p>
            </div>
          ))}
        </section>

        <section className="mb-14">
          <h2 className="mb-6 text-xl font-semibold tracking-tight text-oma-cream sm:text-2xl">
            How we onboard partners
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-oma-line/40 bg-oma-elevated/80 p-6"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-oma-accent">
                  {s.step}
                </span>
                <h3 className="mt-2 font-semibold text-oma-cream">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-oma-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14 rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-oma-cream">
            Agencies in our ecosystem
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-oma-muted sm:text-base">
            We collaborate with Shopify specialists who ship for serious merchants.{' '}
            <a
              href="https://miko.co.nz/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-oma-accent underline-offset-2 hover:underline"
            >
              Miko Apps
            </a>{' '}
            — the native Shopify app studio from Tripster Developers (Shopify Plus partner since
            2016) — builds wholesale, loyalty, and growth apps used by thousands of stores. Agencies
            like Miko and Tripster serve the same brands that benefit from AI try-on and sizing; our
            partner program is designed to fit alongside your app stack and services, with shared{' '}
            <strong className="font-medium text-oma-cream">revenue share</strong> when you introduce
            Omafit to your clients.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-6 shadow-elegant">
              <h2 className="text-lg font-semibold text-oma-cream">Talk to partnerships</h2>
              <p className="mt-2 text-sm leading-relaxed text-oma-muted">
                Share your agency profile and we will reply within two business days with next steps
                and revenue-share terms.
              </p>
              <a
                href={`mailto:${PARTNERS_EMAIL}?subject=${encodeURIComponent('Omafit agency partnership')}`}
                className="mt-6 inline-flex items-center gap-2 text-sm text-oma-accent transition-colors hover:text-oma-cream"
              >
                <Mail className="h-4 w-4" aria-hidden />
                {PARTNERS_EMAIL}
              </a>
              <p className="mt-4 text-xs text-oma-muted">
                Prefer the general contact form?{' '}
                <Link to="/contato" className="text-oma-accent hover:underline">
                  Contact page
                </Link>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-6 shadow-elegant sm:p-8 lg:col-span-3">
            {isSubmitted ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-oma-tech/40 bg-oma-tech/15">
                  <CheckCircle className="h-10 w-10 text-oma-tech" />
                </div>
                <h3 className="text-xl font-semibold text-oma-cream">Request sent</h3>
                <p className="mt-2 text-sm text-oma-muted">
                  Your email client should open with the partnership details. We will follow up
                  shortly.
                </p>
              </div>
            ) : (
              <>
                <h2 className="mb-6 text-xl font-semibold text-oma-cream">
                  Apply for the partner program
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="agencyName" className="mb-2 block text-sm font-medium text-oma-muted">
                        Agency name *
                      </label>
                      <input
                        id="agencyName"
                        name="agencyName"
                        required
                        value={formData.agencyName}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Your agency"
                      />
                    </div>
                    <div>
                      <label htmlFor="contactName" className="mb-2 block text-sm font-medium text-oma-muted">
                        Contact name *
                      </label>
                      <input
                        id="contactName"
                        name="contactName"
                        required
                        value={formData.contactName}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Full name"
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="email" className="mb-2 block text-sm font-medium text-oma-muted">
                        Work email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="you@agency.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="website" className="mb-2 block text-sm font-medium text-oma-muted">
                        Agency website *
                      </label>
                      <input
                        type="url"
                        id="website"
                        name="website"
                        required
                        value={formData.website}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="message" className="mb-2 block text-sm font-medium text-oma-muted">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Merchant verticals, countries you serve, expected referral volume, and questions about revenue share…"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      'Opening email…'
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" aria-hidden />
                        Send partnership request
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-oma-muted">
                    By submitting, you agree to our{' '}
                    <Link to="/privacidade" className="text-oma-accent hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </form>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
