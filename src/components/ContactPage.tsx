import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle, Phone } from 'lucide-react';
import { OmafitLogo } from './landing/OmafitLogo';
import { Button } from './ui/button';

type PublicLocale = 'pt' | 'en' | 'es';

const detectPublicLocale = (): PublicLocale => {
  if (typeof window === 'undefined') return 'pt';
  const raw = (navigator.language || '').toLowerCase();
  if (raw.startsWith('es')) return 'es';
  if (raw.startsWith('en')) return 'en';
  return 'pt';
};

const contactTranslations: Record<PublicLocale, Record<string, string>> = {
  pt: {
    back: 'Voltar',
    title: 'Entre em Contato',
    subtitle: 'Estamos aqui para ajudar você',
    email: 'E-mail',
    support: 'Suporte',
    supportDesc: 'Respondemos em até 24 horas',
    enterprise: 'Enterprise',
    enterpriseDesc: 'Para planos Enterprise, entre em contato diretamente',
    faqTitle: 'Perguntas Frequentes',
    faq1: 'Como funciona a integração?',
    faq2: 'Qual o tempo de setup?',
    faq3: 'Existe período de teste?',
    faq4: 'Como funciona o suporte?',
    faqFooter: 'Envie sua pergunta e responderemos o mais rápido possível!',
    sentTitle: 'Mensagem Enviada!',
    sentDesc: 'Obrigado por entrar em contato. Responderemos em breve.',
    formTitle: 'Envie sua Mensagem',
    storeName: 'Nome da Loja *',
    storeNamePlaceholder: 'Nome da sua loja',
    emailLabel: 'E-mail *',
    emailPlaceholder: 'seu@email.com',
    subject: 'Assunto *',
    subjectPlaceholder: 'Selecione um assunto',
    subjectTechnical: 'Suporte Técnico',
    subjectPlans: 'Dúvidas sobre Planos',
    subjectIntegration: 'Integração',
    subjectEnterprise: 'Plano Enterprise',
    subjectPartnership: 'Parceria',
    subjectOther: 'Outro',
    message: 'Mensagem *',
    messagePlaceholder: 'Como podemos ajudar você?',
    sending: 'Enviando...',
    send: 'Enviar Mensagem',
    privacyPrefix: 'Ao enviar, você concorda com nossa',
    privacyLink: 'Política de Privacidade',
    mailBodyStoreName: 'Nome da Loja',
    mailBodyEmail: 'E-mail',
    mailBodyMessage: 'Mensagem',
  },
  en: {
    back: 'Back',
    title: 'Get in Touch',
    subtitle: 'We are here to help you',
    email: 'Email',
    support: 'Support',
    supportDesc: 'We reply within 24 hours',
    enterprise: 'Enterprise',
    enterpriseDesc: 'For Enterprise plans, contact us directly',
    faqTitle: 'Frequently Asked Questions',
    faq1: 'How does the integration work?',
    faq2: 'What is the setup time?',
    faq3: 'Is there a trial period?',
    faq4: 'How does support work?',
    faqFooter: 'Send your question and we will reply as soon as possible!',
    sentTitle: 'Message Sent!',
    sentDesc: 'Thanks for contacting us. We will reply soon.',
    formTitle: 'Send your Message',
    storeName: 'Store Name *',
    storeNamePlaceholder: 'Your store name',
    emailLabel: 'Email *',
    emailPlaceholder: 'you@email.com',
    subject: 'Subject *',
    subjectPlaceholder: 'Select a subject',
    subjectTechnical: 'Technical Support',
    subjectPlans: 'Pricing Questions',
    subjectIntegration: 'Integration',
    subjectEnterprise: 'Enterprise Plan',
    subjectPartnership: 'Partnership',
    subjectOther: 'Other',
    message: 'Message *',
    messagePlaceholder: 'How can we help you?',
    sending: 'Sending...',
    send: 'Send Message',
    privacyPrefix: 'By sending, you agree with our',
    privacyLink: 'Privacy Policy',
    mailBodyStoreName: 'Store Name',
    mailBodyEmail: 'Email',
    mailBodyMessage: 'Message',
  },
  es: {
    back: 'Volver',
    title: 'Ponte en Contacto',
    subtitle: 'Estamos aquí para ayudarte',
    email: 'Correo',
    support: 'Soporte',
    supportDesc: 'Respondemos en hasta 24 horas',
    enterprise: 'Enterprise',
    enterpriseDesc: 'Para planes Enterprise, contáctanos directamente',
    faqTitle: 'Preguntas Frecuentes',
    faq1: '¿Cómo funciona la integración?',
    faq2: '¿Cuál es el tiempo de configuración?',
    faq3: '¿Existe período de prueba?',
    faq4: '¿Cómo funciona el soporte?',
    faqFooter: 'Envía tu pregunta y responderemos lo antes posible.',
    sentTitle: '¡Mensaje enviado!',
    sentDesc: 'Gracias por contactarnos. Responderemos pronto.',
    formTitle: 'Envía tu Mensaje',
    storeName: 'Nombre de la Tienda *',
    storeNamePlaceholder: 'Nombre de tu tienda',
    emailLabel: 'Correo *',
    emailPlaceholder: 'tu@email.com',
    subject: 'Asunto *',
    subjectPlaceholder: 'Selecciona un asunto',
    subjectTechnical: 'Soporte Técnico',
    subjectPlans: 'Dudas sobre Planes',
    subjectIntegration: 'Integración',
    subjectEnterprise: 'Plan Enterprise',
    subjectPartnership: 'Alianza',
    subjectOther: 'Otro',
    message: 'Mensaje *',
    messagePlaceholder: '¿Cómo podemos ayudarte?',
    sending: 'Enviando...',
    send: 'Enviar Mensaje',
    privacyPrefix: 'Al enviar, aceptas nuestra',
    privacyLink: 'Política de Privacidad',
    mailBodyStoreName: 'Nombre de la Tienda',
    mailBodyEmail: 'Correo',
    mailBodyMessage: 'Mensaje',
  }
};

export function ContactPage() {
  const navigate = useNavigate();
  const locale = detectPublicLocale();
  const t = contactTranslations[locale];
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
      `${t.mailBodyStoreName}: ${formData.storeName}\n${t.mailBodyEmail}: ${formData.email}\n\n${t.mailBodyMessage}:\n${formData.message}`
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
      <header className="border-b border-oma-line/40 bg-oma-elevated/95 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-6 flex items-center gap-2 text-sm font-medium text-oma-muted transition-colors hover:text-oma-cream"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            <span>{t.back}</span>
          </button>
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <div className="rounded-2xl border border-oma-line/40 bg-oma-canvas/60 p-3 shadow-inner">
              <OmafitLogo variant="onDark" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl">{t.title}</h1>
              <p className="mt-1 text-oma-muted">{t.subtitle}</p>
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
                  <h3 className="mb-1 font-semibold text-oma-cream">{t.email}</h3>
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
                  <h3 className="mb-1 font-semibold text-oma-cream">{t.support}</h3>
                  <p className="text-sm leading-relaxed text-oma-muted">{t.supportDesc}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-oma-line/40 bg-oma-canvas/50">
                  <Phone className="h-6 w-6 text-oma-accent" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-oma-cream">{t.enterprise}</h3>
                  <p className="text-sm leading-relaxed text-oma-muted">{t.enterpriseDesc}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-oma-line/40 bg-gradient-to-br from-oma-elevated to-oma-canvas p-6 shadow-elegant">
              <h3 className="mb-4 text-xl font-semibold tracking-tight text-oma-cream">{t.faqTitle}</h3>
              <ul className="space-y-3 text-sm text-oma-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-oma-accent">•</span>
                  <span>{t.faq1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-oma-accent">•</span>
                  <span>{t.faq2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-oma-accent">•</span>
                  <span>{t.faq3}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-oma-accent">•</span>
                  <span>{t.faq4}</span>
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-oma-muted">{t.faqFooter}</p>
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
                  <h3 className="mb-2 text-2xl font-semibold tracking-tight text-oma-cream">{t.sentTitle}</h3>
                  <p className="text-oma-muted">{t.sentDesc}</p>
                </div>
              ) : (
                <>
                  <h2 className="mb-6 text-2xl font-semibold tracking-tight text-oma-cream">{t.formTitle}</h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="storeName" className="mb-2 block text-sm font-medium text-oma-muted">
                          {t.storeName}
                        </label>
                        <input
                          type="text"
                          id="storeName"
                          name="storeName"
                          required
                          value={formData.storeName}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder={t.storeNamePlaceholder}
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-medium text-oma-muted">
                          {t.emailLabel}
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className={inputClass}
                          placeholder={t.emailPlaceholder}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="mb-2 block text-sm font-medium text-oma-muted">
                        {t.subject}
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="">{t.subjectPlaceholder}</option>
                        <option value={t.subjectTechnical}>{t.subjectTechnical}</option>
                        <option value={t.subjectPlans}>{t.subjectPlans}</option>
                        <option value={t.subjectIntegration}>{t.subjectIntegration}</option>
                        <option value={t.subjectEnterprise}>{t.subjectEnterprise}</option>
                        <option value={t.subjectPartnership}>{t.subjectPartnership}</option>
                        <option value={t.subjectOther}>{t.subjectOther}</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="mb-2 block text-sm font-medium text-oma-muted">
                        {t.message}
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        value={formData.message}
                        onChange={handleChange}
                        rows={6}
                        className={`${inputClass} resize-none`}
                        placeholder={t.messagePlaceholder}
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
                          {t.sending}
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5 shrink-0" />
                          {t.send}
                        </>
                      )}
                    </Button>

                    <p className="text-center text-sm text-oma-muted">
                      {t.privacyPrefix}{' '}
                      <a href="/privacidade" className="font-medium text-oma-accent hover:underline">
                        {t.privacyLink}
                      </a>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
