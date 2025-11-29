import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, TrendingUp, RefreshCw, Users, ShoppingBag, Star, Check, Play, Pause, Mail, DollarSign, Package } from 'lucide-react';
import { PlanCalculator } from './PlanCalculator';
import { PricingModal } from './PricingModal';
import { supabase } from '../lib/supabase';

interface LandingPageProps {
  onGetStarted: (priceId?: string) => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [showHeader, setShowHeader] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const videoDesktopRef = useRef<HTMLVideoElement>(null);
  const videoMobileRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      // Show header after scrolling past the video hero section
      setShowHeader(currentScrollY > window.innerHeight * 0.8);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const animatedElements = document.querySelectorAll('[data-animate]');
    animatedElements.forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (showVideoModal || showPricingModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showVideoModal, showPricingModal]);

  const handleOpenPricingModal = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      navigate('/dashboard');
    } else {
      setShowPricingModal(true);
    }
  };

  const handleSelectPlan = (priceId: string) => {
    setShowPricingModal(false);
    onGetStarted(priceId);
  };

  const toggleVideoPlayback = () => {
    const desktopVideo = videoDesktopRef.current;
    const mobileVideo = videoMobileRef.current;

    if (desktopVideo && mobileVideo) {
      if (isVideoPlaying) {
        desktopVideo.pause();
        mobileVideo.pause();
      } else {
        desktopVideo.play();
        mobileVideo.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }

    setShowVideoControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      setShowVideoControls(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Always visible, transparent initially, white on scroll */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        showHeader
          ? 'bg-white shadow-lg'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className={`text-2xl font-bold transition-colors ${showHeader ? 'text-gray-900' : 'text-white'}`} style={{ fontFamily: '"BBH Sans Hegarty", sans-serif' }}>OMAFIT</span>
            </div>

            <nav className="hidden md:flex space-x-8">
              <a href="#features" className={`transition-colors ${showHeader ? 'text-gray-600 hover:text-gray-900' : 'text-white hover:text-gray-200'}`}>Recursos</a>
              <a href="#benefits" className={`transition-colors ${showHeader ? 'text-gray-600 hover:text-gray-900' : 'text-white hover:text-gray-200'}`}>Benefícios</a>
              <a href="#pricing" className={`transition-colors ${showHeader ? 'text-gray-600 hover:text-gray-900' : 'text-white hover:text-gray-200'}`}>Planos</a>
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={onLogin}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  showHeader
                    ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    : 'text-white hover:text-gray-200 hover:bg-white/10'
                }`}
              >
                Login
              </button>
              <button
                onClick={handleOpenPricingModal}
                className="bg-gradient-to-r from-[#810707] to-red-700 text-white px-4 py-1 rounded-lg hover:from-red-800 hover:to-red-900 transition-all font-medium"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Parallax Banner with Text */}
      <section className="relative w-full overflow-hidden bg-gray-100" style={{ height: '100vh', minHeight: '600px' }}>
        {/* Parallax Background - Desktop */}
        <div
          className="hidden md:flex absolute inset-0 w-full h-full"
          style={{
            transform: `translateY(${scrollY * 0.5}px)`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          <img
            src="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/omafitbanner2.png"
            alt="Hero"
            className="w-full h-full object-cover object-center"
            loading="eager"
          />
        </div>

        {/* Parallax Background - Mobile */}
        <div
          className="flex md:hidden absolute inset-0 w-full h-full"
          style={{
            transform: `translateY(${scrollY * 0.3}px)`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          <img
            src="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/Omafit%20image%202.png"
            alt="Hero Mobile"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>

        {/* Centered Text with Animation */}
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center px-4 animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 drop-shadow-2xl" style={{ fontFamily: '"Elms Sans", sans-serif' }}>
              Encante seus clientes com uma<br /><span style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic' }}>experiência envolvente</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 drop-shadow-lg" style={{ fontFamily: '"Elms Sans", sans-serif' }}>
              When techno meets fashion.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 bg-white" data-animate="stats">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="text-center" data-animate="stat-1">
              <div className="text-3xl sm:text-4xl font-bold text-[#810707] mb-2" style={{ fontFamily: '"Jost", sans-serif', fontStyle: 'italic' }}>40%</div>
              <div className="text-gray-600 text-sm sm:text-base">Aumento na Conversão</div>
            </div>
            <div className="text-center" data-animate="stat-2">
              <div className="text-3xl sm:text-4xl font-bold text-[#810707] mb-2" style={{ fontFamily: '"Jost", sans-serif', fontStyle: 'italic' }}>64%</div>
              <div className="text-gray-600 text-sm sm:text-base">Redução em Devoluções</div>
            </div>
            <div className="text-center" data-animate="stat-3">
              <div className="text-3xl sm:text-4xl font-bold text-[#810707] mb-2" style={{ fontFamily: '"Jost", sans-serif', fontStyle: 'italic' }}>95%</div>
              <div className="text-gray-600 text-sm sm:text-base">Satisfação do Cliente</div>
            </div>
            <div className="text-center" data-animate="stat-4">
              <div className="text-3xl sm:text-4xl font-bold text-[#810707] mb-2" style={{ fontFamily: '"Jost", sans-serif', fontStyle: 'italic' }}>5min</div>
              <div className="text-gray-600 text-sm sm:text-base">Tempo de Integração</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center p-8 rounded-2xl hover:scale-105 transition-transform duration-300" data-animate="benefit-1">
              <p className="landing-title text-2xl sm:text-3xl md:text-4xl font-bold leading-relaxed bg-gradient-to-b from-[#810707] to-gray-400 bg-clip-text text-transparent">
                A venda é impulsionada por identidade, ao ver-se com a roupa, o cliente ativa o circuito da autoimagem
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl hover:scale-105 transition-transform duration-300" data-animate="benefit-2">
              <p className="landing-title text-2xl sm:text-3xl md:text-4xl font-bold leading-relaxed bg-gradient-to-b from-[#810707] to-gray-400 bg-clip-text text-transparent">
                Medo do cliente de se arrepender da compra é dissolvido após usar nossa calculadora
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl hover:scale-105 transition-transform duration-300" data-animate="benefit-3">
              <p className="landing-title text-2xl sm:text-3xl md:text-4xl font-bold leading-relaxed bg-gradient-to-b from-[#810707] to-gray-400 bg-clip-text text-transparent">
                Fortalece o marketing orgânico, com clientes compartilhando o resultado do try on.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl group">
            <video
              ref={videoDesktopRef}
              loop
              playsInline
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              className="hidden md:block w-full h-full object-cover"
            >
              <source
                src="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/fucionalidades.mp4"
                type="video/mp4"
              />
            </video>

            <video
              ref={videoMobileRef}
              loop
              playsInline
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
              className="md:hidden w-full h-full object-cover"
            >
              <source
                src="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/fucionalidades.mp4"
                type="video/mp4"
              />
            </video>

            {/* Custom Play/Pause Button */}
            <button
              onClick={toggleVideoPlayback}
              className="absolute inset-0 flex items-center justify-center transition-all group"
            >
              <div
                className={`w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-2xl transform transition-all duration-300 ${
                  showVideoControls ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                } group-hover:scale-110`}
              >
                {isVideoPlaying ? (
                  <Pause className="w-10 h-10 text-[#810707]" />
                ) : (
                  <Play className="w-10 h-10 text-[#810707] ml-1" />
                )}
              </div>
            </button>
          </div>

          <div
            id="tech-tagline"
            data-animate="tech-tagline"
            className="text-center mt-12 opacity-0 translate-y-8 transition-all duration-1000 ease-out"
            style={{
              opacity: visibleSections.has('tech-tagline') ? 1 : 0,
              transform: visibleSections.has('tech-tagline') ? 'translateY(0)' : 'translateY(2rem)'
            }}
          >
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Sua marca, agora com uma experiência{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#810707] to-red-700">
                tech-drive
              </span>
            </h3>
          </div>
        </div>
      </section>


      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-20 bg-white" data-animate="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="landing-title text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Descubra seu plano
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Escolha o plano ideal para o tamanho do seu negócio
            </p>
          </div>

          {/* Plan Calculator */}
          <PlanCalculator />

          {/* Mobile: Horizontal Scroll / Desktop: Grid */}
          <div className="lg:grid lg:grid-cols-5 lg:gap-6">
            <div className="flex lg:contents gap-6 overflow-x-auto pb-6 lg:pb-0 snap-x snap-mandatory scrollbar-hide">
            {/* Basic Plan */}
            <div className="flex-shrink-0 w-80 lg:w-auto snap-start">
              <div className="relative bg-white rounded-xl p-6 h-full border-2 border-gray-200 hover:border-[#810707] transition-all duration-300 hover:shadow-xl">
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">Basic</h3>
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-gray-700" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">R$ 130</span>
                      <span className="text-gray-500 text-sm">/mês</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">100 imagens/mês • R$ 1,30/img</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4 mb-5">
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Integração Shopify</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Dashboard analytics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Suporte por e-mail</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={handleOpenPricingModal}
                  className="w-full py-3 bg-[#810707] text-white rounded-lg hover:bg-[#a00909] transition-colors font-medium"
                >
                  Assinar Agora
                </button>
              </div>
            </div>

            {/* Starter Plan */}
            <div className="flex-shrink-0 w-80 lg:w-auto snap-start">
              <div className="relative bg-white rounded-xl p-6 h-full border-2 border-gray-200 hover:border-[#810707] transition-all duration-300 hover:shadow-xl">
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">Starter</h3>
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-700" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">R$ 550</span>
                      <span className="text-gray-500 text-sm">/mês</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">500 imagens/mês • R$ 1,10/img</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4 mb-5">
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Integração Shopify</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Dashboard analytics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Suporte por e-mail</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={handleOpenPricingModal}
                  className="w-full py-3 bg-[#810707] text-white rounded-lg hover:bg-[#a00909] transition-colors font-medium"
                >
                  Assinar Agora
                </button>
              </div>
            </div>

            {/* Growth Plan - Most Popular */}
            <div className="flex-shrink-0 w-80 lg:w-auto snap-start">
              <div className="relative bg-[#810707] rounded-xl p-6 h-full border-2 border-[#810707] shadow-lg hover:shadow-2xl transition-all duration-300">
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white">Growth</h3>
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">R$ 975</span>
                      <span className="text-red-200 text-sm">/mês</span>
                    </div>
                    <p className="text-sm text-red-200 mt-1">1.000 imagens/mês • R$ 0,98/img</p>
                  </div>
                </div>
                <div className="border-t border-white/20 pt-4 mb-5">
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-white">Tudo do plano Starter</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-white">Analytics avançado</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-white">Suporte prioritário</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-white">API personalizada</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={handleOpenPricingModal}
                  className="w-full py-3 bg-white text-[#810707] rounded-lg hover:bg-gray-100 transition-colors font-bold"
                >
                  Assinar Agora
                </button>
              </div>
            </div>

            {/* Scale Plan */}
            <div className="flex-shrink-0 w-80 lg:w-auto snap-start">
              <div className="relative bg-white rounded-xl p-6 h-full border-2 border-gray-200 hover:border-[#810707] transition-all duration-300 hover:shadow-xl">
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">Scale</h3>
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-700" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">R$ 2.400</span>
                      <span className="text-gray-500 text-sm">/mês</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">3.000 imagens/mês • R$ 0,80/img</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4 mb-5">
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Tudo do plano Growth</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Suporte 24/7</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Gerente de conta</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">Webhooks avançados</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={handleOpenPricingModal}
                  className="w-full py-3 bg-[#810707] text-white rounded-lg hover:bg-[#a00909] transition-colors font-medium"
                >
                  Assinar Agora
                </button>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="flex-shrink-0 w-80 lg:w-auto snap-start">
              <div className="relative bg-gray-900 rounded-xl p-6 h-full border-2 border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-xl">
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white">Enterprise</h3>
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">Custom</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Imagens ilimitadas</p>
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-4 mb-5">
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">Tudo do plano Scale</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">SLA garantido</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">Infraestrutura dedicada</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#810707] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">Dev. customizado</span>
                    </li>
                  </ul>
                </div>
                <a
                  href="mailto:contato@omafit.co"
                  className="w-full py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center justify-center"
                >
                  Entrar em Contato
                </a>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section className="py-16 sm:py-20 bg-gray-50" data-animate="platforms">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="landing-title text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Plataformas
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Integre facilmente com as principais plataformas de e-commerce
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Shopify */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#810707]">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 mb-6 flex items-center justify-center">
                  <svg viewBox="0 0 448 512" className="w-full h-full" fill="#95BF47">
                    <path d="M388.32,104.1a4.66,4.66,0,0,0-4.4-4c-2,0-37.23-.8-37.23-.8s-21.61-20.82-29.62-28.83V503.2L442.76,472S388.72,106.5,388.32,104.1ZM288.65,70.47a116.67,116.67,0,0,0-7.21-17.61C271,32.85,255.42,22,237,22a15,15,0,0,0-4,.4c-.4-.8-1.2-1.2-1.6-2C223.4,11.63,213,7.63,200.58,8c-24,.8-48,18-67.25,48.83-13.61,21.62-24,48.84-26.82,70.06-27.62,8.4-46.83,14.41-47.23,14.81-14,4.4-14.41,4.8-16,18-1.2,10-38,291.82-38,291.82L307.86,504V65.67a41.66,41.66,0,0,0-4.4.4S297.86,67.67,288.65,70.47ZM233.41,87.69c-16,4.8-33.63,10.4-50.84,15.61,4.8-18.82,14.41-37.63,25.62-50,4.4-4.4,10.41-9.61,17.21-12.81C232.21,54.86,233.81,74.48,233.41,87.69ZM200.58,24.44A27.49,27.49,0,0,1,215,28c-6.4,3.2-12.81,8.41-18.81,14.41-15.21,16.42-26.82,42-31.62,66.45-14.42,4.41-28.83,8.81-42,12.81C131.33,83.28,163.75,25.24,200.58,24.44ZM154.15,244.61c1.6,25.61,69.25,31.22,73.25,91.66,2.8,47.64-25.22,80.06-65.65,82.47-48.83,3.2-75.65-25.62-75.65-25.62l10.4-44s26.82,20.42,48.44,18.82c14-.8,19.22-12.41,18.81-20.42-2-33.62-57.24-31.62-60.84-86.86-3.2-46.44,27.22-93.27,94.47-97.68,26-1.6,39.23,4.81,39.23,4.81L221.4,225.39s-17.21-8-37.63-6.4C154.15,221,153.75,239.8,154.15,244.61ZM249.42,82.88c0-12-1.6-29.22-7.21-43.63,18.42,3.6,27.22,24,31.23,36.43Q262.63,78.68,249.42,82.88Z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Shopify</h3>
                <p className="text-gray-600 mb-4">
                  Integração nativa e fácil configuração em poucos cliques
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Configuração em 5 minutos</span>
                </div>
              </div>
            </div>

            {/* Nuvemshop */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#810707] relative overflow-hidden">
              {/* Em Breve Badge */}
              <div className="absolute top-4 right-4">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  Em Breve
                </div>
              </div>
              <div className="flex flex-col items-center text-center opacity-75">
                <div className="w-32 h-24 mb-6 flex items-center justify-center">
                  <img
                    src="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/vagasbyintera_nuvemshop-tiendanube-og.png"
                    alt="Nuvemshop"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Nuvemshop</h3>
                <p className="text-gray-600 mb-4">
                  Perfeita integração com a maior plataforma da América Latina
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Check className="w-4 h-4 text-gray-400" />
                  <span>Suporte em português</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-[#810707] to-red-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="landing-title text-3xl sm:text-4xl font-bold text-white mb-6 animate-swipe-up">
            Pronto para expandir sua marca?
          </h2>
          <p className="text-lg sm:text-xl text-red-100 mb-8 animate-swipe-up-delay-1">
            Junte-se a centenas de marcas que já aumentaram suas vendas com o Omafit
          </p>
          <button
            onClick={handleOpenPricingModal}
            className="bg-white text-[#810707] px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-gray-100 transition-all font-bold text-lg inline-flex items-center gap-2 animate-swipe-up-delay-2"
          >
            Assine Agora
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-red-200 text-sm mt-4 animate-swipe-up-delay-3">
            
          </p>
        </div>
      </section>

      {/* Video Modal */}
      {showVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="relative w-full max-w-5xl aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors text-4xl font-light w-10 h-10 flex items-center justify-center"
              aria-label="Fechar vídeo"
            >
              ×
            </button>
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full rounded-lg shadow-2xl omafit-demo-video"
              style={{ pointerEvents: 'none' }}
            >
              <source
                src="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/sign/Video%20banner/Omafit.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZmNjMjUzNy1jNTJhLTQ1M2UtODdkYy1kNDVmYzRlZmNhZjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJWaWRlbyBiYW5uZXIvT21hZml0Lm1wNCIsImlhdCI6MTc2MDYzMTM5MCwiZXhwIjo0OTE0MjMxMzkwfQ.7L2glLT1JydZkigq2J-jdrp-PtWUV_yHVW8MFznYBRk"
                type="video/mp4"
              />
            </video>
            <style>{`
              .omafit-demo-video::-webkit-media-controls {
                display: none !important;
              }
              .omafit-demo-video::-webkit-media-controls-enclosure {
                display: none !important;
              }
              .omafit-demo-video::-webkit-media-controls-panel {
                display: none !important;
              }
              .omafit-demo-video::--webkit-media-controls-play-button {
                display: none !important;
              }
              .omafit-demo-video::-webkit-media-controls-start-playback-button {
                display: none !important;
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-r from-[#810707] to-red-700 text-white rounded-lg w-8 h-8 flex items-center justify-center mr-3">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold" style={{ fontFamily: '"BBH Sans Hegarty", sans-serif' }}>OMAFIT</span>
              </div>
              <p className="text-gray-400">
                Revolucionando o e-commerce com try-on virtual powered by IA.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrações</a></li>
                
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentação</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tutoriais</a></li>
                <li><a href="/contato" className="hover:text-white transition-colors">Contato</a></li>

              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>

                <li><a href="/privacidade" className="hover:text-white transition-colors">Privacidade</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Omafit. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  );
}

// Add animation CSS
const styles = `
  @keyframes swipeUp {
    from {
      opacity: 0;
      transform: translateY(60px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  .animate-fade-in-up {
    animation: fadeInUp 1.2s ease-out forwards;
  }

  .animate-swipe-up {
    animation: swipeUp 0.8s ease-out forwards;
  }

  .animate-swipe-up-delay-1 {
    animation: swipeUp 0.8s ease-out 0.2s forwards;
    opacity: 0;
  }

  .animate-swipe-up-delay-2 {
    animation: swipeUp 0.8s ease-out 0.4s forwards;
    opacity: 0;
  }

  .animate-swipe-up-delay-3 {
    animation: swipeUp 0.8s ease-out 0.6s forwards;
    opacity: 0;
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }

  /* Intersection Observer animations */
  @media (prefers-reduced-motion: no-preference) {
    .animate-swipe-up,
    .animate-swipe-up-delay-1,
    .animate-swipe-up-delay-2,
    .animate-swipe-up-delay-3 {
      opacity: 0;
      transform: translateY(60px);
      transition: all 0.8s ease-out;
    }

    .animate-swipe-up.in-view {
      opacity: 1;
      transform: translateY(0);
    }

    .animate-swipe-up-delay-1.in-view {
      opacity: 1;
      transform: translateY(0);
      transition-delay: 0.2s;
    }

    .animate-swipe-up-delay-2.in-view {
      opacity: 1;
      transform: translateY(0);
      transition-delay: 0.4s;
    }

    .animate-swipe-up-delay-3.in-view {
      opacity: 1;
      transform: translateY(0);
      transition-delay: 0.6s;
    }
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .animate-swipe-up,
    .animate-swipe-up-delay-1,
    .animate-swipe-up-delay-2,
    .animate-swipe-up-delay-3 {
      transform: translateY(30px);
    }
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, observerOptions);

  // Observe elements when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.animate-swipe-up, .animate-swipe-up-delay-1, .animate-swipe-up-delay-2, .animate-swipe-up-delay-3');
    animatedElements.forEach(el => observer.observe(el));
  });
}