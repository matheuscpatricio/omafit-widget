import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Camera, Loader2, MessageCircle, Send, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { OmafitLogo } from './OmafitLogo';
import { LANDING_IMAGES } from '../../lib/site';
import { cn } from '../../lib/utils';

const DEMO_PRODUCT_NAME = 'Peça demo — landing';
const DEMO_PRODUCT_ID = 'landing-widget-demo';

function getLandingTryonConfig() {
  const publicId = String(import.meta.env.VITE_LANDING_TRYON_PUBLIC_ID || '').trim();
  const shopDomain = String(import.meta.env.VITE_LANDING_TRYON_SHOP_DOMAIN || '').trim();
  return { publicId, shopDomain, configured: Boolean(publicId && shopDomain) };
}

function garmentAbsoluteUrl(): string {
  if (typeof window === 'undefined') return LANDING_IMAGES.midBanner;
  return `${window.location.origin}${LANDING_IMAGES.midBanner}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('Falha ao ler a foto'));
    r.readAsDataURL(file);
  });
}

function estimateCm(
  gender: 'female' | 'male' | 'unisex',
  weight: number,
  bodyTypeIndex: number,
): { peito: number; cintura: number; quadril: number } {
  const bt = bodyTypeIndex || 0;
  if (gender === 'female') {
    return {
      peito: Math.round(80 + (weight - 50) * 0.5 + bt * 5),
      cintura: Math.round(60 + (weight - 50) * 0.6 + bt * 4),
      quadril: Math.round(85 + (weight - 50) * 0.6 + bt * 5),
    };
  }
  return {
    peito: Math.round(90 + (weight - 60) * 0.6 + bt * 6),
    cintura: Math.round(75 + (weight - 60) * 0.7 + bt * 5),
    quadril: Math.round(90 + (weight - 60) * 0.6 + bt * 5),
  };
}

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

type ChatMsg = { role: 'user' | 'assistant'; content: string };

export function LandingWidgetDemo() {
  const { publicId, shopDomain, configured } = useMemo(() => getLandingTryonConfig(), []);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(`landing_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const tryonRunIdRef = useRef(0);

  const [gender, setGender] = useState<'female' | 'male' | 'unisex'>('female');
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(65);
  const [modelPreview, setModelPreview] = useState<string | null>(null);
  const [modelDataUrl, setModelDataUrl] = useState<string | null>(null);

  const [tryonLoading, setTryonLoading] = useState(false);
  const [tryonError, setTryonError] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [gptLoading, setGptLoading] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPolling(), [clearPolling]);

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    setTryonError('');
    const url = URL.createObjectURL(f);
    setModelPreview(url);
    void readFileAsDataUrl(f).then(setModelDataUrl).catch(() => setTryonError('Não foi possível ler a imagem.'));
  };

  useEffect(() => {
    return () => {
      if (modelPreview?.startsWith('blob:')) URL.revokeObjectURL(modelPreview);
    };
  }, [modelPreview]);

  const startPolling = useCallback(
    (predictionId: string, runId: number) => {
      clearPolling();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      pollRef.current = setInterval(async () => {
        if (tryonRunIdRef.current !== runId) return;
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/tryon-status/${predictionId}`, {
            headers: { Authorization: `Bearer ${anon}` },
          });
          if (!res.ok) return;
          const data = (await res.json()) as {
            status?: string;
            output?: string[] | string;
          };
          if (data.status === 'completed' && data.output) {
            const url = Array.isArray(data.output) ? data.output[0] : data.output;
            if (url) {
              clearPolling();
              setResultImage(String(url));
              setTryonLoading(false);
            }
          } else if (data.status === 'failed' || data.status === 'error') {
            clearPolling();
            setTryonError('O try-on não foi concluído. Tenta com outra foto ou verifica a configuração da loja.');
            setTryonLoading(false);
          }
        } catch {
          /* next poll */
        }
      }, 2800);

      timeoutRef.current = setTimeout(() => {
        if (tryonRunIdRef.current !== runId) return;
        clearPolling();
        setTryonError((prev) => prev || 'Tempo limite do try-on. Tenta novamente.');
        setTryonLoading(false);
      }, 300_000);
    },
    [clearPolling],
  );

  const runTryOn = async () => {
    setTryonError('');
    if (!configured) {
      setTryonError(
        'Configura em .env as variáveis VITE_LANDING_TRYON_PUBLIC_ID e VITE_LANDING_TRYON_SHOP_DOMAIN (widget ativo na tua base).',
      );
      return;
    }
    if (!modelDataUrl) {
      setTryonError('Envia uma foto tua em pé (frente) para gerar o try-on.');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    clearPolling();
    setTryonLoading(true);
    setResultImage(null);
    setChatMessages([]);
    setInteractionCount(0);
    const runId = ++tryonRunIdRef.current;

    const recommendedSize = 'M';
    const payload = {
      shop_domain: shopDomain,
      collection_type: 'upper',
      model_image: modelDataUrl,
      garment_image: garmentAbsoluteUrl(),
      product_name: DEMO_PRODUCT_NAME,
      product_id: DEMO_PRODUCT_ID,
      public_id: publicId,
      user_measurements: {
        gender,
        height: heightCm,
        weight: weightKg,
        body_type_index: 1,
        fit_preference_index: 1,
        recommended_size: recommendedSize,
      },
      pose_landmarks: null,
      detected_measurements: null,
    };

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/tryon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `Erro ${response.status}`);
      }
      if (result?.tryon_disabled === true) {
        throw new Error('Try-on está desativado para esta loja no painel.');
      }
      if (result.success && result.fal_request_id) {
        startPolling(String(result.fal_request_id), runId);
      } else {
        throw new Error(result.error || 'Resposta inesperada do servidor.');
      }
    } catch (e: unknown) {
      clearPolling();
      setTryonLoading(false);
      setTryonError(e instanceof Error ? e.message : 'Erro ao iniciar o try-on.');
    }
  };

  const sendGpt = async (textRaw: string) => {
    const text = String(textRaw || '').trim();
    if (!text || gptLoading || !resultImage) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const est = estimateCm(gender, weightKg, 1);

    const nextHistory: ChatMsg[] = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(nextHistory);
    setChatInput('');
    setGptLoading(true);

    const payload = {
      altura_cm: heightCm,
      peso_kg: weightKg,
      peito_cm: est.peito,
      cintura_cm: est.cintura,
      quadril_cm: est.quadril,
      tipo_corpo: 'regular',
      ajuste_preferido: 'regular',
      genero: gender,
      elasticidade: 'light_flex',
      categoria: 'upper',
      tamanho_calculado_algoritmo: 'M',
      intencao_usuario: 'custom_message',
      custom_message: text,
      session_id: sessionIdRef.current,
      interaction_count: interactionCount,
      shop_name: 'Omafit',
      shop_domain: shopDomain,
      language: 'pt',
      product_name: DEMO_PRODUCT_NAME,
      product_description: 'Demonstração na landing Omafit.',
      available_sizes: ['P', 'M', 'G', 'GG'],
      available_colors: ['#16100A', '#F6F0E2'],
      selected_image: garmentAbsoluteUrl(),
      variant_catalog: [] as unknown[],
      chat_history: nextHistory
        .filter((m) => m.content.trim())
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content.trim() })),
    };

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/validate-size`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anon}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const raw = await response.text();
      let parsed: {
        success?: boolean;
        data?: { explicacao?: string; tamanho_final?: string };
        interaction_count?: number;
        message?: string;
      } = {};
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error('Resposta inválida do consultor.');
      }

      if (!response.ok || !parsed.success || !parsed.data) {
        throw new Error(parsed.message || 'Erro ao falar com o consultor.');
      }

      const explicacao = String(parsed.data.explicacao || '').trim();
      if (!explicacao) throw new Error('Resposta vazia do consultor.');

      setChatMessages((prev) => [...prev, { role: 'assistant', content: explicacao }]);
      if (typeof parsed.interaction_count === 'number') {
        setInteractionCount(parsed.interaction_count);
      } else {
        setInteractionCount((n) => n + 1);
      }
    } catch (e: unknown) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            e instanceof Error
              ? e.message
              : 'Não foi possível obter resposta do consultor. Tenta de novo.',
        },
      ]);
    } finally {
      setGptLoading(false);
    }
  };

  return (
    <section
      id="demo-widget"
      className="relative scroll-mt-20 border-y border-oma-line/35 bg-gradient-to-b from-oma-elevated/40 via-oma-canvas to-oma-canvas py-16 sm:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(217,104,69,0.07),transparent)]" />
      <div className="relative z-[1] mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="text-center"
        >
          <motion.span
            variants={itemVariants}
            className="landing-tagline inline-flex items-center gap-2 rounded-full border border-oma-accent/35 bg-oma-accent/10 px-3 py-1 text-[12px] font-medium text-oma-accent"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Demonstração ao vivo
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-4 text-2xl font-semibold tracking-tight text-oma-cream sm:text-3xl lg:text-4xl"
            style={{ letterSpacing: '-0.03em' }}
          >
            Experimente o widget Omafit
          </motion.h2>
          <motion.p variants={itemVariants} className="mx-auto mt-3 max-w-2xl text-oma-muted sm:text-lg">
            Try-on real na infraestrutura Omafit e consultor por IA (mesmas edge functions do produto).
          </motion.p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="mt-10 overflow-hidden rounded-2xl border border-oma-line/40 bg-oma-elevated/90 shadow-elegant-lg sm:rounded-3xl"
        >
          {/* Barra tipo widget */}
          <div className="flex items-center justify-between gap-3 border-b border-oma-line/40 bg-oma-canvas/95 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <OmafitLogo variant="onDark" className="shrink-0 text-lg sm:text-xl" />
              <span className="truncate text-xs font-medium text-oma-muted sm:text-sm">Provador · demo</span>
            </div>
            <span className="shrink-0 rounded-full border border-oma-line/50 bg-oma-elevated px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-oma-cream/90">
              Beta
            </span>
          </div>

          <div className="grid gap-6 p-4 sm:gap-8 sm:p-6 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wider text-oma-muted">Peça</p>
              <div className="overflow-hidden rounded-xl border border-oma-line/40 bg-oma-canvas">
                <img
                  src={LANDING_IMAGES.midBanner}
                  alt=""
                  className="aspect-[3/4] w-full object-cover object-center"
                  decoding="async"
                />
              </div>
              <p className="text-center text-[11px] leading-snug text-oma-muted">{DEMO_PRODUCT_NAME}</p>
            </div>

            <div className="min-w-0 space-y-4">
              {!configured && (
                <div className="rounded-xl border border-oma-accent/35 bg-oma-accent/10 px-3 py-2.5 text-left text-sm text-oma-cream">
                  Define <code className="rounded bg-black/25 px-1 py-0.5 text-xs">VITE_LANDING_TRYON_PUBLIC_ID</code>{' '}
                  e{' '}
                  <code className="rounded bg-black/25 px-1 py-0.5 text-xs">VITE_LANDING_TRYON_SHOP_DOMAIN</code> no
                  env (widget ativo e loja Shopify associada), depois faz build de novo.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm text-oma-muted">
                  Altura (cm)
                  <input
                    type="number"
                    min={120}
                    max={220}
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value) || 170)}
                    className="mt-1 w-full rounded-lg border border-oma-line/50 bg-oma-canvas px-3 py-2 text-oma-cream outline-none focus:border-oma-accent/50"
                  />
                </label>
                <label className="block text-sm text-oma-muted">
                  Peso (kg)
                  <input
                    type="number"
                    min={35}
                    max={200}
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value) || 65)}
                    className="mt-1 w-full rounded-lg border border-oma-line/50 bg-oma-canvas px-3 py-2 text-oma-cream outline-none focus:border-oma-accent/50"
                  />
                </label>
                <label className="block text-sm text-oma-muted">
                  Perfil
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as typeof gender)}
                    className="mt-1 w-full rounded-lg border border-oma-line/50 bg-oma-canvas px-3 py-2 text-oma-cream outline-none focus:border-oma-accent/50"
                  >
                    <option value="female">Feminino</option>
                    <option value="male">Masculino</option>
                    <option value="unisex">Unissex</option>
                  </select>
                </label>
              </div>

              <div>
                <p className="text-sm text-oma-muted">A tua foto (corpo inteiro, de frente)</p>
                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-oma-line/55 bg-oma-canvas/80 px-4 py-8 transition hover:border-oma-accent/40 hover:bg-oma-canvas">
                  <input type="file" accept="image/*" className="sr-only" onChange={onPickPhoto} />
                  {modelPreview ? (
                    <img
                      src={modelPreview}
                      alt=""
                      className="max-h-48 w-auto max-w-full rounded-lg object-contain shadow-elegant"
                    />
                  ) : (
                    <>
                      <Camera className="h-8 w-8 text-oma-accent" />
                      <span className="text-sm text-oma-cream">Toca para escolher foto</span>
                    </>
                  )}
                </label>
              </div>

              {tryonError && (
                <p className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {tryonError}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={tryonLoading || !modelDataUrl || !configured}
                  onClick={() => void runTryOn()}
                  className="min-w-[180px]"
                >
                  {tryonLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A gerar…
                    </>
                  ) : (
                    'Gerar try-on'
                  )}
                </Button>
              </div>

              {resultImage && (
                <div className="space-y-4 border-t border-oma-line/35 pt-4">
                  <p className="text-sm font-medium text-oma-cream">Resultado</p>
                  <div className="overflow-hidden rounded-xl border border-oma-line/40 bg-black/20">
                    <img src={resultImage} alt="Resultado try-on" className="w-full object-contain max-h-[min(70vh,520px)]" />
                  </div>

                  <div className="rounded-xl border border-oma-line/40 bg-oma-canvas/60 p-3 sm:p-4">
                    <div className="mb-2 flex items-center gap-2 text-oma-accent">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm font-semibold">Consultor (GPT)</span>
                    </div>
                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1 text-sm">
                      {chatMessages.length === 0 && (
                        <p className="text-oma-muted">
                          Pergunta o que combina com a peça, tamanho, ocasião… Usa o mesmo motor{' '}
                          <code className="text-xs text-oma-cream/80">validate-size</code> do widget.
                        </p>
                      )}
                      {chatMessages.map((m, i) => (
                        <div
                          key={`${i}-${m.role}`}
                          className={cn(
                            'rounded-lg px-3 py-2',
                            m.role === 'user'
                              ? 'ml-6 bg-oma-accent/15 text-oma-cream'
                              : 'mr-4 border border-oma-line/35 bg-oma-elevated/90 text-oma-cream/95',
                          )}
                        >
                          {m.content}
                        </div>
                      ))}
                      {gptLoading && (
                        <div className="flex items-center gap-2 text-oma-muted">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          A pensar…
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-oma-line/50 bg-oma-elevated px-3 py-1 text-xs text-oma-cream hover:border-oma-accent/40"
                        onClick={() =>
                          void sendGpt('Sugere um look simples para combinar com esta peça na demo da landing.')
                        }
                        disabled={gptLoading}
                      >
                        Sugestão de look
                      </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void sendGpt(chatInput);
                        }}
                        placeholder="Escreve uma pergunta ao consultor…"
                        className="min-w-0 flex-1 rounded-lg border border-oma-line/50 bg-oma-canvas px-3 py-2 text-sm text-oma-cream outline-none placeholder:text-oma-muted focus:border-oma-accent/45"
                        disabled={gptLoading}
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        disabled={gptLoading || !chatInput.trim()}
                        onClick={() => void sendGpt(chatInput)}
                        className="shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
