import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle, Phone } from 'lucide-react';
import { OmafitLogo } from './landing/OmafitLogo';
import { Button } from './ui/button';
import { PublicPageHeader } from './landing/PublicPageHeader';
import { Footer } from './landing/Footer';
import { useLandingLocale } from '../contexts/LandingLocaleContext';

export function ContactPage() {
  const navigate = useNavigate();
  const { t } = useLandingLocale();
  const c = t.contact;
  const [formData, setFormData] = useState({
    storeName: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const mailtoLink = `mailto:contato@omafit.co?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
      `${c.mailBodyStoreName}: ${formData.storeName}\n${c.mailBodyEmail}: ${formData.email}\n\n${c.mailBodyMessage}:\n${formData.message}`
    )}`;

    window.location.href = mailtoLink;

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({ storeName: '', email: '', subject: '', message: '' });

      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const inputClass =
    'w-full rounded-xl border border-oma-line/50 bg-oma-canvas/80 px-4 py-3 text-oma-cream shadow-inner placeholder:text-oma-muted/55 transition-[border-color,box-shadow] focus:border-oma-accent/50 focus:outline-none focus:ring-2 focus:ring-oma-accent/35';

  return (
    <div className="landing-page min-h-screen bg-oma-canvas text-oma-cream antialiased">
      <PublicPageHeader />
      <header className="border-b border-oma-line/40 bg-oma-elevated/95 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-6 flex items-center gap-2 text-sm font-medium text-oma-muted transition-colors hover:text-oma-cream"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span>{c.back}</span>
          </button>
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <div className="rounded-2xl border border-oma-line/40 bg-oma-canvas/60 p-3 shadow-inner">
              <OmafitLogo variant="onDark" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl">{c.title}</h1>
              <p className="mt-1 text-oma-muted">{c.subtitle}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">

            {/* Contact Cards */}
            <div className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-6 shadow-elegant backdrop-blur-sm">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-oma-line/40 bg-oma-canvas/50">
                  <Mail className="h-6 w-6 text-oma-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="mb-1 font-semibold text-oma-cream">{c.email}</h3>
                  <a
                    href="mailto:contato@omafit.co"
                    className="text-sm text-oma-muted transition-colors hover:text-oma-accent"
                  >
                    contato@omafit.co
                  </a>
                </div>
              </div>

              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-oma-line/40 bg-oma-canvas/50">
                  <MessageSquare className="h-6 w-6 text-oma-tech" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-oma-cream">{c.support}</h3>
                  <p className="text-sm leading-relaxed text-oma-muted">{c.supportDesc}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-oma-line/40 bg-oma-canvas/50">
                  <Phone className="h-6 w-6 text-oma-accent" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-oma-cream">{c.enterprise}</h3>
                  <p className="text-sm leading-relaxed text-oma-muted">{c.enterpriseDesc}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-oma-line/40 bg-gradient-to-br from-oma-elevated to-oma-canvas p-6 shadow-elegant">
              <h3 className="mb-4 text-xl font-semibold tracking-tight text-oma-cream">{c.faqTitle}</h3>
              <ul className="space-y-3 text-sm text-oma-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-oma-accent">•</span>
                  <span>{c.faq1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-oma-accent">•</span>
                  <span>{c.faq2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-oma-accent">•</span>
                  <span>{c.faq3}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-oma-accent">•</span>
                  <span>{c.faq4}</span>
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-oma-muted">{c.faqFooter}</p>
            </div>

          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-6 shadow-elegant backdrop-blur-sm sm:p-8">
              {isSubmitted ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-oma-tech/40 bg-oma-tech/15">
                    <CheckCircle className="h-12 w-12 text-oma-tech" />
                  </div>
                  <h3 className="mb-2 text-2xl font-semibold tracking-tight text-oma-cream">{c.sentTitle}</h3>
                  <p className="text-oma-muted">{c.sentDesc}</p>
                </div>
              ) : (
                <>
                  <h2 className="mb-6 text-2xl font-semibold tracking-tight text-oma-cream">{c.formTitle}</h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="storeName" className="mb-2 block text-sm font-medium text-oma-muted">
                          {c.storeName}
                        </label>
                        <input
                          type="text"
                          id="storeName"
                          name="storeName"
                          required
                          value={formData.storeName}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder={c.storeNamePlaceholder}
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-medium text-oma-muted">
                          {c.emailLabel}
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder={c.emailPlaceholder}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="mb-2 block text-sm font-medium text-oma-muted">
                        {c.subject}
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="">{c.subjectPlaceholder}</option>
                        <option value={c.subjectTechnical}>{c.subjectTechnical}</option>
                        <option value={c.subjectPlans}>{c.subjectPlans}</option>
                        <option value={c.subjectIntegration}>{c.subjectIntegration}</option>
                        <option value={c.subjectEnterprise}>{c.subjectEnterprise}</option>
                        <option value={c.subjectPartnership}>{c.subjectPartnership}</option>
                        <option value={c.subjectOther}>{c.subjectOther}</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="mb-2 block text-sm font-medium text-oma-muted">
                        {c.message}
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        value={formData.message}
                        onChange={handleChange}
                        rows={6}
                        className={`${inputClass} resize-none`}
                        placeholder={c.messagePlaceholder}
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={isSubmitting}
                      className="w-full shadow-[0_8px_28px_-4px_rgba(217,104,69,0.45)]"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#F6F0E2] border-t-transparent" />
                          {c.sending}
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5 shrink-0" />
                          {c.send}
                        </>
                      )}
                    </Button>

                    <p className="text-center text-sm text-oma-muted">
                      {c.privacyPrefix}{' '}
                      <a href="/privacidade" className="font-medium text-oma-accent hover:underline">
                        {c.privacyLink}
                      </a>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
