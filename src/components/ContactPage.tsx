import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle, Phone, MapPin } from 'lucide-react';

export function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
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
      `Nome: ${formData.name}\nE-mail: ${formData.email}\n\nMensagem:\n${formData.message}`
    )}`;

    window.location.href = mailtoLink;

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });

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
            <span>Voltar</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#810707] to-red-700 rounded-xl flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Entre em Contato</h1>
              <p className="text-gray-600">Estamos aqui para ajudar você</p>
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
                  <h3 className="font-semibold text-gray-900 mb-1">E-mail</h3>
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
                  <h3 className="font-semibold text-gray-900 mb-1">Suporte</h3>
                  <p className="text-gray-600">
                    Respondemos em até 24 horas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Enterprise</h3>
                  <p className="text-gray-600 text-sm">
                    Para planos Enterprise, entre em contato diretamente
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-gradient-to-br from-[#810707] to-red-700 rounded-xl shadow-sm p-6 text-white">
              <h3 className="text-xl font-bold mb-4">Perguntas Frequentes</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>Como funciona a integração?</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>Qual o tempo de setup?</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>Existe período de teste?</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span>Como funciona o suporte?</span>
                </li>
              </ul>
              <p className="text-sm mt-4 text-red-100">
                Envie sua pergunta e responderemos o mais rápido possível!
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Mensagem Enviada!</h3>
                  <p className="text-gray-600">
                    Obrigado por entrar em contato. Responderemos em breve.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Envie sua Mensagem</h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent transition-all"
                          placeholder="Seu nome"
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          E-mail *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent transition-all"
                          placeholder="seu@email.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Assunto *
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent transition-all"
                      >
                        <option value="">Selecione um assunto</option>
                        <option value="Suporte Técnico">Suporte Técnico</option>
                        <option value="Dúvidas sobre Planos">Dúvidas sobre Planos</option>
                        <option value="Integração">Integração</option>
                        <option value="Enterprise">Plano Enterprise</option>
                        <option value="Parceria">Parceria</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Mensagem *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        required
                        value={formData.message}
                        onChange={handleChange}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent transition-all resize-none"
                        placeholder="Como podemos ajudar você?"
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
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Enviar Mensagem
                        </>
                      )}
                    </button>

                    <p className="text-sm text-gray-500 text-center">
                      Ao enviar, você concorda com nossa{' '}
                      <a href="/privacidade" className="text-[#810707] hover:underline">
                        Política de Privacidade
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
