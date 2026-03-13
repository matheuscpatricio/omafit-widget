import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, FileText } from 'lucide-react';

type PublicLocale = 'pt' | 'en' | 'es';

const detectPublicLocale = (): PublicLocale => {
  if (typeof window === 'undefined') return 'pt';
  const raw = (navigator.language || '').toLowerCase();
  if (raw.startsWith('es')) return 'es';
  if (raw.startsWith('en')) return 'en';
  return 'pt';
};

const privacyTranslations: Record<PublicLocale, Record<string, string>> = {
  pt: {
    back: 'Voltar',
    title: 'Política de Privacidade',
    updatedAt: 'Última atualização: 26 de novembro de 2025',
    introTitle: 'Introdução',
    introText: 'A Omafit ("nós", "nosso" ou "nos") está comprometida em proteger sua privacidade. Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações quando você usa nossa plataforma de try-on virtual com inteligência artificial.',
    collectTitle: 'Informações que Coletamos',
    accountInfo: 'Informações de Conta',
    accountItem1: 'Nome e e-mail',
    accountItem2: 'Informações de pagamento (processadas por terceiros seguros)',
    accountItem3: 'Informações da loja (URL da Shopify, Nuvemshop, etc.)',
    usageData: 'Dados de Uso',
    usageItem1: 'Imagens enviadas para try-on virtual',
    usageItem2: 'Produtos cadastrados',
    usageItem3: 'Análises e métricas de uso',
    usageItem4: 'Logs de acesso e atividades',
    technicalInfo: 'Informações Técnicas',
    technicalItem1: 'Endereço IP',
    technicalItem2: 'Tipo de navegador e dispositivo',
    technicalItem3: 'Cookies e tecnologias similares',
    useTitle: 'Como Usamos suas Informações',
    useItem1: 'Fornecer e manter nossos serviços de try-on virtual',
    useItem2: 'Processar transações e gerenciar assinaturas',
    useItem3: 'Melhorar e personalizar sua experiência',
    useItem4: 'Enviar notificações importantes sobre o serviço',
    useItem5: 'Analisar uso e tendências para melhorar a plataforma',
    useItem6: 'Detectar e prevenir fraudes e abusos',
    useItem7: 'Cumprir obrigações legais',
    imageTitle: 'Processamento de Imagens',
    imageText: 'As imagens enviadas para try-on virtual são processadas por nossa IA e parceiros tecnológicos. Nós:',
    imageItem1: 'Não vendemos ou compartilhamos imagens pessoais com terceiros para marketing',
    imageItem2: 'Armazenamos imagens apenas pelo tempo necessário para fornecer o serviço',
    imageItem3: 'Implementamos medidas de segurança para proteger suas imagens',
    imageItem4: 'Você pode solicitar a exclusão de suas imagens a qualquer momento',
    sharingTitle: 'Compartilhamento de Dados',
    sharingText: 'Compartilhamos suas informações apenas nas seguintes situações:',
    sharingItem1: 'Processadores de Pagamento:',
    sharingItem1Desc: 'Stripe para processar pagamentos de forma segura',
    sharingItem2: 'Provedores de IA:',
    sharingItem2Desc: 'Serviços de processamento de imagens (com proteção de dados)',
    sharingItem3: 'Infraestrutura:',
    sharingItem3Desc: 'Supabase para armazenamento seguro de dados',
    sharingItem4: 'Requisitos Legais:',
    sharingItem4Desc: 'Quando exigido por lei ou para proteger nossos direitos',
    securityTitle: 'Segurança de Dados',
    securityText: 'Implementamos medidas técnicas e organizacionais para proteger suas informações:',
    securityItem1: 'Criptografia de dados em trânsito e em repouso',
    securityItem2: 'Controle de acesso baseado em funções (RBAC)',
    securityItem3: 'Monitoramento contínuo de segurança',
    securityItem4: 'Auditorias regulares de segurança',
    securityItem5: 'Políticas de segurança de nível Row Level Security (RLS)',
    rightsTitle: 'Seus Direitos (LGPD)',
    rightsText: 'De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:',
    rightsItem1: 'Confirmar a existência de tratamento de dados',
    rightsItem2: 'Acessar seus dados pessoais',
    rightsItem3: 'Corrigir dados incompletos, inexatos ou desatualizados',
    rightsItem4: 'Solicitar a anonimização, bloqueio ou eliminação de dados',
    rightsItem5: 'Solicitar a portabilidade dos dados',
    rightsItem6: 'Revogar consentimento',
    rightsItem7: 'Solicitar informações sobre compartilhamento de dados',
    rightsContact: 'Para exercer seus direitos, entre em contato conosco em:',
    retentionTitle: 'Retenção de Dados',
    retentionText: 'Mantemos suas informações pelo tempo necessário para fornecer nossos serviços e cumprir obrigações legais. Imagens de try-on são retidas por no máximo 90 dias, a menos que você solicite exclusão antecipada.',
    cookiesTitle: 'Cookies',
    cookiesText: 'Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso da plataforma e personalizar conteúdo. Você pode gerenciar preferências de cookies nas configurações do seu navegador.',
    minorsTitle: 'Privacidade de Menores',
    minorsText: 'Nossa plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente informações de menores. Se você acredita que coletamos dados de um menor, entre em contato conosco imediatamente.',
    changesTitle: 'Alterações nesta Política',
    changesText: 'Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas por e-mail ou por meio de um aviso em nossa plataforma.',
    contactTitle: 'Contato',
    contactText: 'Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados, entre em contato:',
    emailLabel: 'E-mail:',
  },
  en: {
    back: 'Back',
    title: 'Privacy Policy',
    updatedAt: 'Last updated: November 26, 2025',
    introTitle: 'Introduction',
    introText: 'Omafit ("we", "our" or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose and protect your information when you use our AI-powered virtual try-on platform.',
    collectTitle: 'Information We Collect',
    accountInfo: 'Account Information',
    accountItem1: 'Name and email',
    accountItem2: 'Payment information (processed by secure third parties)',
    accountItem3: 'Store information (Shopify URL, Nuvemshop, etc.)',
    usageData: 'Usage Data',
    usageItem1: 'Images uploaded for virtual try-on',
    usageItem2: 'Registered products',
    usageItem3: 'Usage analytics and metrics',
    usageItem4: 'Access and activity logs',
    technicalInfo: 'Technical Information',
    technicalItem1: 'IP address',
    technicalItem2: 'Browser and device type',
    technicalItem3: 'Cookies and similar technologies',
    useTitle: 'How We Use Your Information',
    useItem1: 'Provide and maintain our virtual try-on services',
    useItem2: 'Process transactions and manage subscriptions',
    useItem3: 'Improve and personalize your experience',
    useItem4: 'Send important service notifications',
    useItem5: 'Analyze usage and trends to improve the platform',
    useItem6: 'Detect and prevent fraud and abuse',
    useItem7: 'Comply with legal obligations',
    imageTitle: 'Image Processing',
    imageText: 'Images uploaded for virtual try-on are processed by our AI and technology partners. We:',
    imageItem1: 'Do not sell or share personal images with third parties for marketing',
    imageItem2: 'Store images only for the time required to provide the service',
    imageItem3: 'Implement security measures to protect your images',
    imageItem4: 'You can request image deletion at any time',
    sharingTitle: 'Data Sharing',
    sharingText: 'We share your information only in the following situations:',
    sharingItem1: 'Payment Processors:',
    sharingItem1Desc: 'Stripe to process payments securely',
    sharingItem2: 'AI Providers:',
    sharingItem2Desc: 'Image processing services (with data protection)',
    sharingItem3: 'Infrastructure:',
    sharingItem3Desc: 'Supabase for secure data storage',
    sharingItem4: 'Legal Requirements:',
    sharingItem4Desc: 'When required by law or to protect our rights',
    securityTitle: 'Data Security',
    securityText: 'We implement technical and organizational measures to protect your information:',
    securityItem1: 'Data encryption in transit and at rest',
    securityItem2: 'Role-based access control (RBAC)',
    securityItem3: 'Continuous security monitoring',
    securityItem4: 'Regular security audits',
    securityItem5: 'Row Level Security (RLS) policies',
    rightsTitle: 'Your Rights (LGPD)',
    rightsText: 'Under the Brazilian General Data Protection Law (LGPD), you have the right to:',
    rightsItem1: 'Confirm the existence of data processing',
    rightsItem2: 'Access your personal data',
    rightsItem3: 'Correct incomplete, inaccurate or outdated data',
    rightsItem4: 'Request anonymization, blocking or deletion of data',
    rightsItem5: 'Request data portability',
    rightsItem6: 'Revoke consent',
    rightsItem7: 'Request information about data sharing',
    rightsContact: 'To exercise your rights, contact us at:',
    retentionTitle: 'Data Retention',
    retentionText: 'We keep your information for as long as necessary to provide our services and comply with legal obligations. Try-on images are retained for up to 90 days unless you request earlier deletion.',
    cookiesTitle: 'Cookies',
    cookiesText: 'We use cookies and similar technologies to improve your experience, analyze platform usage and personalize content. You can manage cookie preferences in your browser settings.',
    minorsTitle: 'Children Privacy',
    minorsText: 'Our platform is not intended for individuals under 18 years old. We do not knowingly collect data from minors. If you believe we collected such data, please contact us immediately.',
    changesTitle: 'Changes to this Policy',
    changesText: 'We may update this Privacy Policy periodically. We will notify you of significant changes by email or through a notice on our platform.',
    contactTitle: 'Contact',
    contactText: 'If you have questions about this Privacy Policy or how we handle your data, contact us:',
    emailLabel: 'Email:',
  },
  es: {
    back: 'Volver',
    title: 'Política de Privacidad',
    updatedAt: 'Última actualización: 26 de noviembre de 2025',
    introTitle: 'Introducción',
    introText: 'Omafit ("nosotros", "nuestro" o "nos") está comprometida con la protección de tu privacidad. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y protegemos tu información cuando usas nuestra plataforma de probador virtual con IA.',
    collectTitle: 'Información que Recopilamos',
    accountInfo: 'Información de Cuenta',
    accountItem1: 'Nombre y correo',
    accountItem2: 'Información de pago (procesada por terceros seguros)',
    accountItem3: 'Información de la tienda (URL de Shopify, Nuvemshop, etc.)',
    usageData: 'Datos de Uso',
    usageItem1: 'Imágenes enviadas para el probador virtual',
    usageItem2: 'Productos registrados',
    usageItem3: 'Análisis y métricas de uso',
    usageItem4: 'Registros de acceso y actividad',
    technicalInfo: 'Información Técnica',
    technicalItem1: 'Dirección IP',
    technicalItem2: 'Tipo de navegador y dispositivo',
    technicalItem3: 'Cookies y tecnologías similares',
    useTitle: 'Cómo Usamos tu Información',
    useItem1: 'Proveer y mantener nuestros servicios de probador virtual',
    useItem2: 'Procesar transacciones y gestionar suscripciones',
    useItem3: 'Mejorar y personalizar tu experiencia',
    useItem4: 'Enviar notificaciones importantes del servicio',
    useItem5: 'Analizar uso y tendencias para mejorar la plataforma',
    useItem6: 'Detectar y prevenir fraudes y abusos',
    useItem7: 'Cumplir obligaciones legales',
    imageTitle: 'Procesamiento de Imágenes',
    imageText: 'Las imágenes enviadas para el probador virtual son procesadas por nuestra IA y socios tecnológicos. Nosotros:',
    imageItem1: 'No vendemos ni compartimos imágenes personales con terceros para marketing',
    imageItem2: 'Almacenamos imágenes solo el tiempo necesario para prestar el servicio',
    imageItem3: 'Implementamos medidas de seguridad para proteger tus imágenes',
    imageItem4: 'Puedes solicitar la eliminación de tus imágenes en cualquier momento',
    sharingTitle: 'Compartición de Datos',
    sharingText: 'Compartimos tu información solo en las siguientes situaciones:',
    sharingItem1: 'Procesadores de Pago:',
    sharingItem1Desc: 'Stripe para procesar pagos de forma segura',
    sharingItem2: 'Proveedores de IA:',
    sharingItem2Desc: 'Servicios de procesamiento de imágenes (con protección de datos)',
    sharingItem3: 'Infraestructura:',
    sharingItem3Desc: 'Supabase para almacenamiento seguro de datos',
    sharingItem4: 'Requisitos Legales:',
    sharingItem4Desc: 'Cuando lo exige la ley o para proteger nuestros derechos',
    securityTitle: 'Seguridad de Datos',
    securityText: 'Implementamos medidas técnicas y organizativas para proteger tu información:',
    securityItem1: 'Cifrado de datos en tránsito y en reposo',
    securityItem2: 'Control de acceso basado en roles (RBAC)',
    securityItem3: 'Monitoreo continuo de seguridad',
    securityItem4: 'Auditorías regulares de seguridad',
    securityItem5: 'Políticas Row Level Security (RLS)',
    rightsTitle: 'Tus Derechos (LGPD)',
    rightsText: 'De acuerdo con la Ley General de Protección de Datos de Brasil (LGPD), tienes derecho a:',
    rightsItem1: 'Confirmar la existencia del tratamiento de datos',
    rightsItem2: 'Acceder a tus datos personales',
    rightsItem3: 'Corregir datos incompletos, inexactos o desactualizados',
    rightsItem4: 'Solicitar anonimización, bloqueo o eliminación de datos',
    rightsItem5: 'Solicitar portabilidad de datos',
    rightsItem6: 'Revocar consentimiento',
    rightsItem7: 'Solicitar información sobre compartición de datos',
    rightsContact: 'Para ejercer tus derechos, contáctanos en:',
    retentionTitle: 'Retención de Datos',
    retentionText: 'Conservamos tu información durante el tiempo necesario para prestar nuestros servicios y cumplir obligaciones legales. Las imágenes de try-on se conservan por un máximo de 90 días, salvo solicitud de eliminación anticipada.',
    cookiesTitle: 'Cookies',
    cookiesText: 'Usamos cookies y tecnologías similares para mejorar tu experiencia, analizar el uso de la plataforma y personalizar contenido. Puedes gestionar las preferencias de cookies en la configuración de tu navegador.',
    minorsTitle: 'Privacidad de Menores',
    minorsText: 'Nuestra plataforma no está destinada a menores de 18 años. No recopilamos intencionalmente datos de menores. Si crees que recopilamos estos datos, contáctanos de inmediato.',
    changesTitle: 'Cambios en esta Política',
    changesText: 'Podemos actualizar esta Política de Privacidad periódicamente. Te notificaremos cambios significativos por correo electrónico o mediante un aviso en nuestra plataforma.',
    contactTitle: 'Contacto',
    contactText: 'Si tienes dudas sobre esta Política de Privacidad o sobre cómo tratamos tus datos, contáctanos:',
    emailLabel: 'Correo:',
  }
};

export function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const locale = detectPublicLocale();
  const t = privacyTranslations[locale];

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
            <span>{t.back}</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#810707] to-red-700 rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-gray-600">{t.updatedAt}</p>
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
              <h2 className="text-2xl font-bold text-gray-900">{t.introTitle}</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              {t.introText}
            </p>
          </section>

          {/* Information Collection */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-[#810707]" />
              <h2 className="text-2xl font-bold text-gray-900">{t.collectTitle}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.accountInfo}</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>{t.accountItem1}</li>
                  <li>{t.accountItem2}</li>
                  <li>{t.accountItem3}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.usageData}</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>{t.usageItem1}</li>
                  <li>{t.usageItem2}</li>
                  <li>{t.usageItem3}</li>
                  <li>{t.usageItem4}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.technicalInfo}</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>{t.technicalItem1}</li>
                  <li>{t.technicalItem2}</li>
                  <li>{t.technicalItem3}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-[#810707]" />
              <h2 className="text-2xl font-bold text-gray-900">{t.useTitle}</h2>
            </div>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t.useItem1}</li>
              <li>{t.useItem2}</li>
              <li>{t.useItem3}</li>
              <li>{t.useItem4}</li>
              <li>{t.useItem5}</li>
              <li>{t.useItem6}</li>
              <li>{t.useItem7}</li>
            </ul>
          </section>

          {/* Image Processing */}
          <section>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">{t.imageTitle}</h3>
              <p className="text-gray-700 mb-3">
                {t.imageText}
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>{t.imageItem1}</li>
                <li>{t.imageItem2}</li>
                <li>{t.imageItem3}</li>
                <li>{t.imageItem4}</li>
              </ul>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.sharingTitle}</h2>
            <p className="text-gray-700 mb-3">{t.sharingText}</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>{t.sharingItem1}</strong> {t.sharingItem1Desc}</li>
              <li><strong>{t.sharingItem2}</strong> {t.sharingItem2Desc}</li>
              <li><strong>{t.sharingItem3}</strong> {t.sharingItem3Desc}</li>
              <li><strong>{t.sharingItem4}</strong> {t.sharingItem4Desc}</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.securityTitle}</h2>
            <p className="text-gray-700 mb-3">
              {t.securityText}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t.securityItem1}</li>
              <li>{t.securityItem2}</li>
              <li>{t.securityItem3}</li>
              <li>{t.securityItem4}</li>
              <li>{t.securityItem5}</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.rightsTitle}</h2>
            <p className="text-gray-700 mb-3">
              {t.rightsText}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t.rightsItem1}</li>
              <li>{t.rightsItem2}</li>
              <li>{t.rightsItem3}</li>
              <li>{t.rightsItem4}</li>
              <li>{t.rightsItem5}</li>
              <li>{t.rightsItem6}</li>
              <li>{t.rightsItem7}</li>
            </ul>
            <p className="text-gray-700 mt-4">
              {t.rightsContact} <a href="mailto:contato@omafit.co" className="text-[#810707] font-semibold hover:underline">contato@omafit.co</a>
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.retentionTitle}</h2>
            <p className="text-gray-700">
              {t.retentionText}
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.cookiesTitle}</h2>
            <p className="text-gray-700">
              {t.cookiesText}
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.minorsTitle}</h2>
            <p className="text-gray-700">
              {t.minorsText}
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.changesTitle}</h2>
            <p className="text-gray-700">
              {t.changesText}
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.contactTitle}</h2>
            <p className="text-gray-700 mb-4">
              {t.contactText}
            </p>
            <div className="space-y-2 text-gray-700">              
              <p><strong>{t.emailLabel}</strong> <a href="mailto:contato@omafit.co" className="text-[#810707] hover:underline">contato@omafit.co</a></p>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
