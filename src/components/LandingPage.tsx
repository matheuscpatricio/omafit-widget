import { useEffect, useState } from 'react';
import Lenis from '@studio-freight/lenis';

import { Navbar } from './landing/Navbar';
import { Hero } from './landing/Hero';
import { Pain } from './landing/Pain';
import { PainSolutionVideo } from './landing/PainSolutionVideo';
import { HowItWorks } from './landing/HowItWorks';
import { ScrollReveal } from './landing/ScrollReveal';
import { Solution } from './landing/Solution';
import { ImpactStats } from './landing/ImpactStats';
import { ShopperInsights } from './landing/ShopperInsights';
import { ClosingCta } from './landing/ClosingCta';
import { FAQ } from './landing/FAQ';
import { Footer } from './landing/Footer';
import { LandingSEO } from './landing/LandingSEO';
import { InstallPlatformModal } from './landing/InstallPlatformModal';

interface LandingPageProps {
  onGetStarted: (priceId?: string) => void;
  /** Mantido para compatibilidade com rotas existentes; o cabeçalho da landing não exibe login. */
  onLogin?: () => void;
}

function LandingPageContent({ onGetStarted }: LandingPageProps) {
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

  const handleRequestDemo = () => {
    window.open('https://cal.com/omafit/book-a-call', '_blank', 'noopener,noreferrer');
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

        <ScrollReveal>
          <Pain />
        </ScrollReveal>

        <ScrollReveal>
          <PainSolutionVideo />
        </ScrollReveal>

        <ScrollReveal>
          <HowItWorks />
        </ScrollReveal>

        <ScrollReveal>
          <Solution />
        </ScrollReveal>

        <ScrollReveal>
          <ImpactStats />
        </ScrollReveal>

        <ScrollReveal>
          <ShopperInsights />
        </ScrollReveal>

        <ScrollReveal>
          <ClosingCta
            onOpenInstallModal={() => setInstallModalOpen(true)}
            onRequestDemo={handleRequestDemo}
          />
        </ScrollReveal>

        <ScrollReveal>
          <FAQ />
        </ScrollReveal>
      </main>

      <ScrollReveal>
        <Footer />
      </ScrollReveal>
    </div>
  );
}

export function LandingPage(props: LandingPageProps) {
  return <LandingPageContent {...props} />;
}
