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
            'radial-gradient(60% 60% at 50% 40%, rgba(217,104,69,0.2) 0%, rgba(91,175,138,0.08) 45%, transparent 70%)',
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
              className="h-auto w-full rounded-3xl shadow-[0_40px_80px_-20px_rgba(22,16,10,0.45)] ring-1 ring-oma-line/40"
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
      <div className="overflow-hidden rounded-3xl bg-oma-parchment shadow-[0_40px_80px_-20px_rgba(22,16,10,0.45)] ring-1 ring-oma-line/40">
        <div className="flex items-center gap-1.5 border-b border-oma-line/40 bg-oma-light/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <div className="ml-4 flex h-6 flex-1 items-center rounded-md border border-oma-line/40 bg-oma-parchment px-3 font-dm-mono text-[11px] text-oma-muted">
            sualoja.com/produto/vestido-midi
          </div>
        </div>

        {/* Store content com widget Omafit */}
        <div className="grid grid-cols-12 gap-4 bg-oma-parchment p-5">
          {/* Produto */}
          <div className="col-span-5">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-oma-light to-oma-parchment">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.9),transparent_60%)]" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="rounded-full bg-oma-parchment/90 px-2 py-1 text-[10px] font-medium text-oma-ink backdrop-blur">
                  Vestido Midi
                </span>
                <span className="rounded-full bg-oma-parchment/90 px-2 py-1 font-dm-mono text-[10px] font-semibold text-[#5BAF8A] backdrop-blur">
                  R$ 289
                </span>
              </div>
            </div>
          </div>

          {/* Widget Omafit */}
          <div className="col-span-7 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-oma-accent">
                <Sparkles className="h-4 w-4 text-oma-cream" />
              </div>
              <div>
                <p className="text-[11px] font-semibold leading-none text-oma-ink">
                  Omafit Assistant
                </p>
                <p className="mt-0.5 text-[9px] text-oma-muted">
                  Seu tamanho, sua confiança
                </p>
              </div>
              <span className="ml-auto flex items-center gap-1 font-dm-mono text-[9px] font-medium text-oma-tech">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-oma-tech" />
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
            <div className="mt-1 rounded-lg bg-gradient-to-r from-oma-accent to-oma-accentDark p-0.5">
              <div className="flex items-center justify-between rounded-[7px] bg-oma-parchment px-3 py-2">
                <div>
                  <p className="text-[10px] font-semibold text-oma-ink">Recomendado: M</p>
                  <p className="text-[9px] text-oma-muted">caimento preciso no peito e quadril</p>
                </div>
                <button className="rounded-md bg-oma-accent px-3 py-1.5 text-[10px] font-semibold text-oma-cream">
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
        className="absolute -left-6 top-16 flex items-center gap-2 rounded-2xl border border-oma-line/40 bg-oma-parchment px-3 py-2.5 shadow-elegant-lg sm:-left-10"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-oma-tech/15">
          <Check className="h-4 w-4 text-oma-tech" />
        </div>
        <div>
          <p className="font-dm-mono text-[11px] font-semibold leading-none text-[#5BAF8A]">-42%</p>
          <p className="mt-0.5 text-[9px] text-oma-muted">devoluções</p>
        </div>
      </motion.div>

      {/* Floating badge 2 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.3, duration: 0.6 }}
        className="absolute -right-4 bottom-10 flex items-center gap-2 rounded-2xl border border-oma-line/40 bg-oma-parchment px-3 py-2.5 shadow-elegant-lg sm:-right-8"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-oma-accent/15">
          <Sparkles className="h-4 w-4 text-oma-accent" />
        </div>
        <div>
          <p className="font-dm-mono text-[11px] font-semibold leading-none text-[#5BAF8A]">+28%</p>
          <p className="mt-0.5 text-[9px] text-oma-muted">conversão</p>
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
          ? 'border-oma-line/40 bg-oma-light/90'
          : active
          ? 'border-oma-accent/25 bg-oma-accent/[0.06]'
          : 'border-oma-line/40 bg-oma-parchment'
      }`}
    >
      <div
        className={`h-6 w-6 rounded-lg flex items-center justify-center ${
          done
            ? 'bg-oma-tech/15 text-oma-tech'
            : active
            ? 'bg-oma-accent text-oma-cream'
            : 'bg-oma-light text-oma-muted'
        }`}
      >
        {done ? <Check className="w-3 h-3" /> : icon}
      </div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-[11px] font-medium text-oma-ink">{label}</span>
        <span
          className={`font-dm-mono text-[10px] ${
            done ? 'font-semibold text-[#5BAF8A]' : active ? 'font-semibold text-[#5BAF8A]' : 'text-oma-muted'
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
