import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle, Phone, MapPin } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t.back}</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#810707] to-red-700 rounded-xl flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-gray-600">{t.subtitle}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">

            {/* Contact Cards */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-[#810707]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{t.email}</h3>
                  <a href="mailto:contato@omafit.co" className="text-gray-600 hover:text-[#810707] transition-colors">
                    contato@omafit.co
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{t.support}</h3>
                  <p className="text-gray-600">
                    {t.supportDesc}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{t.enterprise}</h3>
                  <p className="text-gray-600 text-sm">
                    {t.enterpriseDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-gradient-to-br from-[#810707] to-red-700 rounded-xl shadow-sm p-6 text-white">
              <h3 className="text-xl font-bold mb-4">{t.faqTitle}</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>{t.faq1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>{t.faq2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>{t.faq3}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>{t.faq4}</span>
                </li>
              </ul>
              <p className="text-sm mt-4 text-red-100">
                {t.faqFooter}
              </p>
            </div>

          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-8">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{t.sentTitle}</h3>
                  <p className="text-gray-600">
                    {t.sentDesc}
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.formTitle}</h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-2">
                          {t.storeName}
                        </label>
                        <input
                          type="text"
                          id="storeName"
                          name="storeName"
                          required
                          value={formData.storeName}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent transition-all"
                          placeholder={t.storeNamePlaceholder}
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          {t.emailLabel}
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent transition-all"
                          placeholder={t.emailPlaceholder}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        {t.subject}
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent transition-all"
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
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        {t.message}
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        value={formData.message}
                        onChange={handleChange}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent transition-all resize-none"
                        placeholder={t.messagePlaceholder}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-[#810707] to-red-700 text-white py-3 px-6 rounded-lg hover:from-red-800 hover:to-red-900 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {t.sending}
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          {t.send}
                        </>
                      )}
                    </button>

                    <p className="text-sm text-gray-500 text-center">
                      {t.privacyPrefix}{' '}
                      <a href="/privacidade" className="text-[#810707] hover:underline">
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
