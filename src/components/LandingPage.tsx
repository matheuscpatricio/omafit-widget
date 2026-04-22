import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Lenis from '@studio-freight/lenis';
import { supabase } from '../lib/supabase';

import { Navbar } from './landing/Navbar';
import { Hero } from './landing/Hero';
import { Pain } from './landing/Pain';
import { ParallaxStoryBanner } from './landing/ParallaxStoryBanner';
import { Solution } from './landing/Solution';
import { Pricing } from './landing/Pricing';
import { FAQ } from './landing/FAQ';
import { FinalCTA } from './landing/FinalCTA';
import { Footer } from './landing/Footer';
import { LandingSEO } from './landing/LandingSEO';

interface LandingPageProps {
  onGetStarted: (priceId?: string) => void;
  /** Mantido para compatibilidade com rotas existentes; o cabeçalho da landing não exibe login. */
  onLogin?: () => void;
}

const paidPlanPriceIds: Record<'growth' | 'pro' | 'enterprise', string> = {
  growth: 'growth',
  pro: 'price_PRO_3000_IMAGES',
  enterprise: 'enterprise',
};

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const navigate = useNavigate();

  useEffect(() => {
    let lenis: Lenis | null = null;
    let rafId = 0;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const startLenis = () => {
      if (lenis) return;
      lenis = new Lenis({
        duration: 1.45,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    };

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => startLenis(), { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(() => startLenis(), 400);
    }

    return () => {
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
      lenis?.destroy();
    };
  }, []);

  const handleInstallShopify = () => {
    onGetStarted('free');
  };

  const handleSelectPaidPlan = async (plan: 'growth' | 'pro' | 'enterprise') => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      navigate('/dashboard');
      return;
    }
    onGetStarted(paidPlanPriceIds[plan]);
  };

  const handleRequestDemo = () => {
    const subject = encodeURIComponent('Demonstração personalizada - Omafit');
    const body = encodeURIComponent(
      'Olá, gostaria de agendar uma demonstração personalizada do Omafit para minha loja.\n\nNome da loja:\nCategoria (roupas / calçados / acessórios):\nVolume mensal estimado:\nMelhor horário para call:',
    );
    window.location.href = `mailto:contato@omafit.co?subject=${subject}&body=${body}`;
  };

  const handleScheduleDemo = handleRequestDemo;

  return (
    <div className="min-h-screen bg-white text-ink-800 font-sans antialiased" style={{ colorScheme: 'light' }}>
      <LandingSEO />
      <Navbar onInstall={handleInstallShopify} />

      <main className="relative">
        <Hero
          onInstallShopify={handleInstallShopify}
          onRequestDemo={handleRequestDemo}
        />

        <Pain />

        <ParallaxStoryBanner />

        <Solution />

        <Pricing onSelectFree={handleInstallShopify} onSelectPaidPlan={handleSelectPaidPlan} />

        <FAQ />

        <FinalCTA
          onInstallShopify={handleInstallShopify}
          onScheduleDemo={handleScheduleDemo}
        />
      </main>

      <Footer />
    </div>
  );
}
