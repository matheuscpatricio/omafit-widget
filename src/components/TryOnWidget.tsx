import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Sparkles, ArrowRight, ArrowLeft, Mail, AlertCircle, CheckCircle, Info, ShoppingCart, Ruler } from 'lucide-react';
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
}

export function TryOnWidget({ garmentImage, productId = 'unknown', productName = 'Produto', storeName = 'Omafit', storeLogo, primaryColor = '#810707', fontFamily = 'Outfit, sans-serif', publicId }: TryOnWidgetProps) {

  // Gerar cor hover (mais escura)
  const darkenColor = (color: string, amount: number = 20): string => {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };
  const hoverColor = darkenColor(primaryColor);

  const [product, setProduct] = useState<any>(null);
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sizeData, setSizeData] = useState<SizeCalculatorData | null>(null);
  const [calculatedSize, setCalculatedSize] = useState<string | null>(null);
  const [sizeChart, setSizeChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'info' | 'calculator' | 'photo' | 'confirm' | 'processing' | 'result'>('info');
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState('Gerando sua prévia...');
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  React.useEffect(() => {
    const decodedImage = decodeURIComponent(garmentImage);

    setProduct({
      id: productId,
      name: productName,
      garment_image: decodedImage,
      category: 'auto'
    });
  }, [garmentImage, productId, productName]);

  useEffect(() => {
    const loadSizeChart = async () => {
      try {
        const { data: charts } = await supabase
          .from('size_charts')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (charts) {
          const { data: entries } = await supabase
            .from('size_chart_entries')
            .select('*')
            .eq('size_chart_id', charts.id)
            .order('order');

          if (entries) {
            setSizeChart(entries);
          }
        }
      } catch (error) {
        console.error('Error loading size chart:', error);
      }
    };

    loadSizeChart();
  }, []);

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
      model_image: modelImageDataUrl,
      garment_image: product.garment_image,
      customer_email: 'widget@omafit.com',
      product_name: product.name,
      product_id: product.id,
      public_id: publicId,
    };

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
            const sizeResult = calculateIdealSize(
              sizeData.height,
              sizeData.weight,
              sizeData.bodyType,
              sizeData.fit,
              sizeChart
            );
            if (sizeResult) {
              setCalculatedSize(sizeResult.size);
            }
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
            'Aplicando o produto...',
            'Gerando sua prévia...',
            'Finalizando resultado...'
          ];
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          setProcessingMessage(randomMessage);
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
      <div className="w-full h-full bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: primaryColor }}></div>
          <p className="text-gray-600">Carregando produto...</p>
        </div>
      </div>
    );
  }

  const displayImage = product.garment_image;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Playfair+Display:wght@400..900&family=Raleway:wght@100..900&display=swap');

        * {
          font-family: ${fontFamily} !important;
        }
        .bg-primary { background-color: ${primaryColor} !important; }
        .text-primary { color: ${primaryColor} !important; }
        .border-primary { border-color: ${primaryColor} !important; }
        .hover\\:bg-primary-dark:hover { background-color: ${hoverColor} !important; }
        .hover\\:border-primary:hover { border-color: ${primaryColor} !important; }
        .focus\\:ring-primary:focus { --tw-ring-color: ${primaryColor} !important; }
      `}</style>
      <div className={`w-full h-full bg-white overflow-hidden rounded-2xl transition-all duration-400 ease-in-out transform ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} flex flex-col`} style={{ fontFamily }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 rounded-t-2xl flex-shrink-0">
        <div className="flex items-center justify-center relative">
          {storeLogo ? (
            <img
              src={storeLogo}
              alt={storeName}
              className="h-12 sm:h-16 w-auto object-contain"
              style={{ maxWidth: '300px' }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: primaryColor }}>
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900" style={{ fontFamily }}>{storeName}</h2>
            </div>
          )}
          {step !== 'info' && step !== 'processing' && (
            <button
              onClick={goBack}
              className="absolute left-0 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-all duration-300 ease-in-out"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Layout com duas colunas no desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Coluna da imagem (esquerda no desktop) - Esconde na calculadora e resultado */}
        {step !== 'calculator' && step !== 'result' && (
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
        <div className={`flex-1 p-4 md:p-6 overflow-y-auto ${step === 'calculator' || step === 'result' ? 'md:w-full' : ''}`}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

        {/* Step 1: Info */}
        {step === 'info' && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-2xl md:text-2xl font-semibold mb-2" style={{ color: primaryColor }}>
                Virtual Try-On
              </h3>
              <p className="text-gray-600 text-base md:text-lg mb-3">
                Garanta que se vestirá bem, antes mesmo de pagar!
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 md:w-5 md:h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-800 mb-2 text-base md:text-lg">Como funciona?</h4>
                  <p className="text-sm md:text-base text-blue-700">
                    Nossa tecnologia aplica digitalmente este produto em uma foto sua,
                    mostrando como ele ficaria no seu corpo de forma realista.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm md:text-base flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-primary text-base md:text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>Calculadora de tamanho</h4>
                  <p className="text-sm md:text-base text-gray-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Informe suas medidas para descobrir o tamanho ideal</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm md:text-base flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-primary text-base md:text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>Envie sua foto</h4>
                  <p className="text-sm md:text-base text-gray-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Corpo inteiro, de frente, sem obstáculos</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm md:text-base flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-primary text-base md:text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>Veja o resultado</h4>
                  <p className="text-sm md:text-base text-gray-600" style={{ fontFamily: 'Outfit, sans-serif' }}>IA mostra o produto em você + tamanho ideal</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('calculator')}
              className="w-full bg-primary text-white py-3 md:py-4 rounded-lg hover:bg-primary-dark transition-all duration-300 ease-in-out flex items-center justify-center gap-2 font-medium text-base md:text-lg"
                          >
              Começar Agora
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <p className="text-xs md:text-sm text-center text-gray-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
               Suas fotos são processadas de forma segura e não são compartilhadas.
            </p>
          </div>
        )}

        {/* Step 2: Size Calculator */}
        {step === 'calculator' && (
          <SizeCalculator
            onComplete={(data) => {
              setSizeData(data);
              setStep('photo');
            }}
            onBack={() => setStep('info')}
            primaryColor={primaryColor}
          />
        )}

        {/* Step 3: Photo Upload */}
        {step === 'photo' && (
          <div className="space-y-4">
            <div className="text-center mb-3">
              <h3 className="text-2xl md:text-3xl font-semibold text-primary mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Sua foto
              </h3>
              <p className="text-gray-600 text-sm md:text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Para melhores resultados, siga as instruções
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 md:w-6 md:h-6 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-800 mb-2 text-sm md:text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>Instruções para a foto:</h4>
                  <ul className="text-sm md:text-base text-blue-700 space-y-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
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
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 md:p-10 text-center cursor-pointer hover:border-primary transition-all duration-300 ease-in-out"
            >
              <Camera className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2 text-base md:text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>Clique para enviar sua foto</p>
              <p className="text-sm md:text-base text-gray-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
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
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && imagePreview && (
          <div className="space-y-4">
            <div className="text-center mb-3">
              <h3 className="text-2xl md:text-3xl font-semibold text-primary mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Confirmar dados
              </h3>
              <p className="text-gray-600 text-sm md:text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Verifique se está tudo correto antes de processar
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-medium text-primary mb-2 text-center text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>Produto:</h4>
                <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={displayImage}
                    alt="Produto"
                    className="max-w-full max-h-full object-cover"
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-medium text-primary mb-2 text-center text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>Sua foto:</h4>
                <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Sua foto"
                    className="max-w-full max-h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('photo')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 md:py-4 text-base md:text-lg rounded-lg hover:bg-gray-200 transition-all duration-300 ease-in-out"
                              >
                Alterar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-primary text-white py-3 md:py-4 text-base md:text-lg rounded-lg hover:bg-primary-dark transition-all duration-300 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                Processar
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Processing */}
        {step === 'processing' && (
          <div className="text-center py-10 md:py-16">
            <div className="animate-spin rounded-full h-16 w-16 md:h-20 md:w-20 border-b-2 border-primary mx-auto mb-6"></div>
            <h3 className="text-2xl md:text-3xl font-semibold text-primary mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {processingMessage}
            </h3>
            <p className="text-gray-600 mb-4 text-sm md:text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Estamos criando seu try-on virtual. Isso pode levar até 1 minuto.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm md:text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                ⏱️ Tempo estimado: 20-40 segundos
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Result */}
        {step === 'result' && result && (
          <div className="space-y-4">
            {/* Mobile Layout */}
            <div className="md:hidden space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <h3 className="text-2xl font-semibold text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
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

                {calculatedSize && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-center">
                    <h4 className="font-semibold text-green-900 mb-1 text-base" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Seu tamanho Ideal: {calculatedSize}
                    </h4>
                    <p className="text-sm text-green-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Com base na sua altura, peso e tipo físico
                    </p>
                  </div>
                )}

                <p className="text-sm text-green-600 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
                   Você ficou excepcional! Esse look realmente combina muito contigo!
                  Agora seu próximo passo é adicionar ao carrinho e finalizar seu pedido.
                </p>
              </div>

              <button
                onClick={resetWidget}
                className="w-full bg-gray-100 text-gray-700 py-3 text-base rounded-lg hover:bg-gray-200 transition-all duration-300 ease-in-out"
              >
                Novo Try-On
              </button>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex md:gap-6">
              {/* Left Side: Image */}
              <div className="md:w-1/2">
                <div className="mb-4">
                  <h3 className="text-3xl font-semibold text-primary" style={{ fontFamily: 'Outfit, sans-serif' }}>
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
              <div className="md:w-1/2 flex flex-col justify-center space-y-6">
                {calculatedSize && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h4 className="font-semibold text-green-900 mb-2 text-2xl" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Seu tamanho Ideal: {calculatedSize}
                    </h4>
                    <p className="text-lg text-green-700" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Com base na sua altura, peso e tipo físico
                    </p>
                  </div>
                )}

                <p className="text-lg text-green-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Você ficou excepcional! Esse look realmente combina muito contigo!
                  Agora seu próximo passo é adicionar ao carrinho e finalizar seu pedido.
                </p>

                <button
                  onClick={resetWidget}
                  className="w-full bg-gray-100 text-gray-700 py-4 text-lg rounded-lg hover:bg-gray-200 transition-all duration-300 ease-in-out"
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