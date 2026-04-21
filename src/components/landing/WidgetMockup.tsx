import { motion } from 'framer-motion';
import { Sparkles, Ruler, Shirt, Check } from 'lucide-react';
import { useState } from 'react';

const FALLBACK_IMAGE = '/images/omafit-widget-mockup.png';

export function WidgetMockup() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="relative w-full max-w-[560px] mx-auto">
      {/* Glow de fundo */}
      <motion.div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-[48px] blur-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.4 }}
        style={{
          background:
            'radial-gradient(60% 60% at 50% 40%, rgba(129,7,7,0.18) 0%, rgba(129,7,7,0.06) 45%, transparent 70%)',
        }}
      />

      {/* Floating container */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
          className="relative"
        >
          {/* Caso exista imagem real */}
          {!imgFailed && (
            <img
              src={FALLBACK_IMAGE}
              onError={() => setImgFailed(true)}
              alt="Mockup do widget Omafit"
              className="w-full h-auto rounded-3xl shadow-[0_40px_80px_-20px_rgba(26,26,26,0.35)] ring-1 ring-black/5"
              draggable={false}
            />
          )}

          {/* Fallback: mockup CSS sofisticado */}
          {imgFailed && <CSSMockup />}
        </motion.div>
      </motion.div>
    </div>
  );
}

function CSSMockup() {
  return (
    <div className="relative">
      {/* Browser chrome */}
      <div className="rounded-3xl overflow-hidden ring-1 ring-black/5 shadow-[0_40px_80px_-20px_rgba(26,26,26,0.35)] bg-white">
        <div className="flex items-center gap-1.5 px-4 py-3 bg-[#FAFAFA] border-b border-black/5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <div className="ml-4 flex-1 h-6 rounded-md bg-white border border-black/5 text-[11px] text-ink-400 flex items-center px-3">
            sualoja.com/produto/vestido-midi
          </div>
        </div>

        {/* Store content com widget Omafit */}
        <div className="grid grid-cols-12 gap-4 p-5 bg-white">
          {/* Produto */}
          <div className="col-span-5">
            <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-ink-100 to-ink-200 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.9),transparent_60%)]" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-[10px] font-medium text-ink-600 bg-white/80 backdrop-blur px-2 py-1 rounded-full">
                  Vestido Midi
                </span>
                <span className="text-[10px] font-semibold text-[#810707] bg-white/80 backdrop-blur px-2 py-1 rounded-full">
                  R$ 289
                </span>
              </div>
            </div>
          </div>

          {/* Widget Omafit */}
          <div className="col-span-7 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#810707] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ink-800 leading-none">
                  Omafit Assistant
                </p>
                <p className="text-[9px] text-ink-400 mt-0.5">
                  Seu tamanho, sua confiança
                </p>
              </div>
              <span className="ml-auto text-[9px] font-medium text-emerald-600 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ativo
              </span>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <MockStep icon={<Ruler className="w-3 h-3" />} label="Medidas precisas" value="98% acurácia" done />
              <MockStep icon={<Shirt className="w-3 h-3" />} label="Try-On fotorrealista" value="Processando..." active />
              <MockStep icon={<Check className="w-3 h-3" />} label="Recomendação" value="Tamanho M" />
            </div>

            {/* CTA mock */}
            <div className="mt-1 rounded-lg bg-gradient-to-r from-[#810707] to-[#6b0505] p-0.5">
              <div className="rounded-[7px] bg-white px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-ink-800">Recomendado: M</p>
                  <p className="text-[9px] text-ink-400">caimento preciso no peito e quadril</p>
                </div>
                <button className="text-[10px] font-semibold text-white bg-[#810707] px-3 py-1.5 rounded-md">
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge 1 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        className="absolute -left-6 sm:-left-10 top-16 bg-white rounded-2xl shadow-elegant-lg border border-black/5 px-3 py-2.5 flex items-center gap-2"
      >
        <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-ink-800 leading-none">-42%</p>
          <p className="text-[9px] text-ink-400 mt-0.5">devoluções</p>
        </div>
      </motion.div>

      {/* Floating badge 2 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.3, duration: 0.6 }}
        className="absolute -right-4 sm:-right-8 bottom-10 bg-white rounded-2xl shadow-elegant-lg border border-black/5 px-3 py-2.5 flex items-center gap-2"
      >
        <div className="h-8 w-8 rounded-xl bg-[#810707]/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#810707]" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-ink-800 leading-none">+28%</p>
          <p className="text-[9px] text-ink-400 mt-0.5">conversão</p>
        </div>
      </motion.div>
    </div>
  );
}

function MockStep({
  icon,
  label,
  value,
  done,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border ${
        done
          ? 'bg-ink-50/80 border-black/5'
          : active
          ? 'bg-[#810707]/[0.03] border-[#810707]/20'
          : 'bg-white border-black/5'
      }`}
    >
      <div
        className={`h-6 w-6 rounded-lg flex items-center justify-center ${
          done
            ? 'bg-emerald-100 text-emerald-600'
            : active
            ? 'bg-[#810707] text-white'
            : 'bg-ink-100 text-ink-500'
        }`}
      >
        {done ? <Check className="w-3 h-3" /> : icon}
      </div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-[11px] font-medium text-ink-700">{label}</span>
        <span
          className={`text-[10px] ${
            done ? 'text-emerald-600 font-semibold' : active ? 'text-[#810707] font-semibold' : 'text-ink-400'
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
