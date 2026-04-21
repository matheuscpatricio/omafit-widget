import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Lenis from '@studio-freight/lenis';
import { supabase } from '../lib/supabase';

import { Navbar } from './landing/Navbar';
import { Hero } from './landing/Hero';
import { Pain } from './landing/Pain';
import { Solution } from './landing/Solution';
import { Pricing } from './landing/Pricing';
import { FAQ } from './landing/FAQ';
import { FinalCTA } from './landing/FinalCTA';
import { Footer } from './landing/Footer';
import { PricingModal } from './PricingModal';

interface LandingPageProps {
  onGetStarted: (priceId?: string) => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const navigate = useNavigate();
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (showPricingModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showPricingModal]);

  const handleInstallShopify = () => {
    onGetStarted('free');
  };

  const handleSelectPro = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate('/dashboard');
    } else {
      setShowPricingModal(true);
    }
  };

  const handleRequestDemo = () => {
    const subject = encodeURIComponent('Demonstração personalizada - Omafit');
    const body = encodeURIComponent(
      'Olá, gostaria de agendar uma demonstração personalizada do Omafit para minha loja.\n\nNome da loja:\nCategoria (roupas / calçados / acessórios):\nVolume mensal estimado:\nMelhor horário para call:',
    );
    window.location.href = `mailto:contato@omafit.co?subject=${subject}&body=${body}`;
  };

  const handleScheduleDemo = handleRequestDemo;

  const handleSelectPlan = (priceId: string) => {
    setShowPricingModal(false);
    onGetStarted(priceId);
  };

  return (
    <div className="min-h-screen bg-white text-ink-800 font-sans antialiased" style={{ colorScheme: 'light' }}>
      <Navbar onInstall={handleInstallShopify} onLogin={onLogin} />

      <main className="relative">
        <Hero
          onInstallShopify={handleInstallShopify}
          onRequestDemo={handleRequestDemo}
        />

        <Pain />

        <Solution />

        <Pricing
          onSelectFree={handleInstallShopify}
          onSelectPro={handleSelectPro}
        />

        <FAQ />

        <FinalCTA
          onInstallShopify={handleInstallShopify}
          onScheduleDemo={handleScheduleDemo}
        />
      </main>

      <Footer />

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onSelectPlan={handleSelectPlan}
        locale="pt"
      />
    </div>
  );
}
