import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Sparkles, ArrowRight, X, Mail, AlertCircle, CheckCircle, Info, ShoppingCart, ArrowLeft, Search, Grid, List, Copy, Download } from 'lucide-react';

export function TryOnWidgetNew() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'products' | 'email' | 'photo' | 'confirm' | 'processing' | 'result'>('products');
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState('Gerando sua prévia...');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('🟢 TryOnWidgetNew montado');
    fetchProducts();

    // Verificar se há uma imagem de produto na URL
    const urlParams = new URLSearchParams(window.location.search);
    const productImageUrl = urlParams.get('productImage');

    console.log('🔍 Buscando parâmetro productImage:', productImageUrl);

    if (productImageUrl) {
      console.log('✅ Imagem do produto detectada na URL:', productImageUrl);
      // Criar um produto temporário com a imagem da URL
      const tempProduct = {
        id: 'url-product',
        name: 'Produto da Página',
        garment_image: productImageUrl,
        category: 'tops'
      };
      setSelectedProduct(tempProduct);
      setStep('email');
      console.log('➡️ Step alterado para: email');
    } else {
      console.log('ℹ️ Nenhuma imagem detectada, mostrando lista de produtos');
    }
  }, []);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-products`
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar produtos');
      }

      const data = await response.json();
      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch (error: any) {
      console.error('Erro ao buscar produtos:', error);
      setError('Não foi possível carregar os produtos. Tente novamente.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setStep('email');
    setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 10MB');
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
        setStep('confirm');
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!modelImage || !selectedProduct || !customerEmail) {
      setError('Por favor, selecione um produto, informe seu e-mail e faça upload da sua foto');
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
        garment_image: selectedProduct.garment_image,
        customer_email: customerEmail,
        product_name: selectedProduct.name,
        product_id: selectedProduct.id
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
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (predictionId: string) => {
    let pollCount = 0;

    const pollInterval = setInterval(async () => {
      pollCount++;

      try {
        const statusResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tryon-status/${predictionId}`
        );

        if (!statusResponse.ok) {
          throw new Error('Erro ao verificar status');
        }

        const statusData = await statusResponse.json();

        if (statusData.status === 'completed' && statusData.output && statusData.output.length > 0) {
          clearInterval(pollInterval);
          setResult(statusData.output[0]);
          setStep('result');
          setLoading(false);
        } else if (statusData.status === 'failed' || statusData.status === 'error') {
          clearInterval(pollInterval);
          setError('Falha no processamento da imagem. Tente novamente.');
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
        console.error('Erro no polling:', error);
        clearInterval(pollInterval);
        setError('Erro na verificação do status. Tente novamente.');
        setStep('confirm');
        setLoading(false);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(pollInterval);
      if (loading) {
        setError('Tempo limite excedido. Tente novamente.');
        setStep('confirm');
        setLoading(false);
      }
    }, 300000);
  };

  const resetWidget = () => {
    setStep('products');
    setSelectedProduct(null);
    setModelImage(null);
    setImagePreview(null);
    setCustomerEmail('');
    setResult(null);
    setError('');
    setPredictionId(null);
    setSearchTerm('');
    setCopiedLink(false);
  };

  const copyResultLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `tryon-resultado-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const goBack = () => {
    switch (step) {
      case 'email':
        setStep('products');
        setSelectedProduct(null);
        break;
      case 'photo':
        setStep('email');
        break;
      case 'confirm':
        setStep('photo');
        setModelImage(null);
        setImagePreview(null);
        break;
      default:
        break;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      tops: 'Blusas',
      dresses: 'Vestidos',
      bottoms: 'Calças',
      shoes: 'Sapatos',
      accessories: 'Acessórios'
    };
    return labels[category] || category;
  };

  console.log('🎨 Renderizando TryOnWidgetNew - Step atual:', step);
  console.log('📦 Produto selecionado:', selectedProduct);
  console.log('📧 Email:', customerEmail);
  console.log('🖼️ Preview:', imagePreview);

  return (
    <div className="w-full max-w-2xl mx-auto h-full bg-white overflow-hidden rounded-2xl shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#810707] to-red-800 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#810707]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">OmaFit Try-On</h2>
              <p className="text-red-100 text-sm">Experimente virtualmente</p>
            </div>
          </div>
          {step !== 'products' && step !== 'processing' && step !== 'result' && (
            <button
              onClick={goBack}
              className="text-red-100 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 max-h-[calc(100vh-120px)] overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Product Selection */}
        {step === 'products' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#810707] mb-2">
                Escolha um Produto
              </h3>
              <p className="text-gray-600">
                Selecione o produto que você gostaria de experimentar
              </p>
            </div>

            {/* Search and View Toggle */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#810707]"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className={`${
                      viewMode === 'grid'
                        ? 'flex flex-col'
                        : 'flex items-center gap-4'
                    } bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#810707] hover:shadow-lg transition-all text-left`}
                  >
                    <div className={`${viewMode === 'grid' ? 'w-full h-48' : 'w-24 h-24'} bg-gray-100 rounded-lg overflow-hidden flex-shrink-0`}>
                      <img
                        src={product.garment_image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">{product.name}</h4>
                      {product.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {product.description}
                        </p>
                      )}
                      <span className="inline-block text-xs bg-[#810707] text-white px-2 py-1 rounded-full">
                        {getCategoryLabel(product.category)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Email Collection */}
        {step === 'email' && selectedProduct && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#810707] mb-2">
                Seu E-mail
              </h3>
              <p className="text-gray-600">
                Para processar seu try-on virtual
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={selectedProduct.garment_image}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-grow">
                <h4 className="font-semibold text-gray-800">{selectedProduct.name}</h4>
                <span className="text-xs bg-[#810707] text-white px-2 py-1 rounded-full">
                  {getCategoryLabel(selectedProduct.category)}
                </span>
              </div>
              {selectedProduct.id !== 'url-product' && (
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setStep('products');
                  }}
                  className="text-sm text-[#810707] hover:underline flex-shrink-0"
                >
                  Trocar
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                E-mail
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setStep('photo')}
              disabled={!customerEmail.trim() || !customerEmail.includes('@')}
              className="w-full bg-[#810707] text-white py-4 rounded-lg hover:bg-[#6b0505] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              Continuar
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 3: Photo Upload */}
        {step === 'photo' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#810707] mb-2">
                Sua Foto
              </h3>
              <p className="text-gray-600">
                Para melhores resultados, siga as instruções
              </p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Instruções para a foto:</h4>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <strong>Corpo inteiro</strong> - da cabeça aos pés
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <strong>De frente</strong> - olhando para a câmera
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <strong>Sem obstáculos</strong> - nada tampando o corpo
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      <strong>Boa iluminação</strong> - ambiente bem iluminado
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-3 border-dashed border-[#810707] rounded-xl p-12 text-center cursor-pointer hover:bg-red-50 transition-all"
            >
              <Camera className="w-16 h-16 text-[#810707] mx-auto mb-4" />
              <p className="text-gray-800 font-semibold mb-2 text-lg">Clique para enviar sua foto</p>
              <p className="text-sm text-gray-500">
                JPG, PNG ou WEBP (máx. 10MB)
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
        {step === 'confirm' && imagePreview && selectedProduct && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-[#810707] mb-2">
                Confirmar Dados
              </h3>
              <p className="text-gray-600">
                Verifique se está tudo correto antes de processar
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-[#810707] mb-3 text-center">Produto</h4>
                <div className="w-full h-48 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={selectedProduct.garment_image}
                    alt="Produto"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <p className="text-center text-sm text-gray-600 mt-2">{selectedProduct.name}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-[#810707] mb-3 text-center">Sua Foto</h4>
                <div className="w-full h-48 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Sua foto"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <p className="text-center text-sm text-gray-600 mt-2">{customerEmail}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('photo')}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
              >
                Alterar Foto
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-[#810707] to-red-800 text-white py-4 rounded-lg hover:from-[#6b0505] hover:to-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-semibold text-lg"
              >
                <Sparkles className="w-5 h-5" />
                Processar
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Processing */}
        {step === 'processing' && (
          <div className="text-center py-12">
            <div className="relative inline-block mb-6">
              <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-[#810707]"></div>
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-[#810707]" />
            </div>
            <h3 className="text-2xl font-bold text-[#810707] mb-3">
              {processingMessage}
            </h3>
            <p className="text-gray-600 mb-6 text-lg">
              Estamos criando seu try-on virtual. Isso pode levar até 2 minutos.
            </p>
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 inline-block">
              <p className="text-yellow-800 font-semibold">
                ⏱️ Tempo estimado: 30-120 segundos
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Result */}
        {step === 'result' && result && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <h3 className="text-2xl font-bold text-[#810707]">
                  Try-On Concluído!
                </h3>
              </div>
              <div className="w-full max-h-96 bg-gray-100 rounded-xl overflow-hidden mb-6 flex items-center justify-center">
                <img
                  src={result}
                  alt="Resultado do try-on"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="text-lg text-green-600 font-semibold mb-2">
                ✅ Veja como o produto fica em você!
              </p>
              <p className="text-gray-600 mb-4">
                Gostou do resultado? Compartilhe ou adicione ao carrinho!
              </p>
            </div>

            {/* Share Section */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm text-gray-700 mb-3 font-semibold text-center">
                📤 Compartilhe o seu resultado
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={copyResultLink}
                  className="bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar Link
                    </>
                  )}
                </button>
                <button
                  onClick={downloadResult}
                  className="bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Download className="w-5 h-5" />
                  Baixar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={resetWidget}
                className="bg-gray-100 text-gray-700 py-4 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
              >
                Novo Try-On
              </button>
              <button
                onClick={() => {
                  if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ action: 'addToCart', productId: selectedProduct?.id }, '*');
                  } else {
                    alert('Produto aprovado! Adicione ao carrinho na página.');
                  }
                }}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-lg hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <ShoppingCart className="w-5 h-5" />
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
