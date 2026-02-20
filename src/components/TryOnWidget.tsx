import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, ArrowRight, ArrowLeft, Mail, AlertCircle, Info, ShoppingCart, Sparkles } from 'lucide-react';
import { SizeCalculator, SizeCalculatorData } from './SizeCalculator';
import { calculateIdealSize } from '../utils/sizeCalculation';
import { supabase } from '../lib/supabase';
import { widgetTranslations, detectWidgetLanguage, type WidgetTranslationKey } from '../locales/widget-translations';
import { useMediaPipePose } from '../hooks/useMediaPipePose';

interface TryOnWidgetProps {
  garmentImage: string;
  productId?: string;
  productName?: string;
  storeName?: string;
  storeLogo?: string;
  primaryColor?: string;
  fontFamily?: string;
  publicId?: string;
  productImages?: string[];
  shopDomain?: string;
  collectionId?: string;
  collectionHandle?: string;
  gender?: string;
  defaultGender?: string;
  collectionType?: 'upper' | 'lower' | 'full';
  collectionElasticity?: 'structured' | 'light_flex' | 'flexible' | 'high_elasticity';
  recommendedProductName?: string;
  recommendedProductUrl?: string;
}

interface SizeChartEntry {
  size: string;
  peito?: string;
  chest?: string;
  cintura?: string;
  waist?: string;
  quadril?: string;
  hip?: string;
  comprimento?: string;
  length?: string;
}

export function TryOnWidget({ garmentImage, productId = 'unknown', productName = 'Produto', storeName = '', storeLogo, primaryColor = '#810707', fontFamily = 'Outfit', publicId, productImages = [], shopDomain = '', collectionId = '', collectionHandle = '', gender = 'unisex', defaultGender = 'unisex', collectionType, collectionElasticity, recommendedProductName, recommendedProductUrl }: TryOnWidgetProps) {

  console.log('🎯 ===== TRYON WIDGET INICIALIZADO =====');
  console.log('Props recebidas:');
  console.log('   - publicId:', publicId);
  console.log('   - shopDomain:', shopDomain);
  console.log('   - productId:', productId);
  console.log('   - productName:', productName);
  console.log('   - storeName:', storeName);
  console.log('   - storeLogo:', storeLogo ? 'Sim' : 'Não');
  console.log('   - primaryColor:', primaryColor);
  console.log('   - productImages:', productImages?.length || 0);
  console.log('   - 👕 collectionType:', collectionType || 'não especificado');
  console.log('   - 🧵 collectionElasticity:', collectionElasticity || 'não especificado');
  console.log('   - 📦 collectionId (UUID):', collectionId || 'não fornecido');
  console.log('   - 📦 collectionHandle (Shopify):', collectionHandle || 'não fornecido (tabela global)');
  console.log('   - 👤 gender (deprecated):', gender);
  console.log('   - 👤 defaultGender (sugestão inicial):', defaultGender);
  console.log('   - 🎁 recommendedProductName:', recommendedProductName || 'não fornecido');
  console.log('   - 🎁 recommendedProductUrl:', recommendedProductUrl || 'não fornecido');

  // Detectar idioma
  const [currentLanguage] = useState<'pt' | 'es' | 'en'>(detectWidgetLanguage());
  const t = (key: WidgetTranslationKey): string => {
    return widgetTranslations[currentLanguage][key] || widgetTranslations['en'][key] || key;
  };

  console.log('🌍 Idioma detectado no widget:', currentLanguage);

  // Gerar cor hover (mais escura)
  const darkenColor = (color: string, amount: number = 20): string => {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const [product, setProduct] = useState<any>(null);
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sizeData, setSizeData] = useState<SizeCalculatorData | null>(null);
  const [calculatedSize, setCalculatedSize] = useState<string | null>(null);
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<'high' | 'medium' | 'low' | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [sizeChart, setSizeChart] = useState<SizeChartEntry[]>([]);
  const [measurementWeights, setMeasurementWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'info' | 'calculator' | 'photo' | 'confirm' | 'processing' | 'result'>('info');
  const [selectedProductImage, setSelectedProductImage] = useState<string>(garmentImage);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState(t('generating'));
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GPT Assistant states - Full Chat Interface
  interface ChatMessage {
    role: 'assistant' | 'user';
    content: string;
    timestamp: number;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gptLoading, setGptLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [interactionCount, setInteractionCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);

  // Armazenar medidas do modelo corporal final para envio ao GPT
  const [finalBodyMeasurements, setFinalBodyMeasurements] = useState<{
    chest: number;
    waist: number;
    hip: number;
  } | null>(null);
  const touchEndX = useRef<number>(0);

  // 🔹 Função auxiliar para derivar storeName do shopDomain
  const deriveStoreName = (domain: string): string => {
    if (!domain) return '';
    return domain
      .replace(/\.myshopify\.com$/, '')
      .replace(/\./g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // 🔹 Resolver storeName com fallback robusto (mesma lógica do omafit-widget.js)
  const resolveStoreName = (): string => {
    return storeName || deriveStoreName(shopDomain) || 'Omafit';
  };

  // Estados locais para configurações que podem ser atualizadas
  const [localStoreLogo, setLocalStoreLogo] = useState<string>(storeLogo || '');
  const [localPrimaryColor, setLocalPrimaryColor] = useState<string>(primaryColor);
  const [localStoreName, setLocalStoreName] = useState<string>(resolveStoreName());
  const [localCollectionType, setLocalCollectionType] = useState<'upper' | 'lower' | 'full' | undefined>(collectionType);
  const [localCollectionElasticity, setLocalCollectionElasticity] = useState<'structured' | 'light_flex' | 'flexible' | 'high_elasticity' | undefined>(collectionElasticity);

  // Calcular cor hover baseada na cor primária local
  const hoverColor = darkenColor(localPrimaryColor);

  // Debug: Log sempre que step ou imagePreview mudar
  useEffect(() => {
    console.log('🔄 ====== ESTADO ATUALIZADO ======');
    console.log('   📍 step atual:', step);
    console.log('   🖼️ imagePreview:', imagePreview ? `${imagePreview.substring(0, 30)}...` : '❌ NULL');
    console.log('   👕 selectedProductImage:', selectedProductImage ? selectedProductImage.substring(0, 30) + '...' : '❌ NULL');
    console.log('   📁 modelImage:', modelImage ? `File: ${modelImage.name}` : '❌ NULL');
    console.log('   🎨 primaryColor:', primaryColor);
    console.log('================================');
  }, [step, imagePreview, selectedProductImage, modelImage]);

  // MediaPipe Pose Detection
  const { isLoading: mediapipeLoading, error: mediapipeError, detectPose, calculateBodyMeasurements } = useMediaPipePose();

  useEffect(() => {
    if (mediapipeLoading) {
      console.log('⏳ Carregando MediaPipe Pose Landmarker...');
    } else if (mediapipeError) {
      console.error('❌ Erro ao carregar MediaPipe:', mediapipeError);
    } else {
      console.log('✅ MediaPipe Pose Landmarker pronto!');
    }
  }, [mediapipeLoading, mediapipeError]);

  useEffect(() => {
    setIsVisible(true);
    console.log('🖼️ TryOnWidget - Props recebidas:', {
      storeLogo,
      storeName,
      primaryColor,
      fontFamily
    });
  }, [storeLogo, storeName, primaryColor, fontFamily]);

  // Atualizar estados locais quando as props mudarem
  useEffect(() => {
    console.log('🔄 useEffect storeLogo disparado:', storeLogo);
    if (storeLogo && storeLogo.trim() !== '') {
      console.log('✅ Atualizando localStoreLogo das props:', storeLogo);
      setLocalStoreLogo(storeLogo);
    }
  }, [storeLogo]);

  useEffect(() => {
    if (primaryColor) {
      setLocalPrimaryColor(primaryColor);
    }
  }, [primaryColor]);

  useEffect(() => {
    const resolved = resolveStoreName();
    console.log('🏪 Resolvendo storeName:', {
      prop: storeName,
      shopDomain,
      resolved
    });
    setLocalStoreName(resolved);
  }, [storeName, shopDomain]);

  // Chamar assistente GPT automaticamente quando chegar no resultado - já induzindo ao carrinho
  useEffect(() => {
    if (step === 'result' && result && sizeData && chatMessages.length === 0 && !gptLoading) {
      setTimeout(() => {
        callGPTAssistant('add_to_cart');
      }, 1000);
    }
  }, [step, result, sizeData]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // ═══════════════════════════════════════════════════════════════════
  // 🔹 LISTENER: postMessage para receber collectionType e collectionElasticity
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Contexto da coleção (handle + gender + type + elasticity)
      if (event.data.type === 'omafit-context') {
        console.log('📥 Recebido omafit-context:', event.data);

        if (event.data.collectionType) {
          console.log('✅ Atualizando collectionType:', event.data.collectionType);
          setLocalCollectionType(event.data.collectionType);
        }

        if (event.data.collectionElasticity) {
          console.log('✅ Atualizando collectionElasticity:', event.data.collectionElasticity);
          setLocalCollectionElasticity(event.data.collectionElasticity);
        }
      }

      // Configuração completa (também pode incluir type + elasticity)
      if (event.data.type === 'omafit-config-update') {
        console.log('📥 Recebido omafit-config-update:', event.data);

        if (event.data.collectionType) {
          console.log('✅ Atualizando collectionType:', event.data.collectionType);
          setLocalCollectionType(event.data.collectionType);
        }

        if (event.data.collectionElasticity) {
          console.log('✅ Atualizando collectionElasticity:', event.data.collectionElasticity);
          setLocalCollectionElasticity(event.data.collectionElasticity);
        }

        if (event.data.fontFamily) {
          console.log('✅ Atualizando fontFamily:', event.data.fontFamily);
        }

        if (event.data.primaryColor) {
          console.log('✅ Atualizando primaryColor:', event.data.primaryColor);
          setLocalPrimaryColor(event.data.primaryColor);
        }

        if (event.data.storeName) {
          console.log('✅ Atualizando storeName via postMessage:', event.data.storeName);
          setLocalStoreName(event.data.storeName);
        } else if (event.data.shopDomain) {
          // Derivar storeName do shopDomain se não vier explicitamente
          const derived = deriveStoreName(event.data.shopDomain);
          console.log('✅ Derivando storeName do shopDomain:', derived);
          setLocalStoreName(derived);
        }
      }

      // Logo
      if (event.data.type === 'omafit-store-logo') {
        console.log('📥 Recebido logo via postMessage:', event.data.logo);
        if (event.data.logo) {
          setLocalStoreLogo(event.data.logo);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Buscar configurações do widget ao carregar
  useEffect(() => {
    const fetchWidgetConfig = async () => {
      if (!shopDomain) {
        console.log('⚠️ Não há shopDomain para buscar configurações');
        return;
      }

      try {
        const { data: configs, error } = await supabase
          .from('widget_configurations')
          .select('link_text, store_logo, primary_color, title, subtitle')
          .eq('shop_domain', shopDomain)
          .limit(1);

        if (error) {
          console.error('❌ Erro ao buscar configurações do widget:', error);
          return;
        }

        if (configs && configs.length > 0) {
          console.log('✅ Configurações do widget carregadas:', configs[0]);
          const config = configs[0];

          // Atualizar estados locais com as configurações do banco
          if (config.store_logo && config.store_logo.trim() !== '') {
            console.log('✅ Atualizando localStoreLogo do banco:', config.store_logo);
            setLocalStoreLogo(config.store_logo);
          }
          if (config.primary_color) {
            setLocalPrimaryColor(config.primary_color);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao buscar configurações:', error);
      }
    };

    fetchWidgetConfig();
  }, [shopDomain]);

  React.useEffect(() => {
    const decodedImage = decodeURIComponent(garmentImage);
    const images = productImages.length > 0 ? productImages : [decodedImage];

    setAvailableImages(images);
    setSelectedProductImage(images[0]);
    setCurrentImageIndex(0);

    setProduct({
      id: productId,
      name: productName,
      garment_image: decodedImage,
      category: 'auto'
    });
  }, [garmentImage, productId, productName, productImages]);

  React.useEffect(() => {
    if (availableImages.length > 0) {
      setSelectedProductImage(availableImages[currentImageIndex]);
    }
  }, [currentImageIndex, availableImages]);

  // ═══════════════════════════════════════════════════════════════════
  // 🎯 SISTEMA DE RECOMENDAÇÃO DE TAMANHOS - ARQUITETURA EM 5 BLOCOS
  // ═══════════════════════════════════════════════════════════════════
  // 🔹 BLOCO 1: CAPTURA E VALIDAÇÃO DA FOTO (MediaPipe)
  //    → Executado ANTES desta função (em SizeCalculator.tsx)
  //    → Detecta keypoints, valida postura, extrai medidas em pixels
  //    → Normaliza e converte para centímetros reais
  //
  // 🔹 BLOCO 2: CONSTRUÇÃO DO MODELO CORPORAL
  //    → Aplica perfil corporal + IMC para refinar medidas
  //    → Corpo é modelado UMA VEZ, SEM aplicar fit
  //
  // 🔹 BLOCO 3: CONFIGURAÇÃO DO PRODUTO
  //    → Identifica tipo de peça, tabela, pesos de medidas
  //
  // 🔹 BLOCO 4: CÁLCULO DE COMPATIBILIDADE
  //    → Compara corpo com cada tamanho
  //    → Aplica FIT na COMPARAÇÃO (não no corpo)
  //
  // 🔹 BLOCO 5: ZONA LIMÍTROFE (DESEMPATE)
  //    → Detecta scores próximos e usa fit como desempate
  // ═══════════════════════════════════════════════════════════════════

  const calculateRecommendedSize = (measurements: SizeCalculatorData | any, chart: SizeChartEntry[]): { size: string; measurements: any } | null => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 INICIANDO CÁLCULO DE RECOMENDAÇÃO DE TAMANHO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!chart || chart.length === 0) {
      console.warn('❌ ERRO: Nenhuma tabela de medidas disponível');
      return null;
    }

    const { height, weight, bodyTypeIndex, fitIndex, gender, chest: realChest, waist: realWaist, hip: realHip, shoulder: realShoulder } = measurements;

    console.log('━━━━ 🔹 BLOCO 1: CAPTURA MEDIAPIPE (já executado) ━━━━');
    console.log('📊 Entrada de dados:');
    console.log('   Altura:', height, 'cm');
    console.log('   Peso:', weight, 'kg');
    console.log('   Gênero:', gender);
    console.log('   Body Type Index:', bodyTypeIndex);
    console.log('   Fit Index:', fitIndex);
    if (realChest || realWaist || realHip) {
      console.log('   📸 Medidas MediaPipe recebidas:');
      if (realChest) console.log('      Peito:', realChest.toFixed(1), 'cm');
      if (realWaist) console.log('      Cintura:', realWaist.toFixed(1), 'cm');
      if (realHip) console.log('      Quadril:', realHip.toFixed(1), 'cm');
      if (realShoulder) console.log('      Ombro:', realShoulder.toFixed(1), 'cm');
    }

    // ⚠️ PERFIS CORPORAIS: CORREÇÕES SUTIS, NÃO TRANSFORMAÇÕES
    // MediaPipe já forneceu as medidas base.
    // Estes fatores fazem AJUSTES INCREMENTAIS LEVES (±3% a ±7%)
    // NUNCA use fatores > 1.07 ou < 0.93
    const bodyTypeProfiles = {
      // MANEQUIM 1: Balanceado
      mannequin1: {
        chestFactor: 1.00,    // Sem ajuste
        waistFactor: 1.00,    // Sem ajuste
        hipFactor: 1.00,      // Sem ajuste
        shoulderFactor: 1.00, // Sem ajuste
        expectedBMI: 22,
        description: 'Balanceado'
      },
      // MANEQUIM 2: Busto levemente mais desenvolvido
      mannequin2: {
        chestFactor: 1.04,    // +4% no busto
        waistFactor: 1.00,    // Normal
        hipFactor: 1.00,      // Normal
        shoulderFactor: 1.03, // +3% nos ombros
        expectedBMI: 23,
        description: 'Busto desenvolvido'
      },
      // MANEQUIM 3: Tronco superior mais largo
      mannequin3: {
        chestFactor: 1.05,    // +5% no busto
        waistFactor: 1.04,    // +4% na cintura
        hipFactor: 1.02,      // +2% no quadril
        shoulderFactor: 1.04, // +4% nos ombros
        expectedBMI: 25,
        description: 'Tronco superior largo'
      },
      // MANEQUIM 4: Busto mais desenvolvido
      mannequin4: {
        chestFactor: 1.06,    // +6% no busto
        waistFactor: 1.02,    // +2% na cintura
        hipFactor: 1.01,      // +1% no quadril
        shoulderFactor: 1.05, // +5% nos ombros
        expectedBMI: 26,
        description: 'Busto bem desenvolvido'
      },
      // MANEQUIM 5: Corpo mais arredondado
      mannequin5: {
        chestFactor: 1.03,    // +3% no busto
        waistFactor: 1.07,    // +7% na cintura
        hipFactor: 1.06,      // +6% no quadril
        shoulderFactor: 1.02, // +2% nos ombros
        expectedBMI: 29,
        description: 'Corpo arredondado'
      }
    };

    const bodyTypeNames = ['mannequin1', 'mannequin2', 'mannequin3', 'mannequin4', 'mannequin5'] as const;

    console.log('🔍 DEBUG bodyTypeIndex:', {
      raw: bodyTypeIndex,
      isNumber: typeof bodyTypeIndex === 'number',
      value: bodyTypeIndex,
      max: bodyTypeNames.length - 1
    });

    // CRITICAL: Garantir que bodyTypeIndex esteja no intervalo válido
    const safeBodyTypeIndex = Math.min(Math.max(0, bodyTypeIndex || 0), bodyTypeNames.length - 1);

    if (safeBodyTypeIndex !== bodyTypeIndex) {
      console.warn(`⚠️ bodyTypeIndex ajustado de ${bodyTypeIndex} para ${safeBodyTypeIndex}`);
    }

    const selectedBodyType = bodyTypeProfiles[bodyTypeNames[safeBodyTypeIndex]] || bodyTypeProfiles.mannequin1;

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 2 — CONSTRUÇÃO DO MODELO CORPORAL
    // ═══════════════════════════════════════════════════════════════════
    // ⚠️ IMPORTANTE: O corpo é modelado UMA VEZ, SEM aplicar fit.
    // O fit será aplicado apenas na DECISÃO final (BLOCO 4).
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n━━━━ 🔹 BLOCO 2: CONSTRUÇÃO DO MODELO CORPORAL ━━━━');
    console.log('🎭 Perfil do manequim selecionado:', selectedBodyType.description);
    console.log('   - bodyTypeIndex usado:', safeBodyTypeIndex);

    // Calcular IMC para ajuste fino de coerência
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    const bmiDifference = bmi - selectedBodyType.expectedBMI;
    let bmiAdjustment = 1.00 + (bmiDifference * 0.012); // Ajuste LEVE: 1.2% por ponto de IMC
    bmiAdjustment = Math.max(0.92, Math.min(1.08, bmiAdjustment));

    console.log('⚖️ IMC calculado:', bmi.toFixed(1), '→ Esperado:', selectedBodyType.expectedBMI);
    console.log('   Ajuste de coerência:', ((bmiAdjustment - 1) * 100).toFixed(1) + '%');

    // Proporções antropométricas base por gênero
    let baseChestRatio, baseWaistRatio, baseHipRatio;
    if (gender === 'male') {
      baseChestRatio = 0.52;
      baseWaistRatio = 0.46;
      baseHipRatio = 0.52;
    } else {
      baseChestRatio = 0.50;
      baseWaistRatio = 0.40;
      baseHipRatio = 0.55;
    }

    // Verificar se temos medidas REAIS do MediaPipe
    const hasRealMeasurements = realChest && realWaist && realHip;

    let bodyChest, bodyWaist, bodyHip, bodyShoulder;

    if (hasRealMeasurements) {
      console.log('\n✅ MODO: MediaPipe + Perfil');
      console.log('📸 Medidas brutas (MediaPipe):');
      console.log('   Peito:', realChest.toFixed(1), 'cm');
      console.log('   Cintura:', realWaist.toFixed(1), 'cm');
      console.log('   Quadril:', realHip.toFixed(1), 'cm');

      // Aplicar correção LEVE por perfil corporal
      const chestWithProfile = realChest * selectedBodyType.chestFactor;
      const waistWithProfile = realWaist * selectedBodyType.waistFactor;
      const hipWithProfile = realHip * selectedBodyType.hipFactor;

      console.log('\n🎭 Após perfil corporal:');
      console.log('   Peito:', chestWithProfile.toFixed(1), 'cm', `(×${selectedBodyType.chestFactor})`);
      console.log('   Cintura:', waistWithProfile.toFixed(1), 'cm', `(×${selectedBodyType.waistFactor})`);
      console.log('   Quadril:', hipWithProfile.toFixed(1), 'cm', `(×${selectedBodyType.hipFactor})`);

      // Aplicar ajuste LEVE de coerência por IMC
      bodyChest = chestWithProfile * bmiAdjustment;
      bodyWaist = waistWithProfile * bmiAdjustment;
      bodyHip = hipWithProfile * bmiAdjustment;
      bodyShoulder = (realShoulder || (height * 0.25)) * selectedBodyType.shoulderFactor;

      console.log('\n✅ MODELO CORPORAL FINAL (sem fit):');
      console.log('   Peito:', bodyChest.toFixed(1), 'cm');
      console.log('   Cintura:', bodyWaist.toFixed(1), 'cm');
      console.log('   Quadril:', bodyHip.toFixed(1), 'cm');
      console.log('   Ombro:', bodyShoulder.toFixed(1), 'cm');
    } else {
      console.log('\n📏 MODO: Estimativa por altura');

      // Calcular medidas base
      bodyChest = height * baseChestRatio * selectedBodyType.chestFactor * bmiAdjustment;
      bodyWaist = height * baseWaistRatio * selectedBodyType.waistFactor * bmiAdjustment;
      bodyHip = height * baseHipRatio * selectedBodyType.hipFactor * bmiAdjustment;
      bodyShoulder = height * 0.25 * selectedBodyType.shoulderFactor;

      console.log('✅ MODELO CORPORAL FINAL (sem fit):');
      console.log('   Peito:', bodyChest.toFixed(1), 'cm');
      console.log('   Cintura:', bodyWaist.toFixed(1), 'cm');
      console.log('   Quadril:', bodyHip.toFixed(1), 'cm');
      console.log('   Ombro:', bodyShoulder.toFixed(1), 'cm');
    }

    // Armazenar medidas do modelo corporal final para GPT
    setFinalBodyMeasurements({
      chest: Math.round(bodyChest * 10) / 10,
      waist: Math.round(bodyWaist * 10) / 10,
      hip: Math.round(bodyHip * 10) / 10
    });

    console.log('⚠️ Corpo modelado. Fit será aplicado na DECISÃO (BLOCO 4).\n');

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 3 — CONFIGURAÇÃO DO PRODUTO
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n━━━━ 🔹 BLOCO 3: CONFIGURAÇÃO DO PRODUTO ━━━━');
    const hasWeights = measurementWeights && Object.keys(measurementWeights).length > 0;
    console.log('📊 Pesos brutos:', hasWeights ? measurementWeights : 'Pesos iguais');
    console.log('👔 Tabela de tamanhos:', chart.length, 'tamanhos disponíveis');

    // ⚠️ NORMALIZAR PESOS: Garantir estabilidade matemática
    // Pesos devem somar 1.0 para manter consistência entre produtos
    let normalizedWeights: Record<string, number> = {};

    if (hasWeights) {
      const weightSum = Object.values(measurementWeights).reduce((sum, w) => sum + w, 0);

      if (weightSum > 0) {
        // Normalizar: cada peso dividido pela soma
        Object.keys(measurementWeights).forEach(key => {
          normalizedWeights[key] = measurementWeights[key] / weightSum;
        });

        console.log('✅ Pesos normalizados (soma = 1.0):');
        Object.entries(normalizedWeights).forEach(([key, value]) => {
          console.log(`   ${key}: ${value.toFixed(3)} (${(value * 100).toFixed(1)}%)`);
        });
      } else {
        console.warn('⚠️ Soma de pesos = 0, usando pesos iguais');
        normalizedWeights = {};
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 3.1 — ELASTICIDADE DO TECIDO
    // ═══════════════════════════════════════════════════════════════════
    // Elasticidade define TOLERÂNCIA de erro aceitável, não modifica o corpo!

    console.log('\n━━━━ 🔹 BLOCO 3.1: ELASTICIDADE DO TECIDO ━━━━');

    // Mapeamento de elasticidade → tolerância em cm
    const ELASTICITY_TOLERANCE: Record<string, number> = {
      structured: 1.5,  // Tecidos rígidos (jeans, couro) - baixa tolerância
      light: 2.5,       // Tecidos leves (algodão) - tolerância média
      flexible: 4.0,    // Tecidos semi-elásticos (viscose, modal) - alta tolerância
      high: 6.0         // Tecidos muito elásticos (malha, lycra) - tolerância muito alta
    };

    // Perfis avançados por medida (opcional - para refinamento futuro)
    const ELASTICITY_PROFILE: Record<string, Record<string, number>> = {
      structured: { chest: 1.5, waist: 1.5, hip: 1.5, shoulder: 1.0 },
      light: { chest: 2.5, waist: 2.0, hip: 2.5, shoulder: 1.5 },
      flexible: { chest: 4.0, waist: 3.5, hip: 4.0, shoulder: 2.5 },
      high: { chest: 6.0, waist: 5.0, hip: 6.0, shoulder: 4.0 }
    };

    // Penalidade assimétrica: peça menor que corpo é PIOR que peça maior
    // Calibração física realista: tecidos rígidos penalizam MUITO mais quando apertados
    // Malhas toleram melhor porque se adaptam ao corpo
    const ASYMMETRIC_PENALTY: Record<string, number> = {
      structured: 1.7,  // +70% penalidade (jeans, couro - crítico quando aperta)
      light: 1.4,       // +40% penalidade (algodão - desconforto moderado)
      flexible: 1.2,    // +20% penalidade (viscose - adapta parcialmente)
      high: 1.05        // +5% penalidade (malha, lycra - tecido compensa)
    };

    const elasticityLevel = localCollectionElasticity || 'light'; // fallback: light
    const baseTolerance = ELASTICITY_TOLERANCE[elasticityLevel] || 2.5;
    const toleranceProfile = ELASTICITY_PROFILE[elasticityLevel] || ELASTICITY_PROFILE['light'];
    const asymmetricPenalty = ASYMMETRIC_PENALTY[elasticityLevel] || 1.3;

    console.log('📦 Elasticidade selecionada:', elasticityLevel);
    console.log('📏 Tolerância base:', baseTolerance, 'cm');
    console.log('📐 Perfil de tolerância por medida:');
    console.log('   Peito:', toleranceProfile.chest, 'cm');
    console.log('   Cintura:', toleranceProfile.waist, 'cm');
    console.log('   Quadril:', toleranceProfile.hip, 'cm');
    console.log('   Ombro:', toleranceProfile.shoulder, 'cm');
    console.log('⚖️ Penalidade assimétrica (peça < corpo):', `${asymmetricPenalty}x`);
    console.log('⚠️ Elasticidade NÃO altera corpo, apenas tolerância de erro!\n');

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 4 — CÁLCULO DE COMPATIBILIDADE
    // ═══════════════════════════════════════════════════════════════════
    // Aqui aplicamos FIT na DECISÃO, não no corpo!

    console.log('\n━━━━ 🔹 BLOCO 4: CÁLCULO DE COMPATIBILIDADE ━━━━');

    // Preferência de fit aplicada na COMPARAÇÃO
    const fitFactors = [0.94, 1.00, 1.06]; // Justa, Na medida, Solta
    const fitNames = ['Justa', 'Na medida', 'Solta'];

    console.log('🔍 DEBUG fitIndex:', {
      raw: fitIndex,
      isNumber: typeof fitIndex === 'number',
      value: fitIndex,
      max: fitFactors.length - 1
    });

    // CRITICAL: Garantir que fitIndex esteja no intervalo válido
    const safeFitIndex = Math.min(Math.max(0, fitIndex || 1), fitFactors.length - 1);

    if (safeFitIndex !== fitIndex) {
      console.warn(`⚠️ fitIndex ajustado de ${fitIndex} para ${safeFitIndex}`);
    }

    const fitMultiplier = fitFactors[safeFitIndex] || 1.00;

    console.log('👔 Preferência de fit:', fitNames[safeFitIndex], `(${fitMultiplier})`);
    console.log('   - fitIndex usado:', safeFitIndex);
    console.log('⚠️ Fit aplicado na COMPARAÇÃO, não no corpo!\n');

    // Array para armazenar todos os scores
    const sizeScores: Array<{ size: string; score: number; details: string[] }> = [];

    chart.forEach((sizeData, index) => {
      const chest = parseFloat(sizeData.peito || sizeData.chest || sizeData.busto || '0');
      const waist = parseFloat(sizeData.cintura || sizeData.waist || '0');
      const hip = parseFloat(sizeData.quadril || sizeData.hip || '0');
      const shoulder = parseFloat(sizeData.ombro || sizeData.shoulder || '0');
      const length = parseFloat(sizeData.comprimento || sizeData.length || '0');

      // Construir diferenças ponderadas com FIT aplicado
      const weightedDifferences: number[] = [];
      const measurementsUsed: string[] = [];

      if (chest > 0) {
        const weight = hasWeights ? (normalizedWeights['Peito'] || normalizedWeights['Busto'] || 1.0) : 1.0;
        const bodyMeasurement = bodyChest * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - chest);
        const tolerance = toleranceProfile.chest;
        let normalizedError = rawDiff / tolerance;

        // Penalidade assimétrica: peça menor que corpo é PIOR
        const isGarmentTooSmall = bodyMeasurement > chest;
        if (isGarmentTooSmall) {
          normalizedError *= asymmetricPenalty;
        }

        const diff = Math.pow(normalizedError, 2) * weight;
        weightedDifferences.push(diff);
        const penaltyLabel = isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : '';
        measurementsUsed.push(`peito (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${chest}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm, peso: ${weight.toFixed(3)}${penaltyLabel})`);
      }

      if (waist > 0) {
        const weight = hasWeights ? (normalizedWeights['Cintura'] || 1.0) : 1.0;
        const bodyMeasurement = bodyWaist * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - waist);
        const tolerance = toleranceProfile.waist;
        let normalizedError = rawDiff / tolerance;

        // Penalidade assimétrica: peça menor que corpo é PIOR
        const isGarmentTooSmall = bodyMeasurement > waist;
        if (isGarmentTooSmall) {
          normalizedError *= asymmetricPenalty;
        }

        const diff = Math.pow(normalizedError, 2) * weight;
        weightedDifferences.push(diff);
        const penaltyLabel = isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : '';
        measurementsUsed.push(`cintura (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${waist}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm, peso: ${weight.toFixed(3)}${penaltyLabel})`);
      }

      if (hip > 0) {
        const weight = hasWeights ? (normalizedWeights['Quadril'] || 1.0) : 1.0;
        const bodyMeasurement = bodyHip * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - hip);
        const tolerance = toleranceProfile.hip;
        let normalizedError = rawDiff / tolerance;

        // Penalidade assimétrica: peça menor que corpo é PIOR
        const isGarmentTooSmall = bodyMeasurement > hip;
        if (isGarmentTooSmall) {
          normalizedError *= asymmetricPenalty;
        }

        const diff = Math.pow(normalizedError, 2) * weight;
        weightedDifferences.push(diff);
        const penaltyLabel = isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : '';
        measurementsUsed.push(`quadril (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${hip}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm, peso: ${weight.toFixed(3)}${penaltyLabel})`);
      }

      if (shoulder > 0) {
        const weight = hasWeights ? (normalizedWeights['Ombro'] || 1.0) : 1.0;
        const bodyMeasurement = bodyShoulder * fitMultiplier;
        const rawDiff = Math.abs(bodyMeasurement - shoulder);
        const tolerance = toleranceProfile.shoulder;
        let normalizedError = rawDiff / tolerance;

        // Penalidade assimétrica: peça menor que corpo é PIOR
        const isGarmentTooSmall = bodyMeasurement > shoulder;
        if (isGarmentTooSmall) {
          normalizedError *= asymmetricPenalty;
        }

        const diff = Math.pow(normalizedError, 2) * weight;
        weightedDifferences.push(diff);
        const penaltyLabel = isGarmentTooSmall ? ` [APERTADO ×${asymmetricPenalty}]` : '';
        measurementsUsed.push(`ombro (corpo: ${bodyMeasurement.toFixed(1)}, peça: ${shoulder}, erro: ${rawDiff.toFixed(1)}cm, tolerância: ${tolerance}cm, peso: ${weight.toFixed(3)}${penaltyLabel})`);
      }

      if (length > 0 && hip === 0) {
        const expectedLength = height * 0.40;
        const weight = hasWeights ? (normalizedWeights['Comprimento'] || 1.0) : 1.0;
        const diff = Math.pow(expectedLength - length, 2) * weight;
        weightedDifferences.push(diff);
        measurementsUsed.push(`comprimento (esperado: ${expectedLength.toFixed(1)}, peça: ${length}, peso: ${weight.toFixed(3)})`);
      }

      if (weightedDifferences.length === 0) {
        console.warn(`   ${index + 1}. ⚠️ Tamanho ${sizeData.size}: sem medidas válidas`);
        return;
      }

      const score = Math.sqrt(weightedDifferences.reduce((sum, diff) => sum + diff, 0));
      sizeScores.push({ size: sizeData.size, score, details: measurementsUsed });

      console.log(`   ${index + 1}. Tamanho ${sizeData.size}:`);
      console.log(`      Score: ${score.toFixed(2)}`);
      measurementsUsed.forEach(detail => console.log(`      ${detail}`));
    });

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 5 — ZONA LIMÍTROFE (DESEMPATE)
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n━━━━ 🔹 BLOCO 5: ZONA LIMÍTROFE ━━━━');

    if (sizeScores.length === 0) {
      console.log('❌ Nenhum tamanho válido encontrado');
      return null;
    }

    // Função helper para comparar tamanhos
    const compareSizes = (size1: string, size2: string): number => {
      // Ordem padrão de tamanhos brasileiros
      const sizeOrder: { [key: string]: number } = {
        'XPP': 0, 'PP': 1, 'XP': 2, 'P': 3, 'M': 4, 'G': 5, 'GG': 6, 'XG': 7, '3G': 7, 'XXG': 8, '4G': 8,
        // Tamanhos numéricos (comum em roupas infantis/internacionais)
        '2': 2, '4': 3, '6': 4, '8': 5, '10': 6, '12': 7, '14': 8, '16': 9,
        // Tamanhos internacionais
        'XXS': 0, 'XS': 1, 'S': 2, 'L': 5, 'XL': 6, 'XXL': 7, '3XL': 8, '4XL': 9
      };

      const order1 = sizeOrder[size1.toUpperCase()] ?? 999;
      const order2 = sizeOrder[size2.toUpperCase()] ?? 999;
      return order1 - order2; // negativo se size1 < size2, positivo se size1 > size2
    };

    // Ordenar por score
    sizeScores.sort((a, b) => a.score - b.score);

    const bestMatch = sizeScores[0];
    const secondBest = sizeScores[1];

    console.log('🥇 Melhor match:', bestMatch.size, '(score:', bestMatch.score.toFixed(2) + ')');
    if (secondBest) {
      console.log('🥈 Segundo melhor:', secondBest.size, '(score:', secondBest.score.toFixed(2) + ')');

      const scoreDifference = Math.abs(bestMatch.score - secondBest.score);

      // Zona limítrofe RELATIVA: 20% de diferença
      // Importante: usar diferença relativa ao invés de absoluta
      // Score 0.5 vs 0.7 é muito diferente de 4.5 vs 4.7
      // PISO de 0.5 evita distorção quando score é extremamente baixo
      const scoreFloor = Math.max(bestMatch.score, 0.5);
      const relativeDifference = scoreDifference / scoreFloor;
      const relativeThreshold = 0.20; // 20% de diferença

      console.log('📊 Diferença absoluta:', scoreDifference.toFixed(2));
      console.log('📊 Score com piso:', scoreFloor.toFixed(2));
      console.log('📊 Diferença relativa:', (relativeDifference * 100).toFixed(1) + '%');

      if (relativeDifference < relativeThreshold) {
        console.log('⚠️ ZONA LIMÍTROFE detectada! (diferença relativa:', (relativeDifference * 100).toFixed(1) + '% < threshold:', (relativeThreshold * 100) + '%)');
        console.log('   Preferência de fit usada como desempate:', fitNames[fitIndex]);

        // Determinar qual tamanho é efetivamente MAIOR
        const sizeComparison = compareSizes(bestMatch.size, secondBest.size);
        const largerSize = sizeComparison > 0 ? bestMatch : secondBest;
        const smallerSize = sizeComparison > 0 ? secondBest : bestMatch;

        console.log('   📏 Comparação:', smallerSize.size, '<', largerSize.size);

        // Desempate: se usuário quer justa, escolhe o menor
        // Se quer solta, escolhe o maior
        if (fitIndex === 0) {
          // Fit justa: escolher o menor
          console.log('   → Escolhendo tamanho menor (fit justa):', smallerSize.size);
          console.log('\n✅ RECOMENDAÇÃO FINAL:', smallerSize.size);
          return {
            size: smallerSize.size,
            measurements: {
              chest: bodyChest,
              waist: bodyWaist,
              hip: bodyHip,
              shoulder: bodyShoulder
            }
          };
        } else if (fitIndex === 2) {
          // Fit solta: escolher o maior
          console.log('   → Escolhendo tamanho maior (fit solta):', largerSize.size);
          console.log('\n✅ RECOMENDAÇÃO FINAL:', largerSize.size);
          return {
            size: largerSize.size,
            measurements: {
              chest: bodyChest,
              waist: bodyWaist,
              hip: bodyHip,
              shoulder: bodyShoulder
            }
          };
        }
      } else {
        console.log('✅ Diferença significativa - mantendo melhor match');
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 6 — CONFIANÇA DA RECOMENDAÇÃO (ENRIQUECIDA)
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n━━━━ 🔹 BLOCO 6: CONFIANÇA DA RECOMENDAÇÃO (ENRIQUECIDA) ━━━━');

    // FATOR 1: Score absoluto (base)
    let baseConfidence = 0;
    if (bestMatch.score < 1.0) {
      baseConfidence = 100;
    } else if (bestMatch.score < 2.0) {
      baseConfidence = 70;
    } else if (bestMatch.score < 3.0) {
      baseConfidence = 40;
    } else {
      baseConfidence = 20;
    }

    console.log('📊 Score do melhor match:', bestMatch.score.toFixed(2));
    console.log('   → Confiança base:', baseConfidence + '%');

    // FATOR 2: Dominância (distância para segundo melhor)
    // Quanto maior a diferença, mais confiança
    let dominanceBonus = 0;
    if (secondBest) {
      const scoreDiff = secondBest.score - bestMatch.score;
      const scoreFloor = Math.max(bestMatch.score, 0.5);
      const dominance = scoreDiff / scoreFloor;

      console.log('🥈 Segundo melhor score:', secondBest.score.toFixed(2));
      console.log('   → Diferença:', scoreDiff.toFixed(2));
      console.log('   → Dominância relativa:', (dominance * 100).toFixed(1) + '%');

      // Dominância forte (>30%) = +20 pontos
      // Dominância moderada (15-30%) = +10 pontos
      // Dominância fraca (<15%) = 0 pontos
      if (dominance > 0.30) {
        dominanceBonus = 20;
        console.log('   → Dominância FORTE: +20 pontos');
      } else if (dominance > 0.15) {
        dominanceBonus = 10;
        console.log('   → Dominância MODERADA: +10 pontos');
      } else {
        dominanceBonus = 0;
        console.log('   → Dominância FRACA: sem bônus');
      }
    } else {
      // Apenas 1 tamanho disponível = baixa confiança
      dominanceBonus = -20;
      console.log('   → Apenas 1 tamanho disponível: -20 pontos');
    }

    // FATOR 3: Elasticidade (contexto do tecido)
    // Tecidos mais elásticos permitem maior margem de erro
    let elasticityBonus = 0;
    const ELASTICITY_CONFIDENCE_BONUS: Record<string, number> = {
      structured: -10,  // Tecido rígido = menos tolerância = reduz confiança
      light: 0,         // Tecido normal = neutro
      flexible: 5,      // Semi-elástico = pequeno bônus
      high: 10          // Muito elástico = bom bônus (compensa imperfeições)
    };
    elasticityBonus = ELASTICITY_CONFIDENCE_BONUS[elasticityLevel] || 0;
    console.log('🧵 Elasticidade:', elasticityLevel);
    console.log('   → Ajuste de confiança:', (elasticityBonus >= 0 ? '+' : '') + elasticityBonus + ' pontos');

    // CONFIANÇA FINAL (0-100)
    const finalConfidence = Math.max(0, Math.min(100, baseConfidence + dominanceBonus + elasticityBonus));

    console.log('\n🎯 CONFIANÇA FINAL:', finalConfidence + '%');
    console.log('   Base:', baseConfidence + '%');
    console.log('   Dominância:', (dominanceBonus >= 0 ? '+' : '') + dominanceBonus + '%');
    console.log('   Elasticidade:', (elasticityBonus >= 0 ? '+' : '') + elasticityBonus + '%');

    // Classificação em 3 níveis
    let confidence: 'high' | 'medium' | 'low';
    let confidenceMessage: string;
    let confidenceEmoji: string;

    if (finalConfidence >= 75) {
      confidence = 'high';
      confidenceEmoji = '🟢';
      confidenceMessage = 'Alta compatibilidade com seu corpo';
    } else if (finalConfidence >= 50) {
      confidence = 'medium';
      confidenceEmoji = '🟡';
      confidenceMessage = 'Boa compatibilidade com seu corpo';
    } else {
      confidence = 'low';
      confidenceEmoji = '🟠';
      confidenceMessage = 'Compatibilidade aceitável - pode haver pequenos ajustes';
    }

    console.log(confidenceEmoji, 'Classificação:', confidence.toUpperCase());
    console.log('💬 Mensagem:', confidenceMessage);

    // Armazenar confiança nos estados
    setConfidenceLevel(confidence);
    setConfidenceScore(bestMatch.score);

    console.log('\n✅ RECOMENDAÇÃO FINAL:', bestMatch.size);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Retornar no mesmo formato que calculateIdealSize para consistência
    return {
      size: bestMatch.size,
      measurements: {
        chest: bodyChest,
        waist: bodyWaist,
        hip: bodyHip,
        shoulder: bodyShoulder
      }
    };
  };

  useEffect(() => {
    const loadSizeChart = async () => {
      console.log('🔍 ===== TRYON WIDGET: CARREGANDO SIZE CHART =====');

      if (!sizeData?.gender) {
        console.log('❌ BLOQUEADO: Não há gender no sizeData');
        console.log('   - sizeData completo:', sizeData);
        return;
      }

      if (!shopDomain) {
        console.log('❌ BLOQUEADO: Não há shopDomain');
        return;
      }

      console.log('📊 Parâmetros de busca no TryOnWidget:');
      console.log('   - Gender escolhido pelo usuário (sizeData):', sizeData.gender);
      console.log('   - Default Gender (props, não usado na busca):', defaultGender);
      console.log('   - Shop Domain:', shopDomain);
      console.log('   - Collection ID (UUID interno):', collectionId || 'null');
      console.log('   - Collection Handle (Shopify):', collectionHandle || 'null (tabela global)');
      console.log('   - Product ID:', productId);

      // SEMPRE usar o gender escolhido pelo usuário no widget
      const searchGender = sizeData.gender;
      console.log('   - 🎯 Gender FINAL para busca (sempre do usuário):', searchGender);

      try {
        // Buscar a size_chart primeiro
        console.log('🔍 ===== BUSCANDO SIZE_CHART =====');
        let sizeChartQuery = supabase
          .from('size_charts')
          .select('id, collection_id, collection_handle, gender, shop_domain');

        // Prioridade 1: collection_handle (vindo do Shopify)
        if (collectionHandle && collectionHandle.trim() !== '') {
          console.log('🔍 Modo: BUSCA POR COLLECTION_HANDLE (SHOPIFY)');
          console.log('   SELECT * FROM size_charts');
          console.log('   WHERE shop_domain =', shopDomain);
          console.log('   AND collection_handle =', collectionHandle);
          console.log('   AND gender =', searchGender);

          sizeChartQuery = sizeChartQuery
            .eq('shop_domain', shopDomain)
            .eq('collection_handle', collectionHandle)
            .eq('gender', searchGender);
        }
        // Prioridade 2: collection_id (UUID interno)
        else if (collectionId && collectionId.trim() !== '') {
          console.log('🔍 Modo: BUSCA POR COLLECTION_ID (UUID INTERNO)');
          console.log('   SELECT * FROM size_charts');
          console.log('   WHERE collection_id =', collectionId);
          console.log('   AND gender =', searchGender);

          sizeChartQuery = sizeChartQuery
            .eq('collection_id', collectionId)
            .eq('gender', searchGender);
        }
        // Prioridade 3: Tabela global (sem collection)
        else {
          console.log('🔍 Modo: BUSCA POR TABELA GLOBAL (SEM COLEÇÃO)');
          console.log('   SELECT * FROM size_charts');
          console.log('   WHERE shop_domain =', shopDomain);
          console.log('   AND collection_handle IS NULL');
          console.log('   AND collection_id IS NULL');
          console.log('   AND gender =', searchGender);

          sizeChartQuery = sizeChartQuery
            .eq('shop_domain', shopDomain)
            .is('collection_handle', null)
            .is('collection_id', null)
            .eq('gender', searchGender);
        }

        const { data: sizeChartRecord, error: chartError } = await sizeChartQuery.maybeSingle();

        if (chartError) {
          console.error('❌ Erro ao buscar size_chart:', chartError);
          return;
        }

        console.log('📊 Resultado da busca de size_chart:');
        if (sizeChartRecord) {
          console.log('✅ SIZE_CHART ENCONTRADO:');
          console.log('   - ID:', sizeChartRecord.id);
          console.log('   - Collection ID:', sizeChartRecord.collection_id || 'null (global)');
          console.log('   - Gender:', sizeChartRecord.gender);
          console.log('   - Shop Domain:', sizeChartRecord.shop_domain);
        } else {
          console.log('❌ SIZE_CHART NÃO ENCONTRADO');
        }

        let sizeChartData = null;

        // Definir measurement weights baseado no collectionType
        if (collectionType && ['upper', 'lower', 'full'].includes(collectionType)) {
          console.log('⚖️ Usando collectionType da prop:', collectionType);
          const defaultWeights = {
            'upper': { Busto: 2.0, Peito: 2.0, Cintura: 1.0, Quadril: 1.0, Comprimento: 1.0, Ombro: 1.0 },
            'lower': { Busto: 1.0, Peito: 1.0, Cintura: 2.0, Quadril: 2.0, Comprimento: 1.0, Tornozelo: 1.0 },
            'full': { Busto: 1.0, Peito: 1.0, Cintura: 1.0, Quadril: 1.0, Comprimento: 1.0, Ombro: 1.0 }
          };
          const weights = defaultWeights[collectionType];
          setMeasurementWeights(weights);
          console.log('✅ Pesos aplicados pelo collectionType:', weights);
        }

        if (sizeChartRecord) {
          // Buscar as entries da tabela
          console.log('🔍 ===== BUSCANDO SIZE_CHART_ENTRIES =====');
          console.log('   SELECT * FROM size_chart_entries');
          console.log('   WHERE size_chart_id =', sizeChartRecord.id);

          const { data: entries, error: entriesError } = await supabase
            .from('size_chart_entries')
            .select('size_name, measurements, bust, waist, hips, order')
            .eq('size_chart_id', sizeChartRecord.id)
            .order('order', { ascending: true });

          if (entriesError) {
            console.error('❌ Erro ao buscar entries:', entriesError);
            return;
          }

          console.log('📊 Resultado da busca de entries:');
          console.log('   - Número de entries:', entries?.length || 0);

          if (entries && entries.length > 0) {
            // Converter entries para o formato esperado pelo componente
            sizeChartData = entries.map((entry: any) => {
              // Tentar usar measurements primeiro, senão usar bust/waist/hips individuais
              let measurements = entry.measurements || {};

              // Se não tem measurements, construir do bust/waist/hips
              if (Object.keys(measurements).length === 0) {
                measurements = {
                  bust: entry.bust,
                  waist: entry.waist,
                  hips: entry.hips
                };
              }

              console.log(`   - ${entry.size_name}:`, measurements);
              console.log(`     Campos detectados: ${Object.keys(measurements).join(', ')}`);

              const mappedEntry = {
                size: entry.size_name,
                // Tentar todas as variações possíveis de peito/busto
                peito: measurements.peito?.toString() || measurements.bust?.toString() || measurements.chest?.toString(),
                chest: measurements.peito?.toString() || measurements.bust?.toString() || measurements.chest?.toString(),
                // Tentar todas as variações de cintura
                cintura: measurements.cintura?.toString() || measurements.waist?.toString(),
                waist: measurements.cintura?.toString() || measurements.waist?.toString(),
                // Tentar todas as variações de quadril
                quadril: measurements.quadril?.toString() || measurements.hips?.toString() || measurements.hip?.toString(),
                hip: measurements.quadril?.toString() || measurements.hips?.toString() || measurements.hip?.toString(),
                // Adicionar comprimento caso exista
                comprimento: measurements.comprimento?.toString() || measurements.length?.toString(),
                length: measurements.comprimento?.toString() || measurements.length?.toString()
              };

              console.log(`     Mapeado para: peito=${mappedEntry.peito}, cintura=${mappedEntry.cintura}, quadril=${mappedEntry.quadril}, comprimento=${mappedEntry.comprimento}`);

              return mappedEntry;
            });

            console.log('✅ SIZE_CHART_DATA construído com', sizeChartData.length, 'tamanhos');
          }
        }

        // Fallback para unisex se não encontrou
        if (!sizeChartData || sizeChartData.length === 0) {
          console.log('⚠️ Chart específico NÃO encontrado, tentando fallback unisex...');
          console.log('🔍 Executando query fallback:');

          let fallbackQuery = supabase
            .from('size_charts')
            .select('id, collection_id, collection_handle, gender, shop_domain');

          // Prioridade 1: collection_handle (vindo do Shopify)
          if (collectionHandle && collectionHandle.trim() !== '') {
            console.log('   SELECT * FROM size_charts');
            console.log('   WHERE shop_domain =', shopDomain);
            console.log('   AND collection_handle =', collectionHandle);
            console.log('   AND gender = unisex');

            fallbackQuery = fallbackQuery
              .eq('shop_domain', shopDomain)
              .eq('collection_handle', collectionHandle)
              .eq('gender', 'unisex');
          }
          // Prioridade 2: collection_id (UUID interno)
          else if (collectionId && collectionId.trim() !== '') {
            console.log('   SELECT * FROM size_charts');
            console.log('   WHERE collection_id =', collectionId);
            console.log('   AND gender = unisex');

            fallbackQuery = fallbackQuery
              .eq('collection_id', collectionId)
              .eq('gender', 'unisex');
          }
          // Prioridade 3: Tabela global
          else {
            console.log('   SELECT * FROM size_charts');
            console.log('   WHERE shop_domain =', shopDomain);
            console.log('   AND collection_handle IS NULL');
            console.log('   AND collection_id IS NULL');
            console.log('   AND gender = unisex');

            fallbackQuery = fallbackQuery
              .eq('shop_domain', shopDomain)
              .is('collection_handle', null)
              .is('collection_id', null)
              .eq('gender', 'unisex');
          }

          const { data: unisexChart } = await fallbackQuery.maybeSingle();

          if (unisexChart) {
            console.log('✅ Chart UNISEX encontrado, buscando entries...');

            const { data: unisexEntries } = await supabase
              .from('size_chart_entries')
              .select('size_name, measurements, bust, waist, hips, order')
              .eq('size_chart_id', unisexChart.id)
              .order('order', { ascending: true });

            if (unisexEntries && unisexEntries.length > 0) {
              sizeChartData = unisexEntries.map((entry: any) => {
                let measurements = entry.measurements || {};
                if (Object.keys(measurements).length === 0) {
                  measurements = {
                    bust: entry.bust,
                    waist: entry.waist,
                    hips: entry.hips
                  };
                }

                return {
                  size: entry.size_name,
                  peito: measurements.bust?.toString() || measurements.chest?.toString(),
                  chest: measurements.bust?.toString() || measurements.chest?.toString(),
                  cintura: measurements.waist?.toString(),
                  waist: measurements.waist?.toString(),
                  quadril: measurements.hips?.toString() || measurements.hip?.toString(),
                  hip: measurements.hips?.toString() || measurements.hip?.toString()
                };
              });

              console.log('✅ Usando size chart UNISEX como fallback');
              console.log('   - Número de tamanhos:', sizeChartData.length);
            }
          }
        }

        if (sizeChartData && sizeChartData.length > 0) {
          setSizeChart(sizeChartData);
          console.log('✅ setSizeChart() chamado com sucesso');
          console.log('   - Tamanhos disponíveis:', sizeChartData.map((s: any) => s.size).join(', '));
          console.log('⏳ Aguardando foto do usuário para calcular tamanho com MediaPipe...');
        } else {
          console.log('❌ PROBLEMA: Nenhum chart encontrado!');
          console.log('   - Shop Domain:', shopDomain);
          console.log('   - Collection Handle (Shopify):', collectionHandle || 'null');
          console.log('   - Collection ID (UUID):', collectionId || 'null');
          console.log('   - Gender:', searchGender);
          console.log('   - Tentou unisex: Sim');
          console.log('   ⚠️ AÇÃO: Verifique se a tabela existe no banco com esses critérios');
        }
      } catch (error) {
        console.error('❌ ERRO CRÍTICO ao carregar size chart:', error);
      }

      console.log('🔍 ===== FIM DO CARREGAMENTO DE SIZE CHART =====');
    };

    loadSizeChart();
  }, [sizeData?.gender, shopDomain, collectionId, collectionHandle]);

const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    console.log('📸 Arquivo selecionado:', file.name, file.size, 'bytes');

    if (file.size > 5 * 1024 * 1024) {
      setError(t('maxFileSize'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(t('onlyImages'));
      return;
    }

    setModelImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      console.log('✅ Image preview gerado, tamanho:', preview.length, 'caracteres');
      console.log('🎯 selectedProductImage:', selectedProductImage);
      setImagePreview(preview);
      setError('');
      setStep('confirm');
      console.log('📍 Step alterado para: confirm');
    };
    reader.readAsDataURL(file);
  }
};

const handleSubmit = async () => {
  if (!modelImage || !product) {
    setError(t('selectProductAndPhoto'));
    return;
  }

  setLoading(true);
  setStep('processing');
  setError('');
  setProcessingMessage(t('sendingImages'));

  try {
    const modelImageDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(modelImage);
    });

    // 🎯 DETECTAR LANDMARKS COM MEDIAPIPE (FRONTEND)
    let detectedLandmarks = null;
    let detectedMeasurements = null;

    if (!mediapipeLoading && !mediapipeError) {
      try {
        console.log('🔍 Detectando landmarks com MediaPipe no frontend...');
        setProcessingMessage(t('analyzingPhoto'));

        // Permitir que a UI atualize antes de processar
        await new Promise(resolve => setTimeout(resolve, 50));

        const imgElement = new Image();
        imgElement.src = modelImageDataUrl;

        await new Promise((resolve, reject) => {
          imgElement.onload = resolve;
          imgElement.onerror = reject;
          // Timeout de segurança
          setTimeout(() => reject(new Error('Image load timeout')), 5000);
        });

        // Permitir que a UI atualize novamente
        await new Promise(resolve => setTimeout(resolve, 50));

        const poseResult = await detectPose(imgElement);

        if (poseResult && poseResult.landmarks && poseResult.landmarks.length > 0) {
          const landmarks = poseResult.landmarks[0];
          console.log('✅ MediaPipe detectou', landmarks.length, 'landmarks');

          detectedLandmarks = landmarks.map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility || 0
          }));

          // Permitir que a UI atualize antes do cálculo pesado
          await new Promise(resolve => setTimeout(resolve, 50));

          const measurements = calculateBodyMeasurements(
            detectedLandmarks,
            imgElement.width,
            imgElement.height
          );

          detectedMeasurements = measurements;

          console.log('📐 Medidas calculadas pelo MediaPipe:', measurements);
        } else {
          console.warn('⚠️ MediaPipe não detectou poses na imagem');
        }
      } catch (err) {
        console.error('❌ Erro ao detectar landmarks no frontend:', err);
        // Continuar mesmo com erro no MediaPipe - edge function fará a detecção
      }
    } else {
      console.log('⏭️ MediaPipe não está pronto, edge function fará a detecção');
    }

    // 🔹 VALIDAÇÃO CRÍTICA: altura e peso são obrigatórios para MediaPipe
    if (!sizeData || !sizeData.height || !sizeData.weight) {
      console.error('❌ ERRO: Dados do usuário incompletos!');
      console.error('   sizeData completo:', sizeData);
      console.error('   height:', sizeData?.height);
      console.error('   weight:', sizeData?.weight);
      setError('Por favor, preencha todos os dados do formulário (altura e peso são obrigatórios)');
      setLoading(false);
      setStep('confirm');
      return;
    }

    const payload = {
      shop_domain: shopDomain,
      model_image: modelImageDataUrl,
      garment_image: selectedProductImage || product.garment_image,
      product_name: product.name,
      product_id: product.id,
      public_id: publicId,
      user_measurements: {
        gender: sizeData.gender || 'unisex',
        height: sizeData.height,
        weight: sizeData.weight,
        body_type_index: sizeData.bodyTypeIndex || 0,
        fit_preference_index: sizeData.fitIndex || 0,
        recommended_size: recommendedSize || calculatedSize
      },
      // 🎯 NOVOS CAMPOS: Landmarks e medidas detectadas pelo MediaPipe no frontend
      pose_landmarks: detectedLandmarks,
      detected_measurements: detectedMeasurements
    };

    console.log('═══════════════════════════════════════════════════════');
    console.log('📤 PAYLOAD ENVIADO PARA EDGE FUNCTION');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔑 publicId:', publicId);
    console.log('📦 product:', product.name, '(id:', product.id + ')');
    console.log('👤 user_measurements enviado:');
    console.log('   • gender:', payload.user_measurements.gender);
    console.log('   • height:', payload.user_measurements.height, 'cm');
    console.log('   • weight:', payload.user_measurements.weight, 'kg');
    console.log('   • body_type_index:', payload.user_measurements.body_type_index);
    console.log('   • fit_preference_index:', payload.user_measurements.fit_preference_index);
    console.log('   • recommended_size:', payload.user_measurements.recommended_size);
    console.log('📷 model_image:', modelImageDataUrl ? 'presente (base64 ' + modelImageDataUrl.length + ' chars)' : '❌ AUSENTE');
    console.log('👕 garment_image:', payload.garment_image.substring(0, 80) + '...');
    console.log('🎯 pose_landmarks:', detectedLandmarks ? `presente (${detectedLandmarks.length} landmarks)` : '❌ não detectado (edge function fará)');
    console.log('📐 detected_measurements:', detectedMeasurements || '❌ não detectado');
    console.log('═══════════════════════════════════════════════════════');

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tryon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || t('processingError'));
    }

    const result = await response.json();

    console.log('═══════════════════════════════════════════════════════');
    console.log('📦 RESPOSTA DO BACKEND RECEBIDA');
    console.log('═══════════════════════════════════════════════════════');
    console.log('• FAL Request ID:', result.fal_request_id);
    console.log('• Body Measurements presente?', !!result.body_measurements);

    // 🔹 MOSTRAR DEBUG INFO DA EDGE FUNCTION
    if (result.debug) {
      console.log('');
      console.log('🔍 DEBUG INFO DA EDGE FUNCTION:');
      console.log('   • MediaPipe Status:', result.debug.mediapipe_status);
      console.log('   • MediaPipe Retornou Algo?', result.debug.mediapipe_returned);
      console.log('   • MediaPipe Source:', result.debug.mediapipe_source);
      console.log('   • Altura Recebida no Backend:', result.debug.user_height_received);
      console.log('   • Peso Recebido no Backend:', result.debug.user_weight_received);
      console.log('   • Gênero Recebido no Backend:', result.debug.user_gender_received);
      console.log('');
    }

    if (result.body_measurements) {
      console.log('🔍 FRONTEND - body_measurements COMPLETO:');
      console.log(JSON.stringify(result.body_measurements, null, 2));
      console.log('');

      console.log('📊 MEDIAPIPE - DADOS RECEBIDOS:');
      console.log('   Source:', result.body_measurements.source || 'N/A');
      console.log('   Confiança:', result.body_measurements.confidence ?
        (result.body_measurements.confidence * 100).toFixed(1) + '%' : 'N/A');

      if (result.body_measurements.bodyHeight) {
        console.log('');
        console.log('📐 Medidas corporais detectadas:');
        console.log('   • Altura:', result.body_measurements.bodyHeight + 'cm');
        console.log('   • Ombros:', result.body_measurements.shoulderWidth + 'cm');
        console.log('   • Peito:', result.body_measurements.chestCircumference + 'cm');
        console.log('   • Cintura:', result.body_measurements.waistCircumference + 'cm');
        console.log('   • Quadril:', result.body_measurements.hipCircumference + 'cm');
        console.log('   • Braço:', result.body_measurements.armLength + 'cm');
        console.log('   • Perna:', result.body_measurements.legLength + 'cm');
      }
    } else {
      console.log('⚠️ Nenhum dado do MediaPipe retornado');
    }
    console.log('═══════════════════════════════════════════════════════');

    if (result.success && result.fal_request_id) {
      setPredictionId(result.fal_request_id);
      setProcessingMessage(t('generating'));

      // Se temos medidas do MediaPipe, calcular tamanho recomendado com elas
      // MAS APENAS se a confiança do MediaPipe > 0 (não são dados mockados)
      const mediaPipeConfidence = result.body_measurements?.confidence || 0;
      const isMediaPipeMocked = mediaPipeConfidence === 0;

      if (result.body_measurements && sizeChart.length > 0 && !isMediaPipeMocked) {
        console.log('');
        console.log('🧮 CALCULANDO TAMANHO com medidas REAIS do MediaPipe...');
        console.log('   Confiança:', (mediaPipeConfidence * 100).toFixed(1) + '%');

        const realMeasurements = {
          height: result.body_measurements.bodyHeight,
          weight: sizeData?.weight || 70,
          bodyTypeIndex: sizeData?.bodyTypeIndex || 0,
          fitIndex: sizeData?.fitIndex || 0,
          gender: sizeData?.gender || 'unisex',
          // Medidas REAIS detectadas
          chest: result.body_measurements.chestCircumference,
          waist: result.body_measurements.waistCircumference,
          hip: result.body_measurements.hipCircumference,
          shoulder: result.body_measurements.shoulderWidth
        };

        const sizeResult = calculateRecommendedSize(realMeasurements as any, sizeChart);
        console.log('');
        if (sizeResult) {
          setRecommendedSize(sizeResult.size);
          setCalculatedSize(sizeResult.size);
          console.log('✅ TAMANHO CALCULADO COM SUCESSO:', sizeResult.size);
          console.log('   Match score:', sizeResult.matchScore?.toFixed(1) + '%');
        } else {
          console.log('❌ ERRO: calculateRecommendedSize retornou null');
          console.log('   Verifique se o size chart está correto');
        }
      } else if (isMediaPipeMocked) {
        console.log('');
        console.log('⚠️ MEDIAPIPE: Dados MOCKADOS detectados (confiança = 0)');
        console.log('   → Ignorando medidas do MediaPipe');
        console.log('   → Nenhum cálculo de tamanho será feito');
      } else if (!result.body_measurements) {
        console.log('');
        console.log('⚠️ MEDIAPIPE: Nenhuma medida retornada');
      }

      startPolling(result.fal_request_id);
    } else {
      throw new Error(result.error || t('processingError'));
    }
  } catch (error: any) {
    console.error('Erro no try-on:', error);
    setError(error.message || t('processingError'));
    setStep('confirm');
    setLoading(false);
  }
};

  const startPolling = (predictionId: string) => {
    let pollCount = 0;
    const maxPolls = 60;

    const pollInterval = setInterval(async () => {
      pollCount++;

      if (pollCount > maxPolls) {
        clearInterval(pollInterval);
        setError(t('processingTimeout'));
        setStep('confirm');
        setLoading(false);
        return;
      }

      try {
        const statusResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tryon-status/${predictionId}`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            }
          }
        );

        if (!statusResponse.ok) {
          console.error('❌ Status check failed:', statusResponse.status);

          try {
            const errorData = await statusResponse.json();
            console.error('Error details:', errorData);

            if (errorData.status === 'error' || errorData.status === 'failed') {
              clearInterval(pollInterval);
              setError(errorData.error || t('processingFailed'));
              setStep('confirm');
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Failed to parse error response:', e);
          }

          if (statusResponse.status === 404) {
            console.log('⚠️ Prediction not found, continuing to poll...');
            return;
          }

          if (statusResponse.status >= 500) {
            clearInterval(pollInterval);
            setError(t('serverError'));
            setStep('confirm');
            setLoading(false);
            return;
          }

          return;
        }

        const statusData = await statusResponse.json();
        console.log('📊 Status data:', statusData);

        if (statusData.status === 'completed' && statusData.output) {
          const imageUrl = Array.isArray(statusData.output) ? statusData.output[0] : statusData.output;
          if (imageUrl) {
            clearInterval(pollInterval);
            console.log('✅ Setting result image:', imageUrl);
            setResult(imageUrl);

          console.log('📏 Tamanho já foi calculado com MediaPipe no handleSubmit');
          console.log('   - recommendedSize:', recommendedSize);
          console.log('   - calculatedSize:', calculatedSize);

            console.log('🎯 Setting step to result, loading to false');
            setStep('result');
            setLoading(false);
          }
        } else if (statusData.status === 'failed' || statusData.status === 'error') {
          clearInterval(pollInterval);
          const errorMsg = statusData.error || t('checkImageClear');
          setError(errorMsg);
          setStep('confirm');
          setLoading(false);
        } else if (statusData.status === 'not_found') {
          clearInterval(pollInterval);
          setError(t('sessionExpired'));
          setStep('confirm');
          setLoading(false);
        } else {
          const messages = [
            t('sendingImages'),
            t('scanningBody'),
            t('finalizingResult')
          ];

          const messageIndex = Math.min(pollCount - 1, messages.length - 1);
          setProcessingMessage(messages[messageIndex]);
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
        clearInterval(pollInterval);
        setError(t('statusCheckError'));
        setStep('confirm');
        setLoading(false);
      }
    }, 3000); // Poll every 3 seconds
    
    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (loading) {
        setError(t('timeoutExceeded'));
        setStep('confirm');
        setLoading(false);
      }
    }, 300000); // 5 minutes
  };

  const resetWidget = () => {
    setStep('info');
    setModelImage(null);
    setImagePreview(null);
    setSizeData(null);
    setCalculatedSize(null);
    setResult(null);
    setError('');
    setPredictionId(null);
    setCurrentImageIndex(0);
    setChatMessages([]);
    setInteractionCount(0);
  };

  const callGPTAssistant = async (intention: string = 'validate', complementaryProduct?: any, customMessage?: string) => {
    if (interactionCount >= 5) {
      const limitMessages = {
        pt: 'Você atingiu o limite de interações por sessão.',
        es: 'Has alcanzado el límite de interacciones por sesión.',
        en: 'You have reached the interaction limit per session.'
      };

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: limitMessages[currentLanguage],
        timestamp: Date.now()
      }]);
      return;
    }

    if (!sizeData) return;

    setGptLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Usar medidas do modelo corporal final (calculadas com MediaPipe ou estimadas)
      // Se não houver, fazer fallback para estimativas básicas
      let chestValue, waistValue, hipValue;

      if (finalBodyMeasurements) {
        // Usar medidas do modelo corporal final calculado
        chestValue = Math.round(finalBodyMeasurements.chest);
        waistValue = Math.round(finalBodyMeasurements.waist);
        hipValue = Math.round(finalBodyMeasurements.hip);
        console.log('✅ Usando medidas do MODELO CORPORAL FINAL para GPT:', {
          peito: chestValue,
          cintura: waistValue,
          quadril: hipValue
        });
      } else {
        // Fallback: estimativas básicas
        chestValue = sizeData.gender === 'female'
          ? Math.round(80 + (sizeData.weight - 50) * 0.5 + (sizeData.bodyTypeIndex || 0) * 5)
          : Math.round(90 + (sizeData.weight - 60) * 0.6 + (sizeData.bodyTypeIndex || 0) * 6);

        waistValue = sizeData.gender === 'female'
          ? Math.round(60 + (sizeData.weight - 50) * 0.6 + (sizeData.bodyTypeIndex || 0) * 4)
          : Math.round(75 + (sizeData.weight - 60) * 0.7 + (sizeData.bodyTypeIndex || 0) * 5);

        hipValue = sizeData.gender === 'female'
          ? Math.round(85 + (sizeData.weight - 50) * 0.6 + (sizeData.bodyTypeIndex || 0) * 5)
          : Math.round(90 + (sizeData.weight - 60) * 0.6 + (sizeData.bodyTypeIndex || 0) * 5);

        console.log('⚠️ Usando medidas ESTIMADAS (fallback) para GPT:', {
          peito: chestValue,
          cintura: waistValue,
          quadril: hipValue
        });
      }

      const payload = {
        altura_cm: sizeData.height,
        peso_kg: sizeData.weight,
        peito_cm: chestValue,
        cintura_cm: waistValue,
        quadril_cm: hipValue,
        tipo_corpo: sizeData.bodyType || 'regular',
        ajuste_preferido: sizeData.fit || 'regular',
        genero: sizeData.gender || 'unisex',
        elasticidade: localCollectionElasticity || 'light_flex',
        categoria: localCollectionType || 'upper',
        tamanho_calculado_algoritmo: calculatedSize || recommendedSize || 'M',
        intencao_usuario: intention === 'custom' ? 'custom_message' : intention === 'complementary' ? 'sugerir_combinacoes' : 'induzir_adicionar_carrinho',
        custom_message: customMessage,
        session_id: sessionId,
        interaction_count: interactionCount,
        shop_name: localStoreName,
        language: currentLanguage,
        complementary_product: complementaryProduct,
      };

      console.log('📤 Enviando payload para validate-size:', payload);

      const response = await fetch(`${supabaseUrl}/functions/v1/validate-size`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta:', response.status, errorText);
        throw new Error('Erro ao chamar assistente');
      }

      const result = await response.json();
      console.log('📥 Resposta recebida:', result);

      if (result.success && result.data) {
        const { tamanho_final, explicacao, should_end_conversation } = result.data;

        // Se a conversa deve ser encerrada (conteúdo inadequado), mostrar mensagem e bloquear
        if (should_end_conversation) {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: explicacao,
            timestamp: Date.now()
          }]);
          setInteractionCount(5); // Bloquear novas interações
          return;
        }

        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: explicacao,
          timestamp: Date.now()
        }]);

        setInteractionCount(result.interaction_count || interactionCount + 1);
      } else {
        throw new Error(result.message || 'Erro ao processar resposta');
      }
    } catch (error) {
      console.error('Erro ao chamar GPT:', error);
      const errorMessages = {
        pt: 'Não foi possível validar o tamanho no momento. Por favor, tente novamente.',
        es: 'No fue posible validar la talla en este momento. Por favor, inténtalo de nuevo.',
        en: 'Could not validate size at this time. Please try again.'
      };

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessages[currentLanguage],
        timestamp: Date.now()
      }]);
    } finally {
      setGptLoading(false);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % availableImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + availableImages.length) % availableImages.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
      nextImage();
    }
    if (touchEndX.current - touchStartX.current > 50) {
      prevImage();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const goBack = () => {
    switch (step) {
      case 'calculator':
        setStep('info');
        break;
      case 'photo':
        setStep('calculator');
        break;
      case 'confirm':
        setStep('photo');
        break;
      default:
        break;
    }
  };

  // Verificar se o produto foi carregado
  if (!product) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center rounded-2xl">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mx-auto mb-4"
            style={{
              borderColor: primaryColor,
              borderTopColor: 'transparent'
            }}
          />
          <p className="text-gray-700 text-base">{t('loadingProduct')}</p>
        </div>
      </div>
    );
  }

  const displayImage = step === 'photo' ? selectedProductImage : product.garment_image;

  console.log('🎨 Estilos aplicados no widget:', { fontFamily });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap');

        * {
          font-family: '${fontFamily}', sans-serif !important;
        }

        .bg-primary { background-color: ${localPrimaryColor} !important; }
        .text-primary { color: ${localPrimaryColor} !important; }
        .border-primary { border-color: ${localPrimaryColor} !important; }
        .hover\\:bg-primary-dark:hover { background-color: ${hoverColor} !important; }
        .hover\\:border-primary:hover { border-color: ${localPrimaryColor} !important; }
        .focus\\:ring-primary:focus { --tw-ring-color: ${localPrimaryColor} !important; }
      `}</style>

      {/* Full Screen Chat - Outside widget container */}
      {step === 'result' && result && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: localPrimaryColor }}>
            <button
              onClick={resetWidget}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div className="flex-1 flex justify-center">
              {localStoreLogo && (
                <img src={localStoreLogo} alt={localStoreName} className="h-12 w-auto object-contain" />
              )}
            </div>

            <div className="w-10"></div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Initial Try-On Result Image - Left aligned like assistant message */}
            <div className="flex justify-start">
              <div className="max-w-[65%] md:max-w-[30%]">
                <img
                  src={result}
                  alt="Try-on result"
                  className="w-full rounded-2xl shadow-md"
                />
              </div>
            </div>

            {/* Chat Messages */}
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.role === 'assistant'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-white'
                  }`}
                  style={message.role === 'user' ? { backgroundColor: localPrimaryColor } : {}}
                >
                  <p className="text-sm md:text-base whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {gptLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl p-4 bg-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: localPrimaryColor }}></div>
                    <div className="w-2 h-2 rounded-full animate-pulse delay-75" style={{ backgroundColor: localPrimaryColor }}></div>
                    <div className="w-2 h-2 rounded-full animate-pulse delay-150" style={{ backgroundColor: localPrimaryColor }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          {interactionCount < 5 && chatMessages.length > 0 && !gptLoading && (
            <div className="p-4 border-t bg-gray-50">
              {/* Frase acima do campo - só mostra se é a primeira mensagem do assistente */}
              {chatMessages.length === 1 && chatMessages[0].role === 'assistant' && (
                <p className="text-sm text-gray-600 text-center mb-3">
                  {currentLanguage === 'pt' && 'Tem alguma dúvida? Pergunte abaixo'}
                  {currentLanguage === 'es' && '¿Tienes alguna duda? Pregunta abajo'}
                  {currentLanguage === 'en' && 'Have any questions? Ask below'}
                </p>
              )}

              {/* Text Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    currentLanguage === 'pt' ? 'Digite sua mensagem...' :
                    currentLanguage === 'es' ? 'Escribe tu mensaje...' :
                    'Type your message...'
                  }
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 transition-all"
                  style={{ focusRing: localPrimaryColor }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const message = e.currentTarget.value.trim();
                      setChatMessages(prev => [...prev, {
                        role: 'user',
                        content: message,
                        timestamp: Date.now()
                      }]);
                      callGPTAssistant('custom', undefined, message);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <button
                  className="px-5 py-3 rounded-xl text-white font-medium transition-all hover:shadow-md"
                  style={{ backgroundColor: localPrimaryColor }}
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    if (input && input.value.trim()) {
                      const message = input.value.trim();
                      setChatMessages(prev => [...prev, {
                        role: 'user',
                        content: message,
                        timestamp: Date.now()
                      }]);
                      callGPTAssistant('custom', undefined, message);
                      input.value = '';
                    }
                  }}
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`w-full h-full overflow-hidden flex flex-col bg-white rounded-2xl transition-all duration-400 ease-in-out transform ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
      {/* Header - Padronizado em todas steps */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: localPrimaryColor }}>
        {/* Botão voltar (esquerda) */}
        {step !== 'info' && step !== 'processing' && step !== 'result' ? (
          <button
            onClick={goBack}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-6"></div>
        )}

        {/* Logo centralizado */}
        <div className="flex-1 flex justify-center">
          {localStoreLogo && localStoreLogo.trim() !== '' && (
            <img
              src={localStoreLogo}
              alt={localStoreName || 'Logo da loja'}
              className="h-12 w-auto object-contain"
              onLoad={() => console.log('✅ Logo carregado com sucesso:', localStoreLogo)}
              onError={(e) => {
                console.error('❌ Erro ao carregar logo:', localStoreLogo);
                console.error('❌ Erro detalhado:', e);
              }}
            />
          )}
        </div>

        {/* Espaço vazio (direita) para balancear o layout */}
        <div className="w-6"></div>
      </div>

      {/* Layout com duas colunas no desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Coluna da imagem (esquerda no desktop) - Apenas na step info */}
        {step === 'info' && (
          <div className="md:w-1/2 bg-gray-50 p-4 md:p-8 flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={displayImage}
                alt={product.name}
                className="max-w-full max-h-full object-contain rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Coluna do conteúdo (direita no desktop) */}
        <div className={`flex-1 p-2 md:p-4 overflow-y-auto transition-all duration-300 ease-in-out ${step !== 'info' ? 'md:w-full' : ''}`}>
          {error && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-200 text-base">{error}</p>
            </div>
          )}

        {/* Step 1: Info */}
        {step === 'info' && (
          <div className="space-y-4 md:space-y-4 animate-fade-in md:flex md:flex-col md:justify-center md:h-full">
            <div className="text-center">
              <h3 className="text-2xl md:text-3xl font-semibold mb-2" style={{ color: primaryColor }}>
                {t('visualExperience')}
              </h3>
              <p className="text-gray-700 text-lg md:text-xl">
                {t('visualExperienceDesc')}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-4">
              <div className="text-center">
                <h4 className="font-medium text-blue-800 mb-2 text-base md:text-lg">{t('howItWorks')}</h4>
                <p className="text-base md:text-lg text-blue-700">
                  {t('howItWorksDesc')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setStep('calculator')}
              className="w-full bg-primary text-white py-3.5 md:py-4 rounded-lg hover:bg-primary-dark transition-all duration-300 ease-in-out flex items-center justify-center gap-2 font-medium text-lg md:text-xl"
                          >
              {t('startNow')}
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <p className="text-sm md:text-base text-center text-gray-500">
              {t('privacyNote')}
            </p>
          </div>
        )}

        {/* Step 2: Size Calculator */}
        {step === 'calculator' && (
          <div className="animate-fade-in">
          <SizeCalculator
            key={`calculator-${step}`}
            onComplete={(data) => {
              console.log('🎯 SizeCalculator onComplete - Dados recebidos:', data);
              console.log('   - height:', data.height);
              console.log('   - weight:', data.weight);
              console.log('   - bodyTypeIndex:', data.bodyTypeIndex);
              console.log('   - bodyType factor:', data.bodyType);
              console.log('   - fitIndex:', data.fitIndex);
              console.log('   - fit factor:', data.fit);
              console.log('   - gender:', data.gender);

              // CRITICAL: Garantir que não há medidas antigas do MediaPipe
              const cleanData = {
                gender: data.gender,
                height: data.height,
                weight: data.weight,
                bodyType: data.bodyType,
                fit: data.fit,
                bodyTypeIndex: data.bodyTypeIndex,
                fitIndex: data.fitIndex
                // NÃO incluir chest, waist, hip, shoulder
              };

              console.log('✅ setSizeData com dados LIMPOS (sem MediaPipe):', cleanData);
              setSizeData(cleanData);
              setStep('photo');
            }}
            onBack={() => setStep('info')}
            primaryColor={primaryColor}
            defaultGender={defaultGender as 'male' | 'female' | 'unisex'}
          />
          </div>
        )}

        {/* Step 3: Photo Upload */}
        {step === 'photo' && (
          <div className="space-y-4 animate-fade-in">
            {/* Mobile Layout */}
            <div className="md:hidden space-y-4">
              {/* Sempre mostrar imagem do produto no mobile */}
              <div className="mb-4">
                <div className="text-center mb-3">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {t('productImage')}
                  </h4>
                  {availableImages.length > 1 && (
                    <p className="text-base text-gray-600">
                      {t('chooseImageNote')}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <div
                    className="aspect-[2/3] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <img
                      src={selectedProductImage}
                      alt="Produto"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {availableImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>

                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>

                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {availableImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === currentImageIndex
                                ? 'bg-primary w-6'
                                : 'bg-white/70 hover:bg-white'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="text-center mb-3">
                <h3 className="text-2xl font-semibold text-primary mb-2">
                  {t('yourPhoto')}
                </h3>
                <p className="text-gray-700 text-base">
                  {t('betterResults')}
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-4 mb-3 shadow-md">
                <div>
                  <h4 className="font-bold text-blue-900 mb-2 text-base flex items-center gap-2">
                    {t('photoInstructions')}
                    <span className="text-xs bg-blue-800 text-white px-2 py-0.5 rounded-full font-semibold">
                      IMPORTANTE
                    </span>
                  </h4>
                  <ul className="text-base text-blue-900 space-y-1.5 mb-3">
                    <li>• <strong>{t('fullBody')}</strong> - {t('fullBodyDesc')}</li>
                    <li>• <strong>{t('frontFacing')}</strong> - {t('frontFacingDesc')}</li>
                    <li>• <strong>{t('noObstacles')}</strong> - {t('noObstaclesDesc')}</li>
                    <li>• <strong>{t('goodLighting')}</strong> - {t('goodLightingDesc')}</li>
                    <li>• <strong>{t('neutralBackground')}</strong> - {t('neutralBackgroundDesc')}</li>
                  </ul>
                  <div className="bg-blue-100 border-l-4 border-blue-700 p-2 rounded mt-2">
                    <p className="text-sm text-blue-900 font-semibold">
                      Fotos que não seguem estas instruções podem gerar erros ou resultados inadequados!
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-all duration-300 ease-in-out"
              >
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 mb-2 text-lg">{t('clickToUpload')}</p>
                <p className="text-base text-gray-500">
                  {t('imageFormats')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex md:gap-6">
              {/* Left Side: Product Carousel */}
              <div className="md:w-1/2">
                <div className="text-center mb-3">
                  <h4 className="text-xl font-semibold text-gray-900">
                    {t('productImage')}
                  </h4>
                  {availableImages.length > 1 && (
                    <p className="text-base text-gray-600">
                      (escolha uma imagem frontal do produto)
                    </p>
                  )}
                </div>

                {availableImages.length > 1 ? (
                  <div className="relative">
                    <div className="aspect-[2/3] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={selectedProductImage}
                        alt="Produto"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {availableImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentImageIndex
                              ? 'bg-primary w-6'
                              : 'bg-white/70 hover:bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[2/3] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={selectedProductImage}
                      alt="Produto"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Right Side: Photo Upload */}
              <div className="md:w-1/2 flex flex-col justify-center">
                <div className="text-center mb-3">
                  <h3 className="text-2xl font-semibold text-primary mb-1">
                    {t('yourPhoto')}
                  </h3>
                  <p className="text-gray-700 text-base">
                    {t('betterResults')}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-3 mb-3 shadow-md">
                  <div>
                    <h4 className="font-bold text-blue-900 mb-1.5 text-sm flex items-center gap-2">
                      {t('photoInstructions')}
                      <span className="text-xs bg-blue-800 text-white px-2 py-0.5 rounded-full font-semibold">
                        IMPORTANTE
                      </span>
                    </h4>
                    <ul className="text-sm text-blue-900 space-y-0.5 mb-2">
                      <li>• <strong>{t('fullBody')}</strong> - {t('fullBodyDesc')}</li>
                      <li>• <strong>{t('frontFacing')}</strong> - {t('frontFacingDesc')}</li>
                      <li>• <strong>{t('noObstacles')}</strong> - {t('noObstaclesDesc')}</li>
                      <li>• <strong>{t('goodLighting')}</strong> - {t('goodLightingDesc')}</li>
                      <li>• <strong>{t('neutralBackground')}</strong> - {t('neutralBackgroundDesc')}</li>
                    </ul>
                    <div className="bg-blue-100 border-l-4 border-blue-700 p-2 rounded mt-2">
                      <p className="text-sm text-blue-900 font-semibold">
                         Fotos que não seguem estas instruções podem gerar erros ou resultados inadequados!
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-all duration-300 ease-in-out"
                >
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 mb-1 text-lg">{t('clickToUpload')}</p>
                  <p className="text-base text-gray-500">
                    {t('imageFormats')}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-3 md:mb-4">
              <h3 className="text-2xl md:text-3xl font-semibold mb-1 md:mb-2" style={{ color: primaryColor }}>
                {t('confirmData')}
              </h3>
              <p className="text-gray-700 text-base md:text-lg">
                {t('verifyBeforeProcess')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              {/* Produto */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5">
                <h4 className="font-medium mb-3 text-center text-base md:text-lg" style={{ color: primaryColor }}>
                  {t('product')}
                </h4>
                <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-white">
                  {selectedProductImage ? (
                    <img
                      src={selectedProductImage}
                      alt="Produto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Sem imagem
                    </div>
                  )}
                </div>
              </div>

              {/* Foto do Usuário */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5">
                <h4 className="font-medium mb-3 text-center text-base md:text-lg" style={{ color: primaryColor }}>
                  {t('yourPhotoLabel')}
                </h4>
                <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-white">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Sua foto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Sem imagem
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('photo');
                  setImagePreview('');
                  setModelImage(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 border border-gray-300 py-3 md:py-3.5 text-lg md:text-xl rounded-lg hover:bg-gray-200 transition-all duration-300 ease-in-out font-medium"
              >
                {t('change')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 text-white py-3 md:py-3.5 text-lg md:text-xl rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                <Sparkles className="w-5 h-5" />
                {t('process')}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Processing */}
        {step === 'processing' && (
          <div className="text-center py-10 md:py-12 animate-fade-in">
            <div
              className="animate-spin rounded-full h-16 w-16 md:h-20 md:w-20 border-4 border-t-transparent mx-auto mb-6"
              style={{
                borderColor: primaryColor,
                borderTopColor: 'transparent'
              }}
            />
            <h3 className="text-2xl md:text-3xl font-semibold text-primary mb-3">
              {processingMessage}
            </h3>
            <p className="text-gray-700 mb-4 text-base md:text-lg">
              {t('creatingTryOn')}
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
              <p className="text-yellow-800 text-base md:text-lg">
                {t('estimatedTime')}
              </p>
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
    </>
  );
}