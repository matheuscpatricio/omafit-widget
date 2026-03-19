import React, { useEffect, useState } from 'react';
import { ShoeARWidget } from './ShoeARWidget';

const normalizeWidgetLanguage = (value: unknown): 'pt' | 'es' | 'en' | null => {
  const raw = String(value || '').trim().toLowerCase().replace('_', '-');
  if (!raw) return null;

  const base = raw.split('-')[0];
  if (base === 'pt' || base === 'es' || base === 'en') return base;
  if (raw === 'portuguese' || raw === 'portugues') return 'pt';
  if (raw === 'spanish' || raw === 'espanol' || raw === 'español') return 'es';
  if (raw === 'english' || raw === 'ingles' || raw === 'inglês') return 'en';

  return null;
};

const DEFAULT_SHOE_MODEL_URL =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb';

const normalizeFootwearCollectionType = (value: unknown): boolean => {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (['upper', 'lower', 'full'].includes(raw)) return false;

  return ['shoes', 'shoe', 'sapatos', 'sapato', 'calcados', 'calcado', 'footwear'].includes(raw);
};

export function ShoeARWidgetPage() {
  const [productImage, setProductImage] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [productName, setProductName] = useState<string>('Calcado em destaque');
  const [storeName, setStoreName] = useState<string>('Omafit');
  const [storeLogo, setStoreLogo] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#810707');
  const [fontFamily, setFontFamily] = useState<string>('Outfit');
  const [storeLanguage, setStoreLanguage] = useState<'pt' | 'es' | 'en'>('pt');
  const [shoeModelUrl, setShoeModelUrl] = useState<string>(DEFAULT_SHOE_MODEL_URL);
  const [shoeModelIosUrl, setShoeModelIosUrl] = useState<string>('');
  const [shopDomain, setShopDomain] = useState<string>('');
  const [collectionId, setCollectionId] = useState<string>('');
  const [collectionHandle, setCollectionHandle] = useState<string>('');
  const [defaultGender, setDefaultGender] = useState<string>('unisex');
  const [isFootwearCollection, setIsFootwearCollection] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const configParam = params.get('config');
    const image = params.get('productImage');
    const id = params.get('productId');
    const name = params.get('productName');
    const shopDomainParam = params.get('shopDomain');
    const collectionIdParam = params.get('collectionId');
    const collectionHandleParam = params.get('collectionHandle');
    const defaultGenderParam = params.get('defaultGender');
    const collectionTypeParam = params.get('collectionType');
    const shopNameParam = params.get('shopName') || params.get('shop_name');
    const logoParam = params.get('storeLogo');
    const languageParam =
      params.get('adminLocale') ||
      params.get('admin_locale') ||
      params.get('language') ||
      params.get('lang') ||
      params.get('storeLanguage');
    const shoeModelParam = params.get('shoeModelUrl') || params.get('modelUrl') || params.get('shoeModel');
    const shoeModelIosParam = params.get('shoeModelIosUrl') || params.get('iosModelUrl');

    if (image) setProductImage(image);
    if (id) setProductId(id);
    if (name) setProductName(decodeURIComponent(name));
    if (shopDomainParam) setShopDomain(decodeURIComponent(shopDomainParam));
    if (collectionIdParam) setCollectionId(collectionIdParam);
    if (collectionHandleParam) setCollectionHandle(collectionHandleParam);
    if (defaultGenderParam) setDefaultGender(defaultGenderParam);
    if (collectionTypeParam !== null) {
      setIsFootwearCollection(normalizeFootwearCollectionType(collectionTypeParam));
    }
    if (shopNameParam) setStoreName(decodeURIComponent(shopNameParam));
    if (logoParam) setStoreLogo(logoParam);
    if (shoeModelParam) setShoeModelUrl(decodeURIComponent(shoeModelParam));
    if (shoeModelIosParam) setShoeModelIosUrl(decodeURIComponent(shoeModelIosParam));

    const normalizedLanguage = normalizeWidgetLanguage(languageParam);
    if (normalizedLanguage) setStoreLanguage(normalizedLanguage);

    if (configParam) {
      try {
        const config = JSON.parse(decodeURIComponent(configParam));
        if (config.storeName) setStoreName(config.storeName);
        if (config.storeLogo && (!logoParam || logoParam.trim() === '')) setStoreLogo(config.storeLogo);
        if (config.primaryColor) setPrimaryColor(config.primaryColor);
        if (config.fontFamily) setFontFamily(config.fontFamily);
        if (config.collectionId && !collectionIdParam) setCollectionId(config.collectionId);
        if (config.collectionHandle && !collectionHandleParam) setCollectionHandle(config.collectionHandle);
        if (config.defaultGender && !defaultGenderParam) setDefaultGender(config.defaultGender);
        if (config.collectionType !== undefined) {
          setIsFootwearCollection(
            normalizeFootwearCollectionType(config.collectionType)
          );
        }
        if (config.shoeModelUrl && !shoeModelParam) setShoeModelUrl(config.shoeModelUrl);
        if (config.shoeModelIosUrl && !shoeModelIosParam) setShoeModelIosUrl(config.shoeModelIosUrl);

        const configLanguage = normalizeWidgetLanguage(
          config.adminLocale || config.admin_locale || config.language
        );
        if (configLanguage) setStoreLanguage(configLanguage);
      } catch (error) {
        console.error('Erro ao parsear config do widget de calcados:', error);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'omafit-context' || event.data.type === 'omafit-config-update') {
        if (event.data.storeName) setStoreName(event.data.storeName);
        if (event.data.storeLogo) setStoreLogo(event.data.storeLogo);
        if (event.data.primaryColor) setPrimaryColor(event.data.primaryColor);
        if (event.data.fontFamily) setFontFamily(event.data.fontFamily);
        if (event.data.productImage) setProductImage(event.data.productImage);
        if (event.data.productName) setProductName(event.data.productName);
        if (event.data.productId) setProductId(event.data.productId);
        if (event.data.shopDomain) setShopDomain(event.data.shopDomain);
        if (event.data.collectionId) setCollectionId(event.data.collectionId);
        if (event.data.collectionHandle !== undefined) setCollectionHandle(event.data.collectionHandle || '');
        if (event.data.defaultGender) setDefaultGender(event.data.defaultGender);
        if (event.data.collectionType !== undefined) {
          setIsFootwearCollection(
            normalizeFootwearCollectionType(event.data.collectionType)
          );
        }
        if (event.data.shoeModelUrl) setShoeModelUrl(event.data.shoeModelUrl);
        if (event.data.shoeModelIosUrl) setShoeModelIosUrl(event.data.shoeModelIosUrl);

        const eventLanguage = normalizeWidgetLanguage(
          event.data.adminLocale || event.data.admin_locale || event.data.language
        );
        if (eventLanguage) setStoreLanguage(eventLanguage);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div
      className="min-h-screen bg-transparent flex items-center justify-center px-2 py-4 sm:p-4"
      style={{ fontFamily: fontFamily || 'inherit' }}
    >
      <div className="w-full sm:max-w-6xl max-h-[92vh] overflow-auto">
        {isFootwearCollection ? (
          <ShoeARWidget
            productImage={productImage}
            productId={productId}
            productName={productName}
            storeName={storeName}
            storeLogo={storeLogo}
            primaryColor={primaryColor}
            fontFamily={fontFamily}
            language={storeLanguage}
            shoeModelUrl={shoeModelUrl}
            shoeModelIosUrl={shoeModelIosUrl}
            shopDomain={shopDomain}
            collectionId={collectionId}
            collectionHandle={collectionHandle}
            defaultGender={defaultGender}
          />
        ) : (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-xl">
            <h2 className="text-2xl font-semibold text-slate-900">Widget indisponivel</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              O widget de calcados so pode ser exibido quando a colecao recebida for de calcados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
