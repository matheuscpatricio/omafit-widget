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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const image = params.get('productImage');
    const imagesParam = params.get('productImages');
    const id = params.get('productId');
    const name = params.get('productName');
    const configParam = params.get('config');
    const pubId = params.get('publicId');
    const shop = params.get('shopDomain');

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

    if (configParam) {
      try {
        const config = JSON.parse(decodeURIComponent(configParam));
        console.log('📦 Config recebido no widget:', config);
        if (config.storeName) {
          setStoreName(config.storeName);
        }
        if (config.storeLogo) {
          setStoreLogo(config.storeLogo);
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
        console.log('🖼️ Logo recebido via postMessage');
        setStoreLogo(event.data.logo);
      }

      if (event.data.type === 'omafit-config-update') {
        console.log('⚙️ Config atualizado via postMessage');
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
          setStoreLogo(event.data.storeLogo);
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
        />
      </div>
    </div>
  );
}