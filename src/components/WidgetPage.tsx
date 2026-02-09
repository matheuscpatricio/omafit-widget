import React, { useEffect, useState } from 'react';
import { TryOnWidget } from './TryOnWidget';

export function WidgetPage() {
  const [productImage, setProductImage] = useState<string>('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productId, setProductId] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('Omafit');
  const [storeLogo, setStoreLogo] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#810707');
  const [fontFamily, setFontFamily] = useState<string>('');
  const [fontWeight, setFontWeight] = useState<string>('');
  const [fontStyle, setFontStyle] = useState<string>('');
  const [publicId, setPublicId] = useState<string>('');
  const [shopDomain, setShopDomain] = useState<string>('');
  const [collectionId, setCollectionId] = useState<string>('');
  const [collectionHandle, setCollectionHandle] = useState<string>('');
  const [gender, setGender] = useState<string>('unisex');
  const [defaultGender, setDefaultGender] = useState<string>('unisex');
  const [recommendedProductName, setRecommendedProductName] = useState<string>('');
  const [recommendedProductUrl, setRecommendedProductUrl] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const image = params.get('productImage');
    const imagesParam = params.get('productImages');
    const id = params.get('productId');
    const name = params.get('productName');
    const configParam = params.get('config');
    const pubId = params.get('publicId');
    const shop = params.get('shopDomain');
    const logoParam = params.get('storeLogo');
    const collectionIdParam = params.get('collectionId');
    const collectionHandleParam = params.get('collectionHandle');
    const genderParam = params.get('gender');
    const defaultGenderParam = params.get('defaultGender');
    const recommendedProductNameParam = params.get('recommendedProductName');
    const recommendedProductUrlParam = params.get('recommendedProductUrl');
    const complementaryProductParam = params.get('complementaryProductUrl');

    console.log('🔍 ===== WIDGETPAGE: PARÂMETROS DA URL =====');
    console.log('   - storeLogo:', logoParam);
    console.log('   - shop:', shop);
    console.log('   - publicId:', pubId);
    console.log('   - collectionId:', collectionIdParam || 'não fornecido');
    console.log('   - collectionHandle:', collectionHandleParam || 'não fornecido (tabela global)');
    console.log('   - gender:', genderParam || 'não fornecido');
    console.log('   - defaultGender:', defaultGenderParam || 'não fornecido');
    console.log('   - config length:', configParam?.length || 0);

    if (image) {
      setProductImage(image);
    }

    if (imagesParam) {
      try {
        const images = JSON.parse(decodeURIComponent(imagesParam));
        if (Array.isArray(images)) {
          setProductImages(images);
        }
      } catch (error) {
        console.error('Error parsing images:', error);
      }
    }

    if (id) {
      setProductId(id);
    }

    if (name) {
      setProductName(decodeURIComponent(name));
    }

    if (pubId) {
      setPublicId(pubId);
    }

    if (shop) {
      setShopDomain(shop);
    }

    if (collectionIdParam) {
      console.log('✅ Collection ID definido:', collectionIdParam);
      setCollectionId(collectionIdParam);
    }

    if (collectionHandleParam) {
      console.log('✅ Collection Handle definido:', collectionHandleParam);
      setCollectionHandle(collectionHandleParam);
    }

    if (genderParam) {
      console.log('✅ Gender definido:', genderParam);
      setGender(genderParam);
    }

    if (defaultGenderParam) {
      console.log('✅ Default Gender definido:', defaultGenderParam);
      setDefaultGender(defaultGenderParam);
    }

    // Prioridade para complementaryProductUrl (formato novo via PostMessage)
    if (complementaryProductParam) {
      try {
        const complementaryProduct = JSON.parse(decodeURIComponent(complementaryProductParam));
        if (complementaryProduct.title && complementaryProduct.url) {
          console.log('✅ Produto complementar recebido:', complementaryProduct);
          setRecommendedProductName(complementaryProduct.title);
          setRecommendedProductUrl(complementaryProduct.url);
        }
      } catch (error) {
        console.error('Erro ao parsear complementaryProductUrl:', error);
      }
    } else {
      // Fallback para formato antigo
      if (recommendedProductNameParam) {
        setRecommendedProductName(decodeURIComponent(recommendedProductNameParam));
      }

      if (recommendedProductUrlParam) {
        setRecommendedProductUrl(decodeURIComponent(recommendedProductUrlParam));
      }
    }

    // Prioridade 1: parâmetro direto storeLogo
    if (logoParam && logoParam.trim() !== '') {
      console.log('✅ Logo encontrado nos parâmetros diretos:', logoParam);
      setStoreLogo(logoParam);
    }

    if (configParam) {
      try {
        const config = JSON.parse(decodeURIComponent(configParam));
        console.log('📦 Config recebido no widget:', config);
        console.log('🖼️ Logo no config:', config.storeLogo, 'tipo:', typeof config.storeLogo);
        if (config.storeName) {
          setStoreName(config.storeName);
        }
        // Prioridade 2: logo do config (só se não foi definido pelo parâmetro direto)
        if (config.storeLogo && config.storeLogo.trim() !== '' && (!logoParam || logoParam.trim() === '')) {
          console.log('✅ Definindo storeLogo do config:', config.storeLogo);
          setStoreLogo(config.storeLogo);
        } else if (!config.storeLogo && (!logoParam || logoParam.trim() === '')) {
          console.log('⚠️ storeLogo está vazio ou undefined no config e nos parâmetros');
        }
        if (config.primaryColor) {
          setPrimaryColor(config.primaryColor);
        }
        if (config.fontFamily) {
          setFontFamily(config.fontFamily);
        }
        if (config.fontWeight) {
          setFontWeight(config.fontWeight);
        }
        if (config.fontStyle) {
          setFontStyle(config.fontStyle);
        }
      } catch (error) {
        console.error('Error parsing config:', error);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Mensagem recebida:', event.data.type);

      if (event.data.type === 'omafit-store-logo') {
        console.log('🖼️ Logo recebido via postMessage:', event.data.logo);
        setStoreLogo(event.data.logo);
      }

      if (event.data.type === 'omafit-collection-handle') {
        console.log('📦 Collection Handle recebido via postMessage:', event.data.collectionHandle);
        if (event.data.collectionHandle) {
          setCollectionHandle(event.data.collectionHandle);
        }
      }

      if (event.data.type === 'omafit-context') {
        console.log('🌐 Contexto recebido via postMessage:', event.data);
        if (event.data.defaultGender) {
          console.log('✅ Default Gender do contexto:', event.data.defaultGender);
          setDefaultGender(event.data.defaultGender);
        }
        if (event.data.collectionHandle !== undefined) {
          console.log('📦 Collection Handle do contexto:', event.data.collectionHandle || 'vazio (tabela global)');
          setCollectionHandle(event.data.collectionHandle || '');
        }
        if (event.data.shopDomain) {
          console.log('🏪 Shop Domain do contexto:', event.data.shopDomain);
          setShopDomain(event.data.shopDomain);
        }
        if (event.data.complementaryProduct) {
          console.log('🎁 Produto complementar do contexto:', event.data.complementaryProduct);
          if (event.data.complementaryProduct.title && event.data.complementaryProduct.url) {
            setRecommendedProductName(event.data.complementaryProduct.title);
            setRecommendedProductUrl(event.data.complementaryProduct.url);
          }
        }
      }

      if (event.data.type === 'omafit-config-update') {
        console.log('⚙️ Config atualizado via postMessage:', event.data);
        if (event.data.fontFamily) {
          setFontFamily(event.data.fontFamily);
        }
        if (event.data.primaryColor) {
          setPrimaryColor(event.data.primaryColor);
        }
        if (event.data.storeName) {
          setStoreName(event.data.storeName);
        }
        if (event.data.storeLogo) {
          console.log('✅ Atualizando storeLogo via postMessage:', event.data.storeLogo);
          setStoreLogo(event.data.storeLogo);
        }
        if (event.data.collectionHandle !== undefined) {
          console.log('📦 Collection Handle do config:', event.data.collectionHandle || 'vazio (tabela global)');
          setCollectionHandle(event.data.collectionHandle || '');
        }
        if (event.data.shopDomain) {
          console.log('🏪 Shop Domain do config:', event.data.shopDomain);
          setShopDomain(event.data.shopDomain);
        }
        if (event.data.defaultGender) {
          console.log('👤 Default Gender do config:', event.data.defaultGender);
          setDefaultGender(event.data.defaultGender);
        }
        if (event.data.complementaryProduct) {
          console.log('🎁 Produto complementar do config:', event.data.complementaryProduct);
          if (event.data.complementaryProduct.title && event.data.complementaryProduct.url) {
            setRecommendedProductName(event.data.complementaryProduct.title);
            setRecommendedProductUrl(event.data.complementaryProduct.url);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (!productImage) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#810707] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando produto...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 WidgetPage - Renderizando com storeLogo:', storeLogo);

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center px-2 py-4 sm:p-4" style={{ fontFamily: fontFamily || 'inherit' }}>
      <div className="w-full sm:max-w-2xl max-h-[85vh] overflow-auto">
        <TryOnWidget
          garmentImage={productImage}
          productImages={productImages}
          productId={productId}
          productName={productName}
          storeName={storeName}
          storeLogo={storeLogo}
          primaryColor={primaryColor}
          fontFamily={fontFamily}
          publicId={publicId}
          shopDomain={shopDomain}
          collectionId={collectionId}
          collectionHandle={collectionHandle}
          gender={gender}
          defaultGender={defaultGender}
          recommendedProductName={recommendedProductName}
          recommendedProductUrl={recommendedProductUrl}
        />
      </div>
    </div>
  );
}