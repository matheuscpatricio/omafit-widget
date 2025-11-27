import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle } from 'lucide-react';

export function FeedbackPage() {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    name: '',
    email: ''
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const subjects = [
    'Sugestão de Nova Funcionalidade',
    'Melhoria de Interface',
    'Problema Técnico',
    'Feedback Geral',
    'Integração com Plataforma',
    'Documentação',
    'Outro'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject || !formData.message || !formData.name || !formData.email) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    setSending(true);

    try {
      const emailBody = `
Nome: ${formData.name}
Email: ${formData.email}
Assunto: ${formData.subject}

Mensagem:
${formData.message}
      `.trim();

      const mailtoLink = `mailto:contato@omafit.com.br?subject=${encodeURIComponent(`[Feedback] ${formData.subject}`)}&body=${encodeURIComponent(emailBody)}`;

      window.location.href = mailtoLink;

      setSent(true);
      setFormData({
        subject: '',
        message: '',
        name: '',
        email: ''
      });

      setTimeout(() => setSent(false), 5000);
    } catch (error) {
      console.error('Error sending feedback:', error);
      alert('Erro ao enviar sugestão. Por favor, tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sugestões e Melhorias</h2>
            <p className="text-sm text-gray-600">
              Sua opinião é muito importante para nós!
            </p>
          </div>
        </div>

        {sent && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800">
              Obrigado pelo seu feedback! Seu cliente de email foi aberto. Por favor, envie o email para completar o envio.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Seu nome"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Assunto
            </label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione um assunto</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Mensagem
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Descreva sua sugestão ou feedback com o máximo de detalhes possível..."
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 Dica: Seja o mais específico possível em sua sugestão. Descreva o problema que você está tentando resolver ou a melhoria que gostaria de ver.
            </p>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#810707] text-white rounded-lg hover:bg-[#a00909] disabled:bg-gray-400 transition-colors font-medium"
          >
            <Send className="w-5 h-5" />
            {sending ? 'Enviando...' : 'Enviar Sugestão'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Você também pode nos contatar diretamente em{' '}
            <a href="mailto:contato@omafit.com.br" className="text-blue-600 hover:underline">
              contato@omafit.com.br
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
