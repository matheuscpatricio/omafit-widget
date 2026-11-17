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
import { PublicPageHeader } from './landing/PublicPageHeader';
import { Button } from './ui/button';
import { PageSEO } from './seo/PageSEO';
import { useLandingLocale } from '../contexts/LandingLocaleContext';
import type { LucideIcon } from 'lucide-react';

const PARTNERS_EMAIL = 'contato@omafit.co';

const BENEFIT_ICONS: LucideIcon[] = [Percent, Sparkles, Users, Handshake];

export function PartnersPage() {
  const navigate = useNavigate();
  const { t } = useLandingLocale();
  const p = t.partners;

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

    const subject = p.mailSubjectForm(formData.agencyName);
    const body = [
      `${p.mailLines.agency}: ${formData.agencyName}`,
      `${p.mailLines.contact}: ${formData.contactName}`,
      `${p.mailLines.email}: ${formData.email}`,
      `${p.mailLines.website}: ${formData.website}`,
      '',
      `${p.mailLines.message}:`,
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
        title={p.seo.title}
        description={p.seo.description}
        path="/partners"
        keywords={[
          'Omafit partner program',
          'Shopify agency partnership',
          'revenue share',
          'virtual try-on reseller',
          'Miko Apps',
        ]}
      />

      <PublicPageHeader />

      <header className="border-b border-oma-line/40 bg-oma-elevated/95 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-6 flex items-center gap-2 text-sm font-medium text-oma-muted transition-colors hover:text-oma-cream"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span>{p.back}</span>
          </button>
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <div className="rounded-2xl border border-oma-line/40 bg-oma-canvas/60 p-3 shadow-inner">
              <OmafitLogo variant="onDark" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-oma-accent">{p.tag}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl">{p.h1}</h1>
              <p className="mt-2 max-w-2xl text-oma-muted">
                {p.heroBefore}
                <strong className="font-medium text-oma-cream">{p.heroEmphasis}</strong>
                {p.heroAfter}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="mb-14 rounded-2xl border border-oma-accent/30 bg-gradient-to-br from-oma-elevated via-oma-canvas to-oma-elevated p-6 shadow-elegant sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-oma-cream sm:text-2xl">{p.revenueTitle}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-oma-muted sm:text-base">
            {p.revenueBodyBefore}
            <strong className="font-medium text-oma-cream">{p.revenueEmphasis}</strong>
            {p.revenueBodyAfter}
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {p.revenueBullets.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-oma-muted">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-oma-tech" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {p.benefits.map(({ title, description }, index) => {
            const Icon = BENEFIT_ICONS[index] ?? Sparkles;
            return (
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
            );
          })}
        </section>

        <section className="mb-14">
          <h2 className="mb-6 text-xl font-semibold tracking-tight text-oma-cream sm:text-2xl">{p.stepsTitle}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {p.steps.map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-oma-line/40 bg-oma-elevated/80 p-6"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-oma-accent">{s.step}</span>
                <h3 className="mt-2 font-semibold text-oma-cream">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-oma-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14 rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-oma-cream">{p.ecosystemTitle}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-oma-muted sm:text-base">
            {p.ecosystemBeforeLink}{' '}
            <a
              href="https://miko.co.nz/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-oma-accent underline-offset-2 hover:underline"
            >
              Miko Apps
            </a>
            {p.ecosystemAfterMiko}{' '}
            <strong className="font-medium text-oma-cream">{p.ecosystemAfterEmphasis}</strong>
          </p>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-6 shadow-elegant">
              <h2 className="text-lg font-semibold text-oma-cream">{p.talkTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-oma-muted">{p.talkDesc}</p>
              <a
                href={`mailto:${PARTNERS_EMAIL}?subject=${encodeURIComponent(p.mailSubject)}`}
                className="mt-6 inline-flex items-center gap-2 text-sm text-oma-accent transition-colors hover:text-oma-cream"
              >
                <Mail className="h-4 w-4" aria-hidden />
                {PARTNERS_EMAIL}
              </a>
              <p className="mt-4 text-xs text-oma-muted">
                {p.contactFormHint}{' '}
                <Link to="/contato" className="text-oma-accent hover:underline">
                  {p.contactFormLink}
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
                <h3 className="text-xl font-semibold text-oma-cream">{p.sentTitle}</h3>
                <p className="mt-2 text-sm text-oma-muted">{p.sentDesc}</p>
              </div>
            ) : (
              <>
                <h2 className="mb-6 text-xl font-semibold text-oma-cream">{p.formTitle}</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="agencyName" className="mb-2 block text-sm font-medium text-oma-muted">
                        {p.agencyName}
                      </label>
                      <input
                        id="agencyName"
                        name="agencyName"
                        required
                        value={formData.agencyName}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder={p.agencyNamePh}
                      />
                    </div>
                    <div>
                      <label htmlFor="contactName" className="mb-2 block text-sm font-medium text-oma-muted">
                        {p.contactName}
                      </label>
                      <input
                        id="contactName"
                        name="contactName"
                        required
                        value={formData.contactName}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder={p.contactNamePh}
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="email" className="mb-2 block text-sm font-medium text-oma-muted">
                        {p.workEmail}
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder={p.workEmailPh}
                      />
                    </div>
                    <div>
                      <label htmlFor="website" className="mb-2 block text-sm font-medium text-oma-muted">
                        {p.website}
                      </label>
                      <input
                        type="url"
                        id="website"
                        name="website"
                        required
                        value={formData.website}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder={p.websitePh}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="message" className="mb-2 block text-sm font-medium text-oma-muted">
                      {p.message}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder={p.messagePh}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      p.submitting
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" aria-hidden />
                        {p.submit}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-oma-muted">
                    {p.privacyPrefix}{' '}
                    <Link to="/privacidade" className="text-oma-accent hover:underline">
                      {p.privacyLink}
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