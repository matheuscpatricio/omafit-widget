import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
  q: string;
  a: string;
}

const faqs: FAQItem[] = [
  {
    q: 'Quanto tempo leva para instalar o Omafit na minha loja Shopify?',
    a: 'A instalação é feita em poucos cliques direto pela Shopify App Store e leva tipicamente menos de 5 minutos. Após instalar, nosso widget já aparece nas páginas de produto configuradas e você pode ajustar cores, fontes e posição no painel administrativo.',
  },
  {
    q: 'O Omafit funciona com quais plataformas?',
    a: 'Hoje oferecemos integração nativa com Shopify. Nuvemshop, WooCommerce e Yampi estão no roadmap e chegam em breve. Para integrações customizadas (ERP, headless, apps mobile), nosso time Enterprise atende sob demanda.',
  },
  {
    q: 'Como funciona a privacidade e segurança dos dados dos meus clientes?',
    a: 'Somos LGPD e GDPR compliant. A captura biométrica com MediaPipe roda 100% no dispositivo do cliente — nenhuma imagem bruta sai do navegador dele para nossos servidores sem consentimento explícito. Armazenamos apenas métricas anonimizadas e dados estritamente necessários para a operação.',
  },
  {
    q: 'A IA funciona com qualquer tipo de roupa ou produto?',
    a: 'Sim. Nosso modelo de try-on foi treinado para vestuário feminino e masculino (vestidos, camisetas, calças, jaquetas, etc.), calçados (tênis, sandálias, botas) e acessórios via AR (óculos, bonés, relógios). Para categorias muito específicas, podemos treinar um fine-tune dedicado para sua marca.',
  },
  {
    q: 'Como funciona a cobrança por imagem? Preciso me comprometer mensalmente?',
    a: 'A instalação na Shopify é gratuita. No On-Demand você tem 50 sessões de try-on incluídas para começar, 5 acessórios AR e US$ 0,18 por sessão de try-on adicional. Growth: US$ 89/mês (700 imagens, 20 AR), imagens extras a US$ 0,12. Pro: US$ 300/mês com 3.000 imagens de try-on (100 AR). Enterprise: US$ 600/mês com try-on e AR ilimitados. Sem taxas ocultas.',
  },
  {
    q: 'O Omafit afeta a velocidade de carregamento da minha loja?',
    a: 'Nosso widget é lazy-loaded e pesa menos de 50KB no bundle inicial. Ele só ativa a captura e processamento quando o cliente clica em "Provar". A performance da sua loja permanece intacta — validamos isso com Lighthouse e Core Web Vitals.',
  },
  {
    q: 'Que tipo de suporte eu recebo após instalar?',
    a: 'Quem usa o On-Demand tem acesso a documentação completa, tutoriais em vídeo e suporte por e-mail. Clientes Pro recebem suporte prioritário, onboarding guiado e canal direto via WhatsApp. Clientes Enterprise têm gerente de conta dedicado e SLA personalizado.',
  },
  {
    q: 'Posso personalizar o visual do widget para combinar com minha marca?',
    a: 'Completamente. Cores, fontes, layout, copy, textos dos botões, ícones e posição na página são todos customizáveis. Nosso objetivo é que o widget pareça nativo da sua loja, não uma ferramenta terceirizada. Não há branding "Powered by Omafit" visível para o cliente final.',
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative bg-oma-canvas py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="text-center"
        >
          <motion.span
            variants={itemVariants}
            className="landing-tagline inline-flex items-center gap-2 rounded-full border border-oma-line/40 bg-oma-elevated/80 px-3 py-1 text-[12px] font-medium text-oma-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-oma-accent" />
            Tire suas dúvidas
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            Perguntas Frequentes.
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-5 text-lg text-oma-muted"
          >
            Tudo que você precisa saber sobre instalação, segurança, integração e suporte.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mt-12 divide-y divide-oma-line/40 border-y border-oma-line/40"
        >
          {faqs.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div key={item.q} variants={itemVariants}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 sm:py-6 text-left group"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-base sm:text-lg font-medium transition-colors ${
                      isOpen ? 'text-oma-cream' : 'text-oma-cream/85 group-hover:text-oma-cream'
                    }`}
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex-shrink-0 h-8 w-8 grid place-items-center rounded-full transition-colors ${
                      isOpen
                        ? 'bg-oma-accent text-oma-cream'
                        : 'bg-oma-elevated text-oma-muted group-hover:bg-oma-line/30'
                    }`}
                  >
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 pr-10 text-[15px] leading-relaxed text-oma-muted">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-oma-muted">
            Ainda tem dúvidas?{' '}
            <a
              href="mailto:contato@omafit.co"
              className="font-medium text-oma-accent hover:underline underline-offset-4"
            >
              Fale com nosso time →
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
