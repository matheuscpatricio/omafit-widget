import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Sparkles, ArrowRight, ArrowLeft, Mail, AlertCircle, Info, ShoppingCart } from 'lucide-react';
import { SizeCalculator, SizeCalculatorData } from './SizeCalculator';
import { calculateIdealSize } from '../utils/sizeCalculation';
import { supabase } from '../lib/supabase';
import { widgetTranslations, detectWidgetLanguage, type WidgetTranslationKey } from '../locales/widget-translations';

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

export function TryOnWidget({ garmentImage, productId = 'unknown', productName = 'Produto', storeName = 'Omafit', storeLogo, primaryColor = '#810707', fontFamily = 'Outfit', publicId, productImages = [], shopDomain = '', collectionId = '', collectionHandle = '', gender = 'unisex', defaultGender = 'unisex', collectionType, collectionElasticity, recommendedProductName, recommendedProductUrl }: TryOnWidgetProps) {

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
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Estados locais para configurações que podem ser atualizadas
  const [localStoreLogo, setLocalStoreLogo] = useState<string>(storeLogo || '');
  const [localPrimaryColor, setLocalPrimaryColor] = useState<string>(primaryColor);
  const [localStoreName, setLocalStoreName] = useState<string>(storeName);
  const [localCollectionType, setLocalCollectionType] = useState<'upper' | 'lower' | 'full' | undefined>(collectionType);
  const [localCollectionElasticity, setLocalCollectionElasticity] = useState<'structured' | 'light_flex' | 'flexible' | 'high_elasticity' | undefined>(collectionElasticity);

  // Calcular cor hover baseada na cor primária local
  const hoverColor = darkenColor(localPrimaryColor);

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
    if (storeName) {
      setLocalStoreName(storeName);
    }
  }, [storeName]);

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
          console.log('✅ Atualizando storeName:', event.data.storeName);
          setLocalStoreName(event.data.storeName);
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
    const selectedBodyType = bodyTypeProfiles[bodyTypeNames[bodyTypeIndex]] || bodyTypeProfiles.mannequin1;

    // ═══════════════════════════════════════════════════════════════════
    // 🔹 BLOCO 2 — CONSTRUÇÃO DO MODELO CORPORAL
    // ═══════════════════════════════════════════════════════════════════
    // ⚠️ IMPORTANTE: O corpo é modelado UMA VEZ, SEM aplicar fit.
    // O fit será aplicado apenas na DECISÃO final (BLOCO 4).
    // ═══════════════════════════════════════════════════════════════════

    console.log('\n━━━━ 🔹 BLOCO 2: CONSTRUÇÃO DO MODELO CORPORAL ━━━━');
    console.log('🎭 Perfil do manequim selecionado:', selectedBodyType.description);

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
    const fitMultiplier = fitFactors[fitIndex] || 1.00;
    const fitNames = ['Justa', 'Na medida', 'Solta'];

    console.log('👔 Preferência de fit:', fitNames[fitIndex], `(${fitMultiplier})`);
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

          // Calcular tamanho recomendado
          const recommendedResult = calculateRecommendedSize(sizeData, sizeChartData);
          console.log('📏 Resultado do cálculo inicial:', recommendedResult);
          if (recommendedResult) {
            setRecommendedSize(recommendedResult.size);
            console.log('📏 Tamanho recomendado:', recommendedResult.size);
          }

          // Enviar mensagem para o parent window
          if (recommended) {
            console.log('📤 Enviando mensagem para parent window com tamanho recomendado');
            window.parent.postMessage({
              type: 'sizeCalculatorComplete',
              measurements: {
                height: sizeData.height,
                bodyType: 0.9 + (sizeData.bodyTypeIndex * 0.1),
                fit: 0.95 + (sizeData.fitIndex * 0.05),
                gender: sizeData.gender
              },
              recommendedSize: recommended
            }, '*');
          }
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
      setImagePreview(reader.result as string);
      setError('');
      setStep('confirm'); // 👈 ADICIONE ESTA LINHA
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

    const payload = {
      shop_domain: shopDomain,
      model_image: modelImageDataUrl,
      garment_image: selectedProductImage || product.garment_image,
      product_name: product.name,
      product_id: product.id,
      public_id: publicId,
      user_measurements: sizeData ? {
        gender: sizeData.gender,
        height: sizeData.height,
        weight: sizeData.weight,
        body_type_index: sizeData.bodyTypeIndex,
        fit_preference_index: sizeData.fitIndex,
        recommended_size: recommendedSize || calculatedSize
      } : null
    };

    console.log('📤 Enviando payload:', {
      ...payload,
      model_image: 'base64...',
      garment_image: payload.garment_image.substring(0, 50) + '...'
    });
    console.log('🔑 publicId:', publicId);
    console.log('📦 product:', product);

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

    if (result.success && result.fal_request_id) {
      setPredictionId(result.fal_request_id);
      setProcessingMessage(t('generating'));

      // Se temos medidas do MediaPipe, calcular tamanho recomendado com elas
      if (result.body_measurements && sizeChart.length > 0) {
        console.log('📏 Recalculando tamanho com medidas REAIS do MediaPipe:', result.body_measurements);

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
        console.log('✅ Resultado do cálculo (MediaPipe):', sizeResult);
        if (sizeResult) {
          setRecommendedSize(sizeResult.size);
          setCalculatedSize(sizeResult.size);
          console.log('✅ Novo tamanho recomendado (MediaPipe):', sizeResult.size);
        } else {
          console.log('❌ calculateRecommendedSize retornou null');
        }
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

          console.log('📏 ===== CALCULANDO TAMANHO IDEAL =====');
          if (sizeData && sizeChart.length > 0) {
            console.log('✅ Dados disponíveis para cálculo:');
            console.log('   - Height:', sizeData.height);
            console.log('   - Weight:', sizeData.weight);
            console.log('   - Body Type:', sizeData.bodyType);
            console.log('   - Fit:', sizeData.fit);
            console.log('   - Gender:', sizeData.gender);
            console.log('   - Size Chart disponível:', sizeChart.length, 'tamanhos');
            console.log('   - Tamanhos:', sizeChart.map((s: any) => s.size || s.size_name).join(', '));
            console.log('   - Measurement Weights:', measurementWeights);

            const sizeResult = calculateIdealSize(
              sizeData.height,
              sizeData.weight,
              sizeData.bodyType,
              sizeData.fit,
              sizeChart,
              undefined,
              measurementWeights
            );
            console.log('📏 Resultado do calculateIdealSize:', sizeResult);
            if (sizeResult) {
              setCalculatedSize(sizeResult.size);
              console.log('✅ Tamanho calculado e definido:', sizeResult.size);
            } else {
              console.log('❌ calculateIdealSize retornou null/undefined');
            }
          } else {
            console.log('❌ Cálculo NÃO pode ser realizado:');
            console.log('   - sizeData existe?', !!sizeData);
            if (sizeData) {
              console.log('     • height:', sizeData.height);
              console.log('     • weight:', sizeData.weight);
              console.log('     • gender:', sizeData.gender);
            }
            console.log('   - sizeChart.length:', sizeChart?.length || 0);
            if (sizeChart?.length === 0) {
              console.log('   ⚠️ SIZE CHART VAZIO - Tabela não foi carregada corretamente!');
            }
          }
          console.log('📏 ===== FIM DO CÁLCULO DE TAMANHO =====');

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: primaryColor }}></div>
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
      <div className={`w-full h-full overflow-hidden flex flex-col bg-white rounded-2xl transition-all duration-400 ease-in-out transform ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-3 rounded-t-2xl flex-shrink-0">
        <div className="flex items-center justify-center relative">
          {console.log('🖼️ TryOnWidget - localStoreLogo:', localStoreLogo, 'tipo:', typeof localStoreLogo, 'length:', localStoreLogo?.length)}
          {localStoreLogo && localStoreLogo.trim() !== '' ? (
            <>
              {console.log('✅ Renderizando logo:', localStoreLogo)}
            <img
              src={localStoreLogo}
              alt={localStoreName || 'Logo da loja'}
              className="h-12 sm:h-16 w-auto object-contain opacity-0 animate-fade-in"
              style={{ maxWidth: '300px', animationDelay: '0.1s', animationFillMode: 'forwards' }}
              onLoad={() => console.log('✅ Logo carregado com sucesso:', localStoreLogo)}
              onError={(e) => {
                console.error('❌ Erro ao carregar logo:', localStoreLogo);
                console.error('❌ Erro detalhado:', e);
              }}
            />
            </>
          ) : null}
          {step !== 'info' && step !== 'processing' && step !== 'result' && (
            <button
              onClick={goBack}
              className="absolute left-0 text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-200 transition-all duration-300 ease-in-out"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>
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
        <div className={`flex-1 p-2 md:px-8 md:py-4 overflow-y-auto transition-all duration-300 ease-in-out ${step !== 'info' ? 'md:w-full' : ''}`}>
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
            onComplete={(data) => {
              setSizeData(data);
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
        {step === 'confirm' && imagePreview && (
          <div className="space-y-4 max-w-5xl mx-auto animate-fade-in">
            <div className="text-center mb-3 md:mb-4">
              <h3 className="text-2xl md:text-3xl font-semibold text-primary mb-1 md:mb-2">
                {t('confirmData')}
              </h3>
              <p className="text-gray-700 text-base md:text-lg">
                {t('verifyBeforeProcess')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5">
                <h4 className="font-medium text-primary mb-3 text-center text-base md:text-lg">{t('product')}</h4>
                <div className="w-full aspect-[2/3] rounded-lg overflow-hidden">
                  <img
                    src={selectedProductImage}
                    alt="Produto"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5">
                <h4 className="font-medium text-primary mb-3 text-center text-base md:text-lg">{t('yourPhotoLabel')}</h4>
                <div className="w-full aspect-[2/3] rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Sua foto"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('photo')}
                className="flex-1 bg-gray-100 text-gray-700 border border-gray-300 py-3 md:py-3.5 text-lg md:text-xl rounded-lg hover:bg-gray-200 transition-all duration-300 ease-in-out"
                              >
                {t('change')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-primary text-white py-3 md:py-3.5 text-lg md:text-xl rounded-lg hover:bg-primary-dark transition-all duration-300 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50"
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
            <div className="animate-spin rounded-full h-16 w-16 md:h-20 md:w-20 border-b-2 border-primary mx-auto mb-6"></div>
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

        {/* Step 6: Result */}
        {step === 'result' && result && (
          <div className="space-y-4 animate-fade-in">
            {/* Mobile Layout */}
            <div className="md:hidden space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <h3 className="text-2xl font-semibold text-primary">
                    {t('yourPreview')}
                  </h3>
                </div>
                <div className="w-full aspect-[3/4] rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                  <img
                    src={result}
                    alt="Resultado do try-on"
                    className="w-full h-full object-cover"
                  />
                </div>

                {(calculatedSize || recommendedSize) && (
                  <div className="text-center mb-4">
                    <p className="text-lg text-gray-700 mb-2">
                      {t('recommendedSize')}
                    </p>
                    <p className="text-6xl font-bold" style={{ color: primaryColor }}>
                      {calculatedSize || recommendedSize}
                    </p>
                    {confidenceLevel && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          confidenceLevel === 'high' ? 'bg-green-500' :
                          confidenceLevel === 'medium' ? 'bg-yellow-500' :
                          'bg-orange-500'
                        }`} />
                        <p className={`text-sm font-medium ${
                          confidenceLevel === 'high' ? 'text-green-700' :
                          confidenceLevel === 'medium' ? 'text-yellow-700' :
                          'text-orange-700'
                        }`}>
                          {confidenceLevel === 'high' && 'Alta compatibilidade com seu corpo'}
                          {confidenceLevel === 'medium' && 'Boa compatibilidade com seu corpo'}
                          {confidenceLevel === 'low' && 'Compatibilidade aceitável'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-base text-gray-700 mb-4">
                  {t('congratsMessage')}
                </p>
              </div>

              {recommendedProductName && recommendedProductUrl && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 text-center">
                    Uma ótima escolha para acompanhar seu pedido seria{' '}
                    <strong>{recommendedProductName}</strong>,{' '}
                    <a
                      href={recommendedProductUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline hover:opacity-70 transition-opacity"
                      style={{ color: primaryColor }}
                    >
                      clique aqui
                    </a>{' '}
                    e confira.
                  </p>
                </div>
              )}

              <button
                onClick={resetWidget}
                className="w-full bg-gray-100 text-gray-700 border border-gray-300 py-3 text-lg rounded-lg hover:bg-gray-200 transition-all duration-300 ease-in-out"
              >
                {t('newTryOn')}
              </button>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex md:gap-8">
              {/* Left Side: Image */}
              <div className="md:w-1/2">
                <div className="mb-3">
                  <h3 className="text-2xl font-semibold text-primary">
                    {t('yourPreview')}
                  </h3>
                </div>
                <div className="w-full aspect-[3/4] rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={result}
                    alt="Resultado do try-on"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Right Side: Info and Actions */}
              <div className="md:w-1/2 flex flex-col justify-center space-y-4">
                {(calculatedSize || recommendedSize) && (
                  <div className="text-center">
                    <p className="text-xl text-gray-700 mb-2">
                      {t('recommendedSize')}
                    </p>
                    <p className="text-7xl font-bold" style={{ color: primaryColor }}>
                      {calculatedSize || recommendedSize}
                    </p>
                    {confidenceLevel && (
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          confidenceLevel === 'high' ? 'bg-green-500' :
                          confidenceLevel === 'medium' ? 'bg-yellow-500' :
                          'bg-orange-500'
                        }`} />
                        <p className={`text-base font-medium ${
                          confidenceLevel === 'high' ? 'text-green-700' :
                          confidenceLevel === 'medium' ? 'text-yellow-700' :
                          'text-orange-700'
                        }`}>
                          {confidenceLevel === 'high' && 'Alta compatibilidade com seu corpo'}
                          {confidenceLevel === 'medium' && 'Boa compatibilidade com seu corpo'}
                          {confidenceLevel === 'low' && 'Compatibilidade aceitável'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-lg text-gray-700">
                  {t('congratsMessage')}
                </p>

                {recommendedProductName && recommendedProductUrl && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-base text-gray-700 text-center">
                      Uma ótima escolha para acompanhar seu pedido seria{' '}
                      <strong>{recommendedProductName}</strong>,{' '}
                      <a
                        href={recommendedProductUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline hover:opacity-70 transition-opacity"
                        style={{ color: primaryColor }}
                      >
                        clique aqui
                      </a>{' '}
                      e confira.
                    </p>
                  </div>
                )}

                <button
                  onClick={resetWidget}
                  className="w-full bg-gray-100 text-gray-700 border border-gray-300 py-3 text-lg rounded-lg hover:bg-gray-200 transition-all duration-300 ease-in-out"
                >
                  {t('newTryOn')}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
    </>
  );
}