import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Sparkles, ArrowRight, ArrowLeft, Mail, AlertCircle, Info, ShoppingCart } from 'lucide-react';
import { SizeCalculator, SizeCalculatorData } from './SizeCalculator';
import { calculateIdealSize } from '../utils/sizeCalculation';
import { supabase } from '../lib/supabase';

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
}

interface SizeChartEntry {
  size: string;
  peito?: string;
  chest?: string;
  cintura?: string;
  waist?: string;
  quadril?: string;
  hip?: string;
}

export function TryOnWidget({ garmentImage, productId = 'unknown', productName = 'Produto', storeName = 'Omafit', storeLogo, primaryColor = '#810707', fontFamily = 'Outfit', publicId, productImages = [], shopDomain = '' }: TryOnWidgetProps) {

  console.log('🎯 TryOnWidget montado com publicId:', publicId);

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
  const [sizeChart, setSizeChart] = useState<SizeChartEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'info' | 'calculator' | 'photo' | 'confirm' | 'processing' | 'result'>('info');
  const [selectedProductImage, setSelectedProductImage] = useState<string>(garmentImage);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState('Gerando sua prévia...');
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Estados locais para configurações que podem ser atualizadas
  const [localStoreLogo, setLocalStoreLogo] = useState<string>(storeLogo || '');
  const [localPrimaryColor, setLocalPrimaryColor] = useState<string>(primaryColor);
  const [localStoreName, setLocalStoreName] = useState<string>(storeName);

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

  // Calcular tamanho recomendado baseado nas medidas do usuário
  const calculateRecommendedSize = (measurements: SizeCalculatorData, chart: SizeChartEntry[]): string | null => {
    if (!chart || chart.length === 0) {
      console.warn('⚠️ Nenhuma tabela de medidas disponível');
      return null;
    }

    const { height, bodyTypeIndex, fitIndex } = measurements;

    // Normalizar índices para multiplicadores (0.9, 1.0, 1.1)
    const bodyType = 0.9 + (bodyTypeIndex * 0.1);
    const fit = 0.95 + (fitIndex * 0.05);

    // Calcular medidas base do usuário
    const baseChest = height * 0.45 * bodyType * fit;
    const baseWaist = height * 0.35 * bodyType * fit;
    const baseHip = height * 0.50 * bodyType * fit;

    console.log('📏 Medidas calculadas:', { baseChest, baseWaist, baseHip, bodyType, fit });

    let bestSize = null;
    let minDistance = Infinity;

    // Comparar com cada tamanho da tabela
    chart.forEach((sizeData) => {
      const chest = parseFloat(sizeData.peito || sizeData.chest || '0');
      const waist = parseFloat(sizeData.cintura || sizeData.waist || '0');
      const hip = parseFloat(sizeData.quadril || sizeData.hip || '0');

      // Calcular distância euclidiana
      const distance = Math.sqrt(
        Math.pow(baseChest - chest, 2) +
        Math.pow(baseWaist - waist, 2) +
        Math.pow(baseHip - hip, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        bestSize = sizeData.size;
      }
    });

    console.log('✅ Tamanho recomendado:', bestSize);
    return bestSize;
  };

  useEffect(() => {
    const loadSizeChart = async () => {
      if (!sizeData?.gender) {
        console.log('⚠️ Não há gender no sizeData:', sizeData);
        return;
      }

      if (!shopDomain) {
        console.log('⚠️ Não há shopDomain para buscar size chart');
        return;
      }

      console.log('📊 Carregando size chart para gender:', sizeData.gender, 'shopDomain:', shopDomain);

      try {
        // Buscar tabela de medidas via shopDomain
        const { data: charts, error } = await supabase
          .from('size_charts')
          .select('sizes')
          .eq('shop_domain', shopDomain)
          .eq('gender', sizeData.gender);

        if (error) {
          console.error('❌ Erro ao buscar size chart:', error);
          return;
        }

        let sizeChartData = null;

        if (charts && charts.length > 0 && charts[0].sizes) {
          sizeChartData = charts[0].sizes;
          console.log('✅ Size chart encontrado para', sizeData.gender);
        } else {
          // Fallback para unisex
          console.log('📊 Chart específico não encontrado, tentando unisex...');
          const { data: unisexCharts } = await supabase
            .from('size_charts')
            .select('sizes')
            .eq('shop_domain', shopDomain)
            .eq('gender', 'unisex');

          if (unisexCharts && unisexCharts.length > 0 && unisexCharts[0].sizes) {
            sizeChartData = unisexCharts[0].sizes;
            console.log('✅ Usando size chart unisex como fallback');
          }
        }

        if (sizeChartData) {
          setSizeChart(sizeChartData);
          console.log('✅ Size chart definido com', sizeChartData.length, 'tamanhos');

          // Calcular tamanho recomendado
          const recommended = calculateRecommendedSize(sizeData, sizeChartData);
          setRecommendedSize(recommended);

          // Enviar mensagem para o parent window
          if (recommended) {
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
          console.log('❌ Nenhum chart encontrado (nem específico nem unisex) para shopDomain:', shopDomain);
        }
      } catch (error) {
        console.error('❌ Error loading size chart:', error);
      }
    };

    loadSizeChart();
  }, [sizeData?.gender, shopDomain]);

const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem');
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
    setError('Por favor, selecione um produto e faça upload da sua foto');
    return;
  }

  setLoading(true);
  setStep('processing');
  setError('');
  setProcessingMessage('Enviando imagens...');

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
      throw new Error(errorData.error || 'Erro no processamento da imagem');
    }

    const result = await response.json();

    if (result.success && result.fal_request_id) {
      setPredictionId(result.fal_request_id);
      setProcessingMessage('Gerando sua prévia...');
      startPolling(result.fal_request_id);
    } else {
      throw new Error(result.error || 'Erro no processamento');
    }
  } catch (error: any) {
    console.error('Erro no try-on:', error);
    setError(error.message || 'Erro no processamento da imagem');
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
        setError('Tempo de processamento excedido. Por favor, tente novamente.');
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
              setError(errorData.error || 'Falha no processamento da imagem. Tente novamente.');
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
            setError('Erro no servidor. Por favor, tente novamente.');
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

          if (sizeData && sizeChart.length > 0) {
            console.log('📏 Calculando tamanho com dados:', { sizeData, sizeChartLength: sizeChart.length });
            const sizeResult = calculateIdealSize(
              sizeData.height,
              sizeData.weight,
              sizeData.bodyType,
              sizeData.fit,
              sizeChart
            );
            console.log('📏 Resultado do cálculo:', sizeResult);
            if (sizeResult) {
              setCalculatedSize(sizeResult.size);
              console.log('✅ Tamanho definido:', sizeResult.size);
            } else {
              console.log('❌ Nenhum resultado do cálculo');
            }
          } else {
            console.log('⚠️ Cálculo não realizado - sizeData:', sizeData, 'sizeChart.length:', sizeChart?.length);
          }

            console.log('🎯 Setting step to result, loading to false');
            setStep('result');
            setLoading(false);
          }
        } else if (statusData.status === 'failed' || statusData.status === 'error') {
          clearInterval(pollInterval);
          const errorMsg = statusData.error || 'Falha no processamento da imagem. Por favor, verifique se a imagem está clara e tente novamente.';
          setError(errorMsg);
          setStep('confirm');
          setLoading(false);
        } else if (statusData.status === 'not_found') {
          clearInterval(pollInterval);
          setError('Sessão expirada. Por favor, tente novamente.');
          setStep('confirm');
          setLoading(false);
        } else {
          const messages = [
            'Analisando sua foto...',
            'Scanneando seu corpo...',
            'Aplicando o produto...',
            'Refinando detalhes...',
            'Gerando sua prévia...'
          ];

          let messageIndex;
          if (pollCount >= 8) {
            setProcessingMessage('Finalizando resultado...');
          } else {
            messageIndex = Math.min(pollCount - 1, messages.length - 1);
            setProcessingMessage(messages[messageIndex]);
          }
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
        clearInterval(pollInterval);
        setError('Erro na verificação do status. Tente novamente.');
        setStep('confirm');
        setLoading(false);
      }
    }, 3000); // Poll every 3 seconds
    
    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (loading) {
        setError('Tempo limite excedido. Tente novamente.');
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
          <p className="text-gray-700">Carregando produto...</p>
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
              className="h-12 sm:h-16 w-auto object-contain"
              style={{ maxWidth: '300px' }}
              onLoad={() => console.log('✅ Logo carregado com sucesso:', localStoreLogo)}
              onError={(e) => {
                console.error('❌ Erro ao carregar logo:', localStoreLogo);
                console.error('❌ Erro detalhado:', e);
              }}
            />
            </>
          ) : (
            <>
              {console.log('⚠️ Logo vazio ou inválido - usando fallback')}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: localPrimaryColor }}>
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">{localStoreName}</h2>
            </div>
            </>
          )}
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
          <div className="md:w-2/5 bg-gray-50 p-4 md:p-6 flex items-center justify-center">
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
        <div className={`flex-1 p-2 md:px-2 md:py-2 overflow-y-auto transition-all duration-300 ease-in-out ${step !== 'info' ? 'md:w-full' : ''}`}>
          {error && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

        {/* Step 1: Info */}
        {step === 'info' && (
          <div className="space-y-3 md:space-y-4 animate-fade-in">
            <div className="text-center">
              <h3 className="text-2xl md:text-3xl font-semibold mb-1 md:mb-2" style={{ color: primaryColor }}>
                Sua experiência visual
              </h3>
              <p className="text-gray-700 text-base md:text-lg mb-2 md:mb-3">
                Veja seu tamanho ideal e como esta peça fica no seu corpo.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
              <div className="text-center">
                <h4 className="font-medium text-blue-800 mb-2 text-base md:text-lg">Como funciona?</h4>
                <p className="text-sm md:text-base text-blue-700">
                  Nossa tecnologia aplica digitalmente este produto em uma foto sua,
                  mostrando como ele ficaria no seu corpo de forma realista.
                </p>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-primary text-base md:text-lg">Calculadora de tamanho</h4>
                  <p className="text-sm md:text-base text-gray-600">Informe suas medidas para descobrir o tamanho ideal</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-primary text-base md:text-lg">Envie sua foto</h4>
                  <p className="text-sm md:text-base text-gray-600">Corpo inteiro, de frente, sem obstáculos</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-primary text-base md:text-lg">Veja o resultado</h4>
                  <p className="text-sm md:text-base text-gray-600">IA mostra o produto em você + tamanho ideal</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('calculator')}
              className="w-full bg-primary text-white py-3 md:py-3.5 rounded-lg hover:bg-primary-dark transition-all duration-300 ease-in-out flex items-center justify-center gap-2 font-medium text-base md:text-lg"
                          >
              Começar Agora
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <p className="text-xs md:text-sm text-center text-gray-500 mt-3">
               Suas fotos são processadas de forma segura e não são compartilhadas.
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
                    Imagem do Produto
                  </h4>
                  {availableImages.length > 1 && (
                    <p className="text-sm text-gray-600">
                      (escolha uma imagem frontal do produto)
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
                  Sua foto
                </h3>
                <p className="text-gray-700 text-sm">
                  Para melhores resultados, siga as instruções
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2 text-sm">Instruções para sua foto:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <strong>Corpo inteiro</strong> - da cabeça aos pés</li>
                      <li>• <strong>De frente</strong> - olhando para a câmera</li>
                      <li>• <strong>Sem obstáculos</strong> - nada tampando o corpo</li>
                      <li>• <strong>Boa iluminação</strong> - ambiente bem iluminado</li>
                      <li>• <strong>Fundo neutro</strong> - preferencialmente liso</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-all duration-300 ease-in-out"
              >
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 mb-2 text-base">Clique para enviar sua foto</p>
                <p className="text-sm text-gray-500">
                  JPG, PNG ou WEBP (máx. 5MB)
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
                    Imagem do Produto
                  </h4>
                  <p className="text-sm text-gray-600">
                    (escolha uma imagem frontal do produto)
                  </p>
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
                    Sua foto
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Para melhores resultados, siga as instruções
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-800 mb-1 text-sm">Instruções para sua foto:</h4>
                      <ul className="text-sm text-blue-700 space-y-0.5">
                        <li>• <strong>Corpo inteiro</strong> - da cabeça aos pés</li>
                        <li>• <strong>De frente</strong> - olhando para a câmera</li>
                        <li>• <strong>Sem obstáculos</strong> - nada tampando o corpo</li>
                        <li>• <strong>Boa iluminação</strong> - ambiente bem iluminado</li>
                        <li>• <strong>Fundo neutro</strong> - preferencialmente liso</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-all duration-300 ease-in-out"
                >
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 mb-1 text-base">Clique para enviar sua foto</p>
                  <p className="text-sm text-gray-500">
                    JPG, PNG ou WEBP (máx. 5MB)
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
                Confirmar dados
              </h3>
              <p className="text-gray-700 text-sm md:text-base">
                Verifique se está tudo correto antes de processar
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5">
                <h4 className="font-medium text-primary mb-3 text-center text-base md:text-lg">Produto:</h4>
                <div className="w-full aspect-[2/3] rounded-lg overflow-hidden">
                  <img
                    src={selectedProductImage}
                    alt="Produto"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5">
                <h4 className="font-medium text-primary mb-3 text-center text-base md:text-lg">Sua foto:</h4>
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
                className="flex-1 bg-gray-100 text-gray-700 border border-gray-300 py-3 md:py-3.5 text-base md:text-lg rounded-lg hover:bg-gray-200 transition-all duration-300 ease-in-out"
                              >
                Alterar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-primary text-white py-3 md:py-3.5 text-base md:text-lg rounded-lg hover:bg-primary-dark transition-all duration-300 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                <Sparkles className="w-5 h-5" />
                Processar
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
            <p className="text-gray-700 mb-4 text-sm md:text-base">
              Estamos criando seu try-on virtual. Isso pode levar até 1 minuto.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
              <p className="text-yellow-800 text-sm md:text-base">
                 Tempo estimado: 20-40 segundos
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
                    Sua prévia:
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
                    <p className="text-base text-gray-700 mb-2">
                      Seu tamanho recomendado:
                    </p>
                    <p className="text-6xl font-bold" style={{ color: primaryColor }}>
                      {calculatedSize || recommendedSize}
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-700 mb-4">
                   Você ficou excepcional! Esse look realmente combina muito contigo!
                  Agora seu próximo passo é adicionar ao carrinho e finalizar seu pedido.
                </p>
              </div>

              <button
                onClick={resetWidget}
                className="w-full bg-gray-100 text-gray-700 border border-gray-300 py-3 text-base rounded-lg hover:bg-gray-200 transition-all duration-300 ease-in-out"
              >
                Novo Try-On
              </button>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex md:gap-8">
              {/* Left Side: Image */}
              <div className="md:w-1/2">
                <div className="mb-3">
                  <h3 className="text-2xl font-semibold text-primary">
                    Sua prévia:
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
                    <p className="text-lg text-gray-700 mb-2">
                      Seu tamanho recomendado:
                    </p>
                    <p className="text-7xl font-bold" style={{ color: primaryColor }}>
                      {calculatedSize || recommendedSize}
                    </p>
                  </div>
                )}

                <p className="text-base text-gray-700">
                  Você ficou excepcional! Esse look realmente combina muito contigo!
                  Agora seu próximo passo é adicionar ao carrinho e finalizar seu pedido.
                </p>

                <button
                  onClick={resetWidget}
                  className="w-full bg-gray-100 text-gray-700 border border-gray-300 py-3 text-base rounded-lg hover:bg-gray-200 transition-all duration-300 ease-in-out"
                >
                  Novo Try-On
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