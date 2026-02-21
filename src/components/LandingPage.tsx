import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, TrendingUp, RefreshCw, Users, ShoppingBag, Star, Check, Mail, DollarSign, Package, Ruler, BarChart3 } from 'lucide-react';
import { PlanCalculator } from './PlanCalculator';
import { PricingModal } from './PricingModal';
import { supabase } from '../lib/supabase';
import { ZoomParallax } from './ui/zoom-parallax';
import Lenis from '@studio-freight/lenis';
import { motion, useScroll, useTransform } from 'framer-motion';

interface LandingPageProps {
  onGetStarted: (priceId?: string) => void;
  onLogin: () => void;
}

function HeroZoomParallax() {
  const container = useRef(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  });

  const scale1 = useTransform(scrollYProgress, [0, 0.5], [1, 3.5]);
  const scale2 = useTransform(scrollYProgress, [0.5, 1], [1, 2.5]);
  const opacity1 = useTransform(scrollYProgress, [0, 0.3, 0.5], [1, 1, 0]);
  const opacity2 = useTransform(scrollYProgress, [0.5, 0.65, 0.95], [0, 1, 1]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.log('Autoplay prevented:', error);
      });
    }
  }, []);

  return (
    <div ref={container} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-full px-4 max-w-7xl text-center">
            <motion.div
              style={{ scale: scale1, opacity: opacity1 }}
              className="space-y-4"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900" style={{ fontFamily: '"Elms Sans", sans-serif' }}>
                Encante seus clientes com uma
                <br />
                <span className="video-text relative inline-block" style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic' }}>
                  <span className="relative z-10">experiência envolvente</span>
                  <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="video-text-bg absolute inset-0"
                    style={{
                      width: '120%',
                      height: '300%',
                      objectFit: 'cover',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      mixBlendMode: 'screen',
                      filter: 'brightness(1.5) contrast(1.6) saturate(1.8)',
                      opacity: 0.85
                    }}
                  >
                    <source src="https://videos.pexels.com/video-files/6985297/6985297-uhd_2560_1440_25fps.mp4" type="video/mp4" />
                  </video>
                </span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-700" style={{ fontFamily: '"Elms Sans", sans-serif' }}>
                When techno meets fashion.
              </p>
            </motion.div>

            <motion.div
              style={{ scale: scale2, opacity: opacity2 }}
              className="absolute inset-0 flex items-center justify-center px-4"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 max-w-5xl leading-tight" style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 500 }}>
                Um assistente inteligente
                <br />
                de vendas para sua marca
              </h2>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [showHeader, setShowHeader] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const lastScrollY = useRef<number>(0);
  const [currentPlatformSlide, setCurrentPlatformSlide] = useState(0);
  const platformTouchStartX = useRef<number>(0);
  const platformTouchEndX = useRef<number>(0);

  useEffect(() => {
    const lenis = new Lenis();

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingUp = currentScrollY < lastScrollY.current;

      setScrollY(currentScrollY);

      // Mostra o header com fundo branco apenas ao rolar para cima
      if (currentScrollY < 100) {
        // No topo da página - header transparente
        setShowHeader(false);
      } else if (isScrollingUp) {
        // Rolando para cima - mostra header com fundo branco
        setShowHeader(true);
      } else if (!isScrollingUp) {
        // Rolando para baixo - esconde header
        setShowHeader(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      lenis.destroy();
    };
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlatformSlide((prev) => (prev + 1) % 4);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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


  const handlePlatformTouchStart = (e: React.TouchEvent) => {
    platformTouchStartX.current = e.touches[0].clientX;
  };

  const handlePlatformTouchMove = (e: React.TouchEvent) => {
    platformTouchEndX.current = e.touches[0].clientX;
  };

  const handlePlatformTouchEnd = () => {
    if (platformTouchStartX.current - platformTouchEndX.current > 50) {
      setCurrentPlatformSlide((prev) => (prev < 3 ? prev + 1 : prev));
    }

    if (platformTouchStartX.current - platformTouchEndX.current < -50) {
      setCurrentPlatformSlide((prev) => (prev > 0 ? prev - 1 : prev));
    }
  };


  return (
    <div className="min-h-screen relative bg-white">
        <div className="relative z-10">
          {/* Header - Visible at top or when scrolling up */}
          <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
            scrollY < 100
              ? 'bg-white/80 backdrop-blur-sm translate-y-0'
              : showHeader
              ? 'bg-white/95 backdrop-blur-sm shadow-lg translate-y-0'
              : 'bg-transparent -translate-y-full'
          }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"BBH Sans Hegarty", sans-serif' }}>OMAFIT</span>
                </div>

                <div className="flex items-center gap-8">
                  <nav className="hidden md:flex space-x-8">
                    <a href="#features" className="text-gray-900 hover:text-gray-600 transition-colors">Recursos</a>
                    <a href="#benefits" className="text-gray-900 hover:text-gray-600 transition-colors">Benefícios</a>
                    <a href="#pricing" className="text-gray-900 hover:text-gray-600 transition-colors">Planos</a>
                  </nav>
                  <a
                    href="mailto:contato@omafit.co"
                    className="bg-gradient-to-r from-[#810707] to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-800 hover:to-red-900 transition-all font-medium"
                  >
                    Entrar em contato
                  </a>
                </div>
              </div>
            </div>
          </header>

          {/* Hero Section - Zoom Parallax */}
          <HeroZoomParallax />

          {/* Stats Section */}
          <section className="py-12 sm:py-16" data-animate="stats">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
                <div className="text-center" data-animate="stat-1">
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Jost", sans-serif', fontStyle: 'italic' }}>40%</div>
                  <div className="text-gray-600 text-sm sm:text-base">Aumento na Conversão</div>
                </div>
                <div className="text-center" data-animate="stat-2">
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Jost", sans-serif', fontStyle: 'italic' }}>64%</div>
                  <div className="text-gray-600 text-sm sm:text-base">Redução em Devoluções</div>
                </div>
                <div className="text-center" data-animate="stat-3">
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Jost", sans-serif', fontStyle: 'italic' }}>95%</div>
                  <div className="text-gray-600 text-sm sm:text-base">Satisfação do Cliente</div>
                </div>
                <div className="text-center" data-animate="stat-4">
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: '"Jost", sans-serif', fontStyle: 'italic' }}>5min</div>
                  <div className="text-gray-600 text-sm sm:text-base">Tempo de Integração</div>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
                <div className="text-center p-8 rounded-2xl hover:scale-105 transition-transform duration-300" data-animate="benefit-1">
                  <p className="landing-title text-2xl sm:text-3xl md:text-4xl font-bold leading-relaxed text-gray-900">
                    As pessoas acreditam no que conseguem visualizar.
                  </p>
                  <p className="mt-4 text-lg text-gray-600" style={{ fontFamily: '"Playfair Display", serif' }}>
                    - Donald Norman
                  </p>
                </div>

                <div className="text-center p-8 rounded-2xl hover:scale-105 transition-transform duration-300" data-animate="benefit-2">
                  <p className="landing-title text-2xl sm:text-3xl md:text-4xl font-bold leading-relaxed text-gray-900">
                    A incerteza é emocionalmente custosa.
                  </p>
                  <p className="mt-4 text-lg text-gray-600" style={{ fontFamily: '"Playfair Display", serif' }}>
                    - Daniel Kahneman
                  </p>
                </div>

                <div className="text-center p-8 rounded-2xl hover:scale-105 transition-transform duration-300" data-animate="benefit-3">
                  <p className="landing-title text-2xl sm:text-3xl md:text-4xl font-bold leading-relaxed text-gray-900">
                    Marcas fortes reduzem a ansiedade na decisão.
                  </p>
                  <p className="mt-4 text-lg text-gray-600" style={{ fontFamily: '"Playfair Display", serif' }}>
                    - Marty Neumeier
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="w-full rounded-2xl overflow-hidden shadow-2xl bg-black" style={{ minHeight: '600px' }}>
                <iframe
                  width="100%"
                  height="600"
                  src="https://www.youtube.com/embed/o6OHZzTjB9s"
                  title="OmaFit Demo"
                  frameBorder="0"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
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
                  Dê a experiência aos seus clientes de ver a roupa da sua loja no{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#810707] to-red-700">
                    próprio corpo
                  </span>
                </h3>
              </div>
            </div>
          </section>

          {/* ZoomParallax Section - Precision & Analytics */}
          <section className="relative">
            <ZoomParallax
              videoUrl="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/video_1760123751873.mp4"
              images={[
                {
                  src: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/c141f6e7-4c08-441a-b1c8-b57a0b7dc909.png',
                  alt: 'Precisão na medição',
                },
                {
                  src: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/818977cf-5249-4b75-a269-58101c30c9ac.jpeg',
                  alt: 'Analytics avançado',
                },
                {
                  src: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/790e602d-8e3e-492e-b6b5-89c917c449d2.png',
                  alt: 'Dados em tempo real',
                },
                {
                  src: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/e40e36fe-3890-47bf-a4d8-a298c9d991e4.jpeg',
                  alt: 'Moda e tecnologia',
                },
                {
                  src: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/3fc6a657-bb77-4bd2-9774-1dbb316e4b5a.jpeg',
                  alt: 'Dashboard intuitivo',
                },
                {
                  src: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/eee28427-629f-4b81-bcff-0b6204b61e27.png',
                  alt: 'Medidas precisas',
                },
                {
                  src: 'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/f6eed9b9-aa98-4845-84ef-cc8fcd1650fc.jpeg',
                  alt: 'Relatórios detalhados',
                },
              ]}
            />
          </section>

          {/* Features Cards */}
          <section className="py-20 -mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Card 1 - Calculadora de Medidas */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#810707]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-[#810707] to-[#a00909] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Ruler className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-[#810707] transition-colors duration-300">
                  Calculadora de Medidas de Alta Precisão
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Nossa tecnologia de IA analisa mais de 50 pontos corporais para garantir medidas precisas.
                  O algoritmo aprende continuamente com cada uso, melhorando a precisão a cada dia.
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Check className="w-4 h-4 text-[#810707]" />
                  <span>98% de acurácia na recomendação de tamanhos</span>
                </div>
              </div>
            </motion.div>

            {/* Card 2 - Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#810707]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-[#810707] to-[#a00909] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-[#810707] transition-colors duration-300">
                  Analytics que Transformam Dados em Decisões
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Tenha acesso a insights profundos sobre o comportamento dos seus clientes.
                  Entenda padrões de uso, preferências de tamanho e muito mais para otimizar seu inventário e estratégia.
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Check className="w-4 h-4 text-[#810707]" />
                  <span>Dashboard em tempo real com ROI transparente</span>
                </div>
              </div>
            </motion.div>

            {/* Card 3 - Personalização */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#810707]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-[#810707] to-[#a00909] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Package className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-[#810707] transition-colors duration-300">
                  Personalização Total do Provador Virtual
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Customize cada detalhe do provador virtual para refletir a identidade da sua marca.
                  Cores, fontes, layout e muito mais podem ser ajustados para criar uma experiência única e memorável.
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Check className="w-4 h-4 text-[#810707]" />
                  <span>Fortalece o branding e reconhecimento da marca</span>
                </div>
              </div>
            </motion.div>

            {/* Card 4 - ChatGPT */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#810707]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-[#810707] to-[#a00909] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-[#810707] transition-colors duration-300">
                  Assistente Inteligente com ChatGPT
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Integração com ChatGPT para responder dúvidas dos clientes sobre produtos e marca em tempo real.
                  Ofereça suporte personalizado e aumente a confiança na compra com respostas instantâneas e precisas.
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Check className="w-4 h-4 text-[#810707]" />
                  <span>Respostas inteligentes 24/7 sobre produtos</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


          {/* Pricing Section */}
          <section id="pricing" className="py-16 sm:py-20" data-animate="pricing">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="landing-title text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  O plano para sua marca
                </h2>
                <p className="text-lg sm:text-xl text-gray-600">
                  Escolha o plano ideal para o tamanho do seu negócio
                </p>
              </div>

              {/* Plan Calculator */}
              <PlanCalculator />
            </div>
          </section>

          {/* Platforms Section - Carousel */}
          <section className="py-16 sm:py-20" data-animate="platforms">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="landing-title text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                  Plataformas
                </h2>
                <p className="text-lg sm:text-xl text-gray-600">
                  Clique e integre facilmente com as principais plataformas de e-commerce
                </p>
              </div>

          <div className="relative max-w-4xl mx-auto">
            <div
              className="overflow-hidden"
              onTouchStart={handlePlatformTouchStart}
              onTouchMove={handlePlatformTouchMove}
              onTouchEnd={handlePlatformTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentPlatformSlide * 100}%)` }}
              >
                {/* Slide 1 - Shopify */}
                <div className="min-w-full flex justify-center px-4">
                  <a
                    href="https://apps.shopify.com/omafit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#810707] w-full max-w-md"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 mb-6 flex items-center justify-center">
                        <svg viewBox="0 0 448 512" className="w-full h-full" fill="#95BF47">
                          <path d="M388.32,104.1a4.66,4.66,0,0,0-4.4-4c-2,0-37.23-.8-37.23-.8s-21.61-20.82-29.62-28.83V503.2L442.76,472S388.72,106.5,388.32,104.1ZM288.65,70.47a116.67,116.67,0,0,0-7.21-17.61C271,32.85,255.42,22,237,22a15,15,0,0,0-4,.4c-.4-.8-1.2-1.2-1.6-2C223.4,11.63,213,7.63,200.58,8c-24,.8-48,18-67.25,48.83-13.61,21.62-24,48.84-26.82,70.06-27.62,8.4-46.83,14.41-47.23,14.81-14,4.4-14.41,4.8-16,18-1.2,10-38,291.82-38,291.82L307.86,504V65.67a41.66,41.66,0,0,0-4.4.4S297.86,67.67,288.65,70.47ZM233.41,87.69c-16,4.8-33.63,10.4-50.84,15.61,4.8-18.82,14.41-37.63,25.62-50,4.4-4.4,10.41-9.61,17.21-12.81C232.21,54.86,233.81,74.48,233.41,87.69ZM200.58,24.44A27.49,27.49,0,0,1,215,28c-6.4,3.2-12.81,8.41-18.81,14.41-15.21,16.42-26.82,42-31.62,66.45-14.42,4.41-28.83,8.81-42,12.81C131.33,83.28,163.75,25.24,200.58,24.44ZM154.15,244.61c1.6,25.61,69.25,31.22,73.25,91.66,2.8,47.64-25.22,80.06-65.65,82.47-48.83,3.2-75.65-25.62-75.65-25.62l10.4-44s26.82,20.42,48.44,18.82c14-.8,19.22-12.41,18.81-20.42-2-33.62-57.24-31.62-60.84-86.86-3.2-46.44,27.22-93.27,94.47-97.68,26-1.6,39.23,4.81,39.23,4.81L221.4,225.39s-17.21-8-37.63-6.4C154.15,221,153.75,239.8,154.15,244.61ZM249.42,82.88c0-12-1.6-29.22-7.21-43.63,18.42,3.6,27.22,24,31.23,36.43Q262.63,78.68,249.42,82.88Z"/>
                        </svg>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Shopify</h3>
                      <p className="text-base sm:text-lg text-gray-600 mb-4">
                        Integração nativa e fácil configuração em poucos cliques
                      </p>
                      <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500">
                        <Check className="w-5 h-5 text-green-500" />
                        <span>Configuração em 5 minutos</span>
                      </div>
                    </div>
                  </a>
                </div>

                {/* Slide 2 - Nuvemshop */}
                <div className="min-w-full flex justify-center px-4">
                  <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#810707] w-full max-w-md relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        Em Breve
                      </div>
                    </div>
                    <div className="flex flex-col items-center text-center opacity-75">
                      <div className="w-32 h-24 sm:w-40 sm:h-32 mb-6 flex items-center justify-center">
                        <img
                          src="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/vagasbyintera_nuvemshop-tiendanube-og.png"
                          alt="Nuvemshop"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Nuvemshop</h3>
                      <p className="text-base sm:text-lg text-gray-600 mb-4">
                        Perfeita integração com a maior plataforma da América Latina
                      </p>
                      <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500">
                        <Check className="w-5 h-5 text-gray-400" />
                        <span>Suporte em português</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 3 - WooCommerce */}
                <div className="min-w-full flex justify-center px-4">
                  <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#810707] w-full max-w-md relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        Em Breve
                      </div>
                    </div>
                    <div className="flex flex-col items-center text-center opacity-75">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 mb-6 flex items-center justify-center">
                        <img
                          src="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/WooCommerce-Symbol-1.png"
                          alt="WooCommerce"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">WooCommerce</h3>
                      <p className="text-base sm:text-lg text-gray-600 mb-4">
                        Integração perfeita com a plataforma WordPress de e-commerce
                      </p>
                      <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500">
                        <Check className="w-5 h-5 text-gray-400" />
                        <span>Plugin WordPress</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 4 - Yampi */}
                <div className="min-w-full flex justify-center px-4">
                  <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#810707] w-full max-w-md relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        Em Breve
                      </div>
                    </div>
                    <div className="flex flex-col items-center text-center opacity-75">
                      <div className="w-32 h-24 sm:w-40 sm:h-32 mb-6 flex items-center justify-center">
                        <img
                          src="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/unnamed.webp"
                          alt="Yampi"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Yampi</h3>
                      <p className="text-base sm:text-lg text-gray-600 mb-4">
                        Plataforma completa de e-commerce brasileira com todas as ferramentas
                      </p>
                      <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500">
                        <Check className="w-5 h-5 text-gray-400" />
                        <span>Plataforma nacional</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={() => setCurrentPlatformSlide((prev) => (prev > 0 ? prev - 1 : 3))}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all z-10"
              aria-label="Plataforma anterior"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPlatformSlide((prev) => (prev < 3 ? prev + 1 : 0))}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all z-10"
              aria-label="Próxima plataforma"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Indicators */}
            <div className="flex justify-center gap-2 mt-8">
              {[0, 1, 2, 3].map((index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPlatformSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentPlatformSlide === index
                      ? 'bg-[#810707] w-8'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Ir para plataforma ${index + 1}`}
                />
              ))}
              </div>
            </div>
          </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 sm:py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="landing-title text-2xl sm:text-3xl font-bold text-gray-900 mb-6 animate-swipe-up">
                Entre em contato conosco e aplique agora o Omafit na sua marca
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 animate-swipe-up-delay-1">
                Junte-se a marcas que pensam à frente e usam o Omafit
              </p>
              <a
                href="mailto:contato@omafit.co"
                className="bg-gradient-to-r from-[#810707] to-red-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:from-red-800 hover:to-red-900 transition-all font-bold text-lg inline-flex items-center gap-2 animate-swipe-up-delay-2"
              >
                Entrar em contato
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </section>
        </div>

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
                src="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/Omafit.mp4"
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

      {/* Footer - fora do ASMR background */}
      <footer className="relative z-20 bg-black/90 backdrop-blur-sm text-white py-12">
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

          <div className="border-t border-gray-800 mt-8 pt-8">
            <div className="flex flex-col items-center gap-4">
              <a
                href="https://www.instagram.com/omafit.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Instagram do Omafit"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <p className="text-gray-400">&copy; 2025 Omafit. Todos os direitos reservados.</p>
            </div>
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