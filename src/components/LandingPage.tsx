import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Lenis from '@studio-freight/lenis';
import { supabase } from '../lib/supabase';

import { Navbar } from './landing/Navbar';
import { Hero } from './landing/Hero';
import { Pain } from './landing/Pain';
import { PainSolutionVideo } from './landing/PainSolutionVideo';
import { HowItWorks } from './landing/HowItWorks';
import { Solution } from './landing/Solution';
import { ImpactStats } from './landing/ImpactStats';
import { Pricing } from './landing/Pricing';
import { FAQ } from './landing/FAQ';
import { Footer } from './landing/Footer';
import { LandingSEO } from './landing/LandingSEO';
import { InstallPlatformModal } from './landing/InstallPlatformModal';
import { useLandingLocale } from '../contexts/LandingLocaleContext';

interface LandingPageProps {
  onGetStarted: (priceId?: string) => void;
  /** Mantido para compatibilidade com rotas existentes; o cabeçalho da landing não exibe login. */
  onLogin?: () => void;
}

const paidPlanPriceIds: Record<'growth' | 'pro' | 'scale' | 'enterprise', string> = {
  growth: 'growth',
  pro: 'pro',
  scale: 'scale',
  enterprise: 'enterprise',
};

function LandingPageContent({ onGetStarted }: LandingPageProps) {
  const navigate = useNavigate();
  const { t } = useLandingLocale();
  const [installModalOpen, setInstallModalOpen] = useState(false);

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
    onGetStarted('growth');
  };

  const handleSelectPaidPlan = async (plan: 'growth' | 'pro' | 'scale' | 'enterprise') => {
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
    const subject = encodeURIComponent(t.demoEmail.subject);
    const body = encodeURIComponent(t.demoEmail.body);
    window.location.href = `mailto:contato@omafit.co?subject=${subject}&body=${body}`;
  };

  return (
    <div
      className="landing-page min-h-screen bg-oma-canvas text-oma-cream antialiased"
      style={{ colorScheme: 'dark' }}
    >
      <LandingSEO />
      <InstallPlatformModal
        open={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        onSelectShopify={handleInstallShopify}
      />
      <Navbar onOpenInstallModal={() => setInstallModalOpen(true)} />

      <main className="relative">
        <Hero
          onOpenInstallModal={() => setInstallModalOpen(true)}
          onRequestDemo={handleRequestDemo}
        />

        <Pain />

        <PainSolutionVideo />

        <HowItWorks />

        <Solution />

        <ImpactStats />

        <Pricing onSelectPaidPlan={handleSelectPaidPlan} />

        <FAQ />
      </main>

      <Footer />
    </div>
  );
}

export function LandingPage(props: LandingPageProps) {
  return <LandingPageContent {...props} />;
}
