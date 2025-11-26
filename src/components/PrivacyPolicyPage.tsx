import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, FileText } from 'lucide-react';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#810707] to-red-700 rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Política de Privacidade</h1>
              <p className="text-gray-600">Última atualização: 26 de novembro de 2025</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">

          {/* Introduction */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-[#810707]" />
              <h2 className="text-2xl font-bold text-gray-900">Introdução</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              A Omafit ("nós", "nosso" ou "nos") está comprometida em proteger sua privacidade.
              Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos
              suas informações quando você usa nossa plataforma de try-on virtual com inteligência artificial.
            </p>
          </section>

          {/* Information Collection */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-[#810707]" />
              <h2 className="text-2xl font-bold text-gray-900">Informações que Coletamos</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Informações de Conta</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Nome e e-mail</li>
                  <li>Informações de pagamento (processadas por terceiros seguros)</li>
                  <li>Informações da loja (URL da Shopify, Nuvemshop, etc.)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Dados de Uso</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Imagens enviadas para try-on virtual</li>
                  <li>Produtos cadastrados</li>
                  <li>Análises e métricas de uso</li>
                  <li>Logs de acesso e atividades</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Informações Técnicas</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Endereço IP</li>
                  <li>Tipo de navegador e dispositivo</li>
                  <li>Cookies e tecnologias similares</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-[#810707]" />
              <h2 className="text-2xl font-bold text-gray-900">Como Usamos suas Informações</h2>
            </div>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Fornecer e manter nossos serviços de try-on virtual</li>
              <li>Processar transações e gerenciar assinaturas</li>
              <li>Melhorar e personalizar sua experiência</li>
              <li>Enviar notificações importantes sobre o serviço</li>
              <li>Analisar uso e tendências para melhorar a plataforma</li>
              <li>Detectar e prevenir fraudes e abusos</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          {/* Image Processing */}
          <section>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Processamento de Imagens</h3>
              <p className="text-gray-700 mb-3">
                As imagens enviadas para try-on virtual são processadas por nossa IA e parceiros tecnológicos.
                Nós:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Não vendemos ou compartilhamos imagens pessoais com terceiros para marketing</li>
                <li>Armazenamos imagens apenas pelo tempo necessário para fornecer o serviço</li>
                <li>Implementamos medidas de segurança para proteger suas imagens</li>
                <li>Você pode solicitar a exclusão de suas imagens a qualquer momento</li>
              </ul>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Compartilhamento de Dados</h2>
            <p className="text-gray-700 mb-3">Compartilhamos suas informações apenas nas seguintes situações:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Processadores de Pagamento:</strong> Stripe para processar pagamentos de forma segura</li>
              <li><strong>Provedores de IA:</strong> Serviços de processamento de imagens (com proteção de dados)</li>
              <li><strong>Infraestrutura:</strong> Supabase para armazenamento seguro de dados</li>
              <li><strong>Requisitos Legais:</strong> Quando exigido por lei ou para proteger nossos direitos</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Segurança de Dados</h2>
            <p className="text-gray-700 mb-3">
              Implementamos medidas técnicas e organizacionais para proteger suas informações:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controle de acesso baseado em funções (RBAC)</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Auditorias regulares de segurança</li>
              <li>Políticas de segurança de nível Row Level Security (RLS)</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Seus Direitos (LGPD)</h2>
            <p className="text-gray-700 mb-3">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Confirmar a existência de tratamento de dados</li>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados</li>
              <li>Solicitar a portabilidade dos dados</li>
              <li>Revogar consentimento</li>
              <li>Solicitar informações sobre compartilhamento de dados</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Para exercer seus direitos, entre em contato conosco em: <a href="mailto:contato@omafit.co" className="text-[#810707] font-semibold hover:underline">contato@omafit.co</a>
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Retenção de Dados</h2>
            <p className="text-gray-700">
              Mantemos suas informações pelo tempo necessário para fornecer nossos serviços e cumprir
              obrigações legais. Imagens de try-on são retidas por no máximo 90 dias, a menos que você
              solicite exclusão antecipada.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies</h2>
            <p className="text-gray-700">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso
              da plataforma e personalizar conteúdo. Você pode gerenciar preferências de cookies nas
              configurações do seu navegador.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacidade de Menores</h2>
            <p className="text-gray-700">
              Nossa plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente
              informações de menores. Se você acredita que coletamos dados de um menor, entre em contato
              conosco imediatamente.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Alterações nesta Política</h2>
            <p className="text-gray-700">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre
              mudanças significativas por e-mail ou por meio de um aviso em nossa plataforma.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contato</h2>
            <p className="text-gray-700 mb-4">
              Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados,
              entre em contato:
            </p>
            <div className="space-y-2 text-gray-700">              
              <p><strong>E-mail:</strong> <a href="mailto:contato@omafit.co" className="text-[#810707] hover:underline">contato@omafit.co</a></p>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
