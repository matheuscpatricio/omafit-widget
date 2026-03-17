import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Check, Mail } from 'lucide-react';
import { SquishyPricing } from './ui/squishy-pricing';
import { PricingModal } from './PricingModal';
import { supabase } from '../lib/supabase';
import { ZoomParallax } from './ui/zoom-parallax';
import { Timeline } from './ui/timeline';
import { TechSplineSection } from './ui/tech-spline-section';
import { MinimalistHero } from './ui/minimalist-hero';
import Lenis from '@studio-freight/lenis';

interface LandingPageProps {
  onGetStarted: (priceId?: string) => void;
  onLogin: () => void;
}

type LandingLocale = 'pt' | 'en' | 'es';

const landingTranslations: Record<LandingLocale, Record<string, string>> = {
  pt: {
    immersiveExperience: 'experiência envolvente',
    heroTitleTop: 'Encante seus clientes com uma',
    heroSubtitle: 'When techno meets fashion.',
    heroTitleBottom: 'Um assistente inteligente',
    heroTitleBottomLine2: 'de vendas para sua marca',
    heroCard1: 'Você viu?',
    heroCard2: 'O que?',
    heroCard3: 'As marcas do futuro usando Omafit',
    navFeatures: 'Recursos',
    navBenefits: 'Benefícios',
    navPlans: 'Planos',
    contactButton: 'Entrar em contato',
    statConversion: 'Aumento na Conversão',
    statReturns: 'Redução em Devoluções',
    statSatisfaction: 'Satisfação do Cliente',
    statIntegrationTime: 'Tempo de Integração',
    quote1: 'As pessoas acreditam no que conseguem visualizar.',
    quote2: 'A incerteza é emocionalmente custosa.',
    quote3: 'Marcas fortes reduzem a ansiedade na decisão.',
    techTaglinePrefix: 'Dê a experiência aos seus clientes de ver a roupa da sua loja no',
    techTaglineHighlight: 'próprio corpo',
    techSectionTitle: 'O assistente inteligente é o futuro',
    techSectionDesc: 'O assistente inteligente é a evolução natural do provador virtual. Combinando IA, análise corporal e experiência imersiva, ele guia o cliente na jornada de compra e aumenta a conversão da sua loja.',
    altMeasurementPrecision: 'Precisão na medição',
    altAdvancedAnalytics: 'Analytics avançado',
    altRealtimeData: 'Dados em tempo real',
    altFashionTech: 'Moda e tecnologia',
    altIntuitiveDashboard: 'Dashboard intuitivo',
    altAccurateMeasurements: 'Medidas precisas',
    altDetailedReports: 'Relatórios detalhados',
    card1Title: 'Calculadora de Medidas de Alta Precisão',
    card1Desc: 'Nossa tecnologia de IA analisa mais de 50 pontos corporais para garantir medidas precisas. O algoritmo aprende continuamente com cada uso, melhorando a precisão a cada dia.',
    card1Badge: '98% de acurácia na recomendação de tamanhos',
    card2Title: 'Analytics que Transformam Dados em Decisões',
    card2Desc: 'Tenha acesso a insights profundos sobre o comportamento dos seus clientes. Entenda padrões de uso, preferências de tamanho e muito mais para otimizar seu inventário e estratégia.',
    card2Badge: 'Dashboard em tempo real com ROI transparente',
    card3Title: 'Personalização Total do Assistente Inteligente',
    card3Desc: 'Customize cada detalhe do assistente inteligente para refletir a identidade da sua marca. Cores, fontes, layout e muito mais podem ser ajustados para criar uma experiência única e memorável.',
    card3Badge: 'Fortalece o branding e reconhecimento da marca',
    card4Title: 'Assistente Inteligente com ChatGPT',
    card4Desc: 'Integração com ChatGPT para responder dúvidas dos clientes sobre produtos e marca em tempo real. Ofereça suporte personalizado e aumente a confiança na compra com respostas instantâneas e precisas.',
    card4Badge: 'Respostas inteligentes 24/7 sobre produtos',
    timelineTitle: 'Benefícios do Omafit',
    timelineSubtitle: 'Descubra como nossa tecnologia transforma a experiência de compra da sua marca.',
    featuresTimelineTitle: 'Recursos',
    featuresTimelineSubtitle: 'Tecnologia e ferramentas que impulsionam sua marca.',
    pricingTitle: 'O plano para sua marca',
    pricingSubtitle: 'Escolha o plano ideal para o tamanho do seu negócio',
    platformsTitle: 'Plataformas',
    platformsSubtitle: 'Clique e integre facilmente com as principais plataformas de e-commerce',
    comingSoon: 'Em Breve',
    platformShopifyDesc: 'Integração nativa e fácil configuração em poucos cliques',
    platformShopifyBadge: 'Configuração em 5 minutos',
    platformNuvemshopDesc: 'Perfeita integração com a maior plataforma da América Latina',
    platformNuvemshopBadge: 'Suporte em português',
    platformWooDesc: 'Integração perfeita com a plataforma WordPress de e-commerce',
    platformWooBadge: 'Plugin WordPress',
    platformYampiDesc: 'Plataforma completa de e-commerce brasileira com todas as ferramentas',
    platformYampiBadge: 'Plataforma nacional',
    prevPlatform: 'Plataforma anterior',
    nextPlatform: 'Próxima plataforma',
    goToPlatform: 'Ir para plataforma',
    ctaTitle: 'Entre em contato conosco e aplique agora o Omafit na sua marca',
    ctaSubtitle: 'Junte-se a marcas que pensam à frente e usam o Omafit',
    closeVideo: 'Fechar vídeo',
    footerDescription: 'Revolucionando o e-commerce com assistente inteligente powered by IA.',
    footerProduct: 'Produto',
    footerPricing: 'Preços',
    footerIntegrations: 'Integrações',
    footerSupport: 'Suporte',
    footerDocumentation: 'Documentação',
    footerTutorials: 'Tutoriais',
    footerCompany: 'Empresa',
    footerAbout: 'Sobre',
    footerPrivacy: 'Privacidade',
    instagramLabel: 'Instagram do Omafit',
    rightsReserved: 'Todos os direitos reservados.',
  },
  en: {
    immersiveExperience: 'immersive experience',
    heroTitleTop: 'Delight your customers with an',
    heroSubtitle: 'When techno meets fashion.',
    heroTitleBottom: 'An intelligent sales assistant',
    heroTitleBottomLine2: 'for your brand',
    heroCard1: 'Did you see?',
    heroCard2: 'What?',
    heroCard3: 'The brands of the future using Omafit',
    navFeatures: 'Features',
    navBenefits: 'Benefits',
    navPlans: 'Plans',
    contactButton: 'Get in touch',
    statConversion: 'Conversion Increase',
    statReturns: 'Return Reduction',
    statSatisfaction: 'Customer Satisfaction',
    statIntegrationTime: 'Integration Time',
    quote1: 'People believe what they can visualize.',
    quote2: 'Uncertainty is emotionally costly.',
    quote3: 'Strong brands reduce decision anxiety.',
    techTaglinePrefix: 'Give your customers the experience of seeing your store clothing on their',
    techTaglineHighlight: 'own body',
    techSectionTitle: 'The intelligent assistant is the future',
    techSectionDesc: 'The intelligent assistant is the natural evolution of the virtual fitting room. Combining AI, body analysis and immersive experience, it guides the customer through the purchase journey and boosts your store conversion.',
    altMeasurementPrecision: 'Measurement precision',
    altAdvancedAnalytics: 'Advanced analytics',
    altRealtimeData: 'Real-time data',
    altFashionTech: 'Fashion and technology',
    altIntuitiveDashboard: 'Intuitive dashboard',
    altAccurateMeasurements: 'Accurate measurements',
    altDetailedReports: 'Detailed reports',
    card1Title: 'High-Precision Measurement Calculator',
    card1Desc: 'Our AI technology analyzes over 50 body points to ensure precise measurements. The algorithm continuously learns from each use, improving accuracy every day.',
    card1Badge: '98% accuracy in size recommendations',
    card2Title: 'Analytics That Turn Data Into Decisions',
    card2Desc: 'Get deep insights into your customers behavior. Understand usage patterns, size preferences and much more to optimize inventory and strategy.',
    card2Badge: 'Real-time dashboard with transparent ROI',
    card3Title: 'Total Intelligent Assistant Customization',
    card3Desc: 'Customize every detail of the intelligent assistant to reflect your brand identity. Colors, fonts, layout and more can be adjusted to create a unique experience.',
    card3Badge: 'Strengthens branding and brand recognition',
    card4Title: 'Intelligent Assistant with ChatGPT',
    card4Desc: 'ChatGPT integration to answer customer questions about products and brand in real time. Offer personalized support and increase purchase confidence.',
    card4Badge: 'Smart product answers 24/7',
    timelineTitle: 'Omafit Benefits',
    timelineSubtitle: 'Discover how our technology transforms your brand\'s shopping experience.',
    featuresTimelineTitle: 'Features',
    featuresTimelineSubtitle: 'Technology and tools that power your brand.',
    pricingTitle: 'The plan for your brand',
    pricingSubtitle: 'Choose the ideal plan for your business size',
    platformsTitle: 'Platforms',
    platformsSubtitle: 'Click and integrate easily with the main e-commerce platforms',
    comingSoon: 'Coming Soon',
    platformShopifyDesc: 'Native integration and easy setup in just a few clicks',
    platformShopifyBadge: 'Setup in 5 minutes',
    platformNuvemshopDesc: 'Perfect integration with Latin Americas leading platform',
    platformNuvemshopBadge: 'Portuguese support',
    platformWooDesc: 'Seamless integration with the WordPress e-commerce platform',
    platformWooBadge: 'WordPress plugin',
    platformYampiDesc: 'Complete Brazilian e-commerce platform with all tools',
    platformYampiBadge: 'Local platform',
    prevPlatform: 'Previous platform',
    nextPlatform: 'Next platform',
    goToPlatform: 'Go to platform',
    ctaTitle: 'Get in touch and apply Omafit to your brand now',
    ctaSubtitle: 'Join forward-thinking brands that use Omafit',
    closeVideo: 'Close video',
    footerDescription: 'Revolutionizing e-commerce with AI-powered intelligent assistant.',
    footerProduct: 'Product',
    footerPricing: 'Pricing',
    footerIntegrations: 'Integrations',
    footerSupport: 'Support',
    footerDocumentation: 'Documentation',
    footerTutorials: 'Tutorials',
    footerCompany: 'Company',
    footerAbout: 'About',
    footerPrivacy: 'Privacy',
    instagramLabel: 'Omafit Instagram',
    rightsReserved: 'All rights reserved.',
  },
  es: {
    immersiveExperience: 'experiencia envolvente',
    heroTitleTop: 'Encanta a tus clientes con una',
    heroSubtitle: 'When techno meets fashion.',
    heroTitleBottom: 'Un asistente inteligente',
    heroTitleBottomLine2: 'de ventas para tu marca',
    heroCard1: '¿Viste?',
    heroCard2: '¿Qué?',
    heroCard3: 'Las marcas del futuro usando Omafit',
    navFeatures: 'Recursos',
    navBenefits: 'Beneficios',
    navPlans: 'Planes',
    contactButton: 'Contactar',
    statConversion: 'Aumento en Conversión',
    statReturns: 'Reducción de Devoluciones',
    statSatisfaction: 'Satisfacción del Cliente',
    statIntegrationTime: 'Tiempo de Integración',
    quote1: 'Las personas creen en lo que pueden visualizar.',
    quote2: 'La incertidumbre es emocionalmente costosa.',
    quote3: 'Las marcas fuertes reducen la ansiedad en la decisión.',
    techTaglinePrefix: 'Ofrece a tus clientes la experiencia de ver la ropa de tu tienda en su',
    techTaglineHighlight: 'propio cuerpo',
    techSectionTitle: 'El asistente inteligente es el futuro',
    techSectionDesc: 'El asistente inteligente es la evolución natural del probador virtual. Combinando IA, análisis corporal y experiencia inmersiva, guía al cliente en la jornada de compra y aumenta la conversión de tu tienda.',
    altMeasurementPrecision: 'Precisión de medición',
    altAdvancedAnalytics: 'Analítica avanzada',
    altRealtimeData: 'Datos en tiempo real',
    altFashionTech: 'Moda y tecnología',
    altIntuitiveDashboard: 'Panel intuitivo',
    altAccurateMeasurements: 'Medidas precisas',
    altDetailedReports: 'Informes detallados',
    card1Title: 'Calculadora de Medidas de Alta Precisión',
    card1Desc: 'Nuestra tecnología de IA analiza más de 50 puntos corporales para garantizar medidas precisas. El algoritmo aprende continuamente con cada uso.',
    card1Badge: '98% de precisión en recomendación de tallas',
    card2Title: 'Analítica que Convierte Datos en Decisiones',
    card2Desc: 'Accede a insights profundos sobre el comportamiento de tus clientes. Entiende patrones de uso y preferencias de talla para optimizar tu inventario.',
    card2Badge: 'Panel en tiempo real con ROI transparente',
    card3Title: 'Personalización Total del Asistente Inteligente',
    card3Desc: 'Personaliza cada detalle del asistente inteligente para reflejar la identidad de tu marca. Colores, fuentes y layout para crear una experiencia única.',
    card3Badge: 'Fortalece el branding y reconocimiento de marca',
    card4Title: 'Asistente Inteligente con ChatGPT',
    card4Desc: 'Integración con ChatGPT para responder dudas de clientes sobre productos y marca en tiempo real. Ofrece soporte personalizado.',
    card4Badge: 'Respuestas inteligentes 24/7 sobre productos',
    timelineTitle: 'Beneficios de Omafit',
    timelineSubtitle: 'Descubre cómo nuestra tecnología transforma la experiencia de compra de tu marca.',
    featuresTimelineTitle: 'Recursos',
    featuresTimelineSubtitle: 'Tecnología y herramientas que impulsan tu marca.',
    pricingTitle: 'El plan para tu marca',
    pricingSubtitle: 'Elige el plan ideal para el tamaño de tu negocio',
    platformsTitle: 'Plataformas',
    platformsSubtitle: 'Haz clic e integra fácilmente con las principales plataformas de e-commerce',
    comingSoon: 'Próximamente',
    platformShopifyDesc: 'Integración nativa y configuración fácil en pocos clics',
    platformShopifyBadge: 'Configuración en 5 minutos',
    platformNuvemshopDesc: 'Integración perfecta con la mayor plataforma de América Latina',
    platformNuvemshopBadge: 'Soporte en portugués',
    platformWooDesc: 'Integración perfecta con la plataforma WordPress de e-commerce',
    platformWooBadge: 'Plugin de WordPress',
    platformYampiDesc: 'Plataforma completa de e-commerce brasileña con todas las herramientas',
    platformYampiBadge: 'Plataforma nacional',
    prevPlatform: 'Plataforma anterior',
    nextPlatform: 'Siguiente plataforma',
    goToPlatform: 'Ir a plataforma',
    ctaTitle: 'Contáctanos y aplica Omafit ahora en tu marca',
    ctaSubtitle: 'Únete a marcas innovadoras que ya usan Omafit',
    closeVideo: 'Cerrar video',
    footerDescription: 'Revolucionando el e-commerce con asistente inteligente impulsado por IA.',
    footerProduct: 'Producto',
    footerPricing: 'Precios',
    footerIntegrations: 'Integraciones',
    footerSupport: 'Soporte',
    footerDocumentation: 'Documentación',
    footerTutorials: 'Tutoriales',
    footerCompany: 'Empresa',
    footerAbout: 'Sobre',
    footerPrivacy: 'Privacidad',
    instagramLabel: 'Instagram de Omafit',
    rightsReserved: 'Todos los derechos reservados.',
  }
};

const detectLandingLocale = (): LandingLocale => {
  if (typeof window === 'undefined') return 'pt';
  const raw = (navigator.language || '').toLowerCase();
  if (raw.startsWith('es')) return 'es';
  if (raw.startsWith('en')) return 'en';
  return 'pt';
};

function VideoText({ immersiveExperience }: { immersiveExperience: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;

    const renderFrame = () => {
      if (video.readyState >= 2) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = '#000000';
        ctx.font = 'bold italic 120px "Playfair Display", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(immersiveExperience, canvas.width / 2, canvas.height / 2);
        ctx.globalCompositeOperation = 'source-over';
      }
      animationFrameId = requestAnimationFrame(renderFrame);
    };

    const handleVideoReady = () => {
      canvas.width = 1200;
      canvas.height = 200;
      setIsVideoReady(true);
      renderFrame();
    };

    video.addEventListener('loadeddata', handleVideoReady);
    video.play().catch(err => console.log('Autoplay prevented:', err));

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      video.removeEventListener('loadeddata', handleVideoReady);
    };
  }, [immersiveExperience]);

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        className="video-text-canvas mx-auto"
        style={{
          maxWidth: '100%',
          height: 'auto',
          display: isVideoReady ? 'block' : 'none'
        }}
      />
      {!isVideoReady && (
        <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', fontWeight: 'bold' }}>
          {immersiveExperience}
        </span>
      )}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      >
        <source src="https://videos.pexels.com/video-files/6985297/6985297-uhd_2560_1440_25fps.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

function HeroMinimalist() {
  return (
    <MinimalistHero
      showHeader={false}
      showFooter={false}
      mainText="When techno meets fashion."
      readMoreLink="#features"
      imageSrc="https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/5843da9a-f798-468c-8d55-0b3e25d55856-Photoroom.png"
      imageAlt="Omafit"
      overlayText={{
        part1: 'proporcione uma',
        part2: 'experiência extraordinária',
        part3: ' na sua loja',
      }}
    />
  );
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const navigate = useNavigate();
  const [locale] = useState<LandingLocale>(() => detectLandingLocale());
  const t = landingTranslations[locale];
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
    <div className="min-h-screen relative bg-white" style={{ colorScheme: 'light' }}>
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
                  <span className="admin-logo font-bungee text-2xl text-gray-900" style={{ fontFamily: '"Bungee", sans-serif', fontWeight: 400 }}>OMAFIT</span>
                </div>

                <div className="flex items-center gap-8">
                  <nav className="hidden md:flex space-x-8">
                    <a href="#features" className="text-gray-900 hover:text-gray-600 transition-colors">{t.navFeatures}</a>
                    <a href="#benefits" className="text-gray-900 hover:text-gray-600 transition-colors">{t.navBenefits}</a>
                    <a href="#pricing" className="text-gray-900 hover:text-gray-600 transition-colors">{t.navPlans}</a>
                  </nav>
                  <a
                    href="mailto:contato@omafit.co"
                    className="bg-gradient-to-r from-[#810707] to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-800 hover:to-red-900 transition-all font-medium"
                  >
                    {t.contactButton}
                  </a>
                </div>
              </div>
            </div>
          </header>

          {/* Hero Section - Minimalist */}
          <HeroMinimalist />

          {/* Benefits Section - Timeline */}
          <section id="benefits" className="py-16 sm:py-20">
            <Timeline
              data={[
                { title: t.quote1, content: <p className="text-gray-600">— Donald Norman</p> },
                { title: t.quote2, content: <p className="text-gray-600">— Daniel Kahneman</p> },
                { title: t.quote3, content: <p className="text-gray-600">— Marty Neumeier</p> },
              ]}
            />
          </section>

          {/* Features Section - YouTube + tagline */}
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
                  {t.techTaglinePrefix}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#810707] to-red-700">
                    {t.techTaglineHighlight}
                  </span>
                </h3>
              </div>
            </div>
          </section>

          {/* Tech Spline Section - substitui ZoomParallax (vídeo) */}
          <section className="py-16 sm:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <TechSplineSection
                title={t.techSectionTitle}
                description={t.techSectionDesc}
              />
            </div>
          </section>

          {/* Features Timeline */}
          <section className="py-20 -mt-20 bg-white">
            <Timeline
              title={t.featuresTimelineTitle}
              subtitle={t.featuresTimelineSubtitle}
              data={[
                {
                  title: t.card1Title,
                  content: (
                    <div>
                      <p className="text-gray-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-4">
                        {t.card1Desc}
                      </p>
                      <p className="text-gray-600 dark:text-neutral-400 text-xs md:text-sm font-medium">
                        {t.card1Badge}
                      </p>
                </div>
                  ),
                },
                {
                  title: t.card2Title,
                  content: (
                    <div>
                      <p className="text-gray-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-4">
                        {t.card2Desc}
                      </p>
                      <p className="text-gray-600 dark:text-neutral-400 text-xs md:text-sm font-medium">
                        {t.card2Badge}
                      </p>
                </div>
                  ),
                },
                {
                  title: t.card3Title,
                  content: (
                    <div>
                      <p className="text-gray-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-4">
                        {t.card3Desc}
                      </p>
                      <p className="text-gray-600 dark:text-neutral-400 text-xs md:text-sm font-medium">
                        {t.card3Badge}
                      </p>
                </div>
                  ),
                },
                {
                  title: t.card4Title,
                  content: (
                    <div>
                      <p className="text-gray-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-4">
                        {t.card4Desc}
                      </p>
                      <p className="text-gray-600 dark:text-neutral-400 text-xs md:text-sm font-medium">
                        {t.card4Badge}
                      </p>
                </div>
                  ),
                },
              ]}
            />
      </section>


          {/* Pricing Section */}
          <section id="pricing" className="py-16 sm:py-20 bg-white" data-animate="pricing">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white">
              <div className="text-center mb-12 sm:mb-16">
                <h2 className="landing-title text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  {t.pricingTitle}
                </h2>
                <p className="text-lg sm:text-xl text-gray-600">
                  {t.pricingSubtitle}
                </p>
              </div>

              {/* Squishy Pricing Cards */}
              <SquishyPricing
                locale={locale}
                onSelectPlan={(planId) => {
                  if (planId !== 'enterprise') setShowPricingModal(true);
                }}
              />
            </div>
          </section>

          {/* Platforms Section - Carousel */}
          <section className="py-16 sm:py-20" data-animate="platforms">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="landing-title text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                  {t.platformsTitle}
                </h2>
                <p className="text-lg sm:text-xl text-gray-600">
                  {t.platformsSubtitle}
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
                        {t.platformShopifyDesc}
                      </p>
                      <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500">
                        <Check className="w-5 h-5 text-green-500" />
                        <span>{t.platformShopifyBadge}</span>
                      </div>
                    </div>
                  </a>
                </div>

                {/* Slide 2 - Nuvemshop */}
                <div className="min-w-full flex justify-center px-4">
                  <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#810707] w-full max-w-md relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        {t.comingSoon}
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
                        {t.platformNuvemshopDesc}
                      </p>
                      <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500">
                        <Check className="w-5 h-5 text-gray-400" />
                        <span>{t.platformNuvemshopBadge}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 3 - WooCommerce */}
                <div className="min-w-full flex justify-center px-4">
                  <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#810707] w-full max-w-md relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        {t.comingSoon}
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
                        {t.platformWooDesc}
                      </p>
                      <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500">
                        <Check className="w-5 h-5 text-gray-400" />
                        <span>{t.platformWooBadge}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide 4 - Yampi */}
                <div className="min-w-full flex justify-center px-4">
                  <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#810707] w-full max-w-md relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        {t.comingSoon}
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
                        {t.platformYampiDesc}
                      </p>
                      <div className="flex items-center gap-2 text-sm sm:text-base text-gray-500">
                        <Check className="w-5 h-5 text-gray-400" />
                        <span>{t.platformYampiBadge}</span>
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
              aria-label={t.prevPlatform}
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentPlatformSlide((prev) => (prev < 3 ? prev + 1 : 0))}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all z-10"
              aria-label={t.nextPlatform}
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
                  aria-label={`${t.goToPlatform} ${index + 1}`}
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
                {t.ctaTitle}
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 animate-swipe-up-delay-1">
                {t.ctaSubtitle}
              </p>
              <a
                href="mailto:contato@omafit.co"
                className="bg-gradient-to-r from-[#810707] to-red-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:from-red-800 hover:to-red-900 transition-all font-bold text-lg inline-flex items-center gap-2 animate-swipe-up-delay-2"
              >
                {t.contactButton}
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
              aria-label={t.closeVideo}
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
                <span className="admin-logo font-bungee text-xl" style={{ fontFamily: '"Bungee", sans-serif', fontWeight: 400 }}>OMAFIT</span>
              </div>
              <p className="text-gray-400">
                {t.footerDescription}
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4">{t.footerProduct}</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t.navFeatures}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerPricing}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerIntegrations}</a></li>
                
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">{t.footerSupport}</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t.footerDocumentation}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t.footerTutorials}</a></li>
                <li><a href="/contato" className="hover:text-white transition-colors">{t.contactButton}</a></li>

              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">{t.footerCompany}</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t.footerAbout}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>

                <li><a href="/privacidade" className="hover:text-white transition-colors">{t.footerPrivacy}</a></li>
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
                aria-label={t.instagramLabel}
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
              <p className="text-gray-400">&copy; 2025 Omafit. {t.rightsReserved}</p>
            </div>
          </div>
        </div>
      </footer>

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onSelectPlan={handleSelectPlan}
        locale={locale}
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