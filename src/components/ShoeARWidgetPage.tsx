import React, { useCallback, useEffect, useState } from 'react';
import { ShoeARWidget } from './ShoeARWidget';
import {
  parseCollectionHandlesFromMessage,
  pickPreferredCollectionHandle,
} from '../utils/pickPreferredCollectionHandle';
import type { TryonLayoutMode } from '../utils/parseTryonLayoutFromUrl';

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

const normalizeDefaultGender = (value: unknown): string => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw === '(vazio)' || raw === 'null' || raw === 'undefined') return 'unisex';
  if (raw === 'male' || raw === 'masculino' || raw === 'man' || raw === 'men') return 'male';
  if (raw === 'female' || raw === 'feminino' || raw === 'woman' || raw === 'women') return 'female';
  if (raw === 'unisex') return 'unisex';
  return raw;
};

type ProductCatalog = {
  sizes: string[];
  colors: string[];
  variants: Array<Record<string, unknown>>;
};

export function ShoeARWidgetPage() {
  const [tryonSidebarChrome, setTryonSidebarChrome] = useState(() => false);
  const handleTryonLayoutChange = useCallback((layout: TryonLayoutMode) => {
    setTryonSidebarChrome(layout === 'sidebar' || layout === 'hero');
  }, []);
  const [productImage, setProductImage] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [productName, setProductName] = useState<string>('Calçado em destaque');
  const [productDescription, setProductDescription] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('Omafit');
  const [storeLogo, setStoreLogo] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#810707');
  const [fontFamily, setFontFamily] = useState<string>('Outfit');
  const [storeLanguage, setStoreLanguage] = useState<'pt' | 'es' | 'en'>('pt');
  const [shoeModelUrl, setShoeModelUrl] = useState<string>(DEFAULT_SHOE_MODEL_URL);
  const [shoeModelIosUrl, setShoeModelIosUrl] = useState<string>('');
  const [publicId, setPublicId] = useState<string>('');
  const [shopDomain, setShopDomain] = useState<string>('');
  const [collectionId, setCollectionId] = useState<string>('');
  const [collectionHandle, setCollectionHandle] = useState<string>('');
  const [collectionHandlesList, setCollectionHandlesList] = useState<string[]>([]);
  const [defaultGender, setDefaultGender] = useState<string>('unisex');
  const [isFootwearCollection, setIsFootwearCollection] = useState<boolean>(false);
  const [collectionTypeResolved, setCollectionTypeResolved] = useState<boolean>(false);
  const [productCatalog, setProductCatalog] = useState<ProductCatalog>({
    sizes: [],
    colors: [],
    variants: [],
  });
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [tryonLayoutBackgroundImage, setTryonLayoutBackgroundImage] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const configParam = params.get('config');
    const image = params.get('productImage');
    const id = params.get('productId');
    const name = params.get('productName');
    const description = params.get('productDescription') || params.get('product_description');
    const publicIdParam = params.get('publicId') || params.get('public_id');
    const shopDomainParam = params.get('shopDomain');
    const collectionIdParam = params.get('collectionId');
    const collectionHandleParam = params.get('collectionHandle');
    const collectionHandlesCsv = params.get('collectionHandles');
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
    const heroBackgroundParam = params.get('tryonLayoutBackgroundImage') || params.get('tryon_layout_background_image');

    if (image) setProductImage(image);
    if (id) setProductId(id);
    if (name) setProductName(decodeURIComponent(name));
    if (description) setProductDescription(decodeURIComponent(description));
    if (publicIdParam) setPublicId(decodeURIComponent(publicIdParam));
    if (shopDomainParam) setShopDomain(decodeURIComponent(shopDomainParam));
    if (collectionIdParam) setCollectionId(collectionIdParam);
    const handlesFromUrl = collectionHandlesCsv
      ? collectionHandlesCsv
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean)
      : [];
    setCollectionHandlesList(handlesFromUrl);
    const resolvedHandle = pickPreferredCollectionHandle(handlesFromUrl, collectionHandleParam || undefined);
    if (resolvedHandle) setCollectionHandle(resolvedHandle);
    else if (collectionHandleParam) setCollectionHandle(collectionHandleParam);
    if (defaultGenderParam !== null) setDefaultGender(normalizeDefaultGender(defaultGenderParam));
    if (collectionTypeParam !== null) {
      setCollectionTypeResolved(true);
      setIsFootwearCollection(normalizeFootwearCollectionType(collectionTypeParam));
    }
    if (shopNameParam) setStoreName(decodeURIComponent(shopNameParam));
    if (logoParam) setStoreLogo(logoParam);
    if (shoeModelParam) setShoeModelUrl(decodeURIComponent(shoeModelParam));
    if (shoeModelIosParam) setShoeModelIosUrl(decodeURIComponent(shoeModelIosParam));
    if (heroBackgroundParam) setTryonLayoutBackgroundImage(decodeURIComponent(heroBackgroundParam));

    const normalizedLanguage = normalizeWidgetLanguage(languageParam);
    if (normalizedLanguage) setStoreLanguage(normalizedLanguage);

    if (configParam) {
      try {
        const config = JSON.parse(decodeURIComponent(configParam));
        if (config.storeName) setStoreName(config.storeName);
        if (config.storeLogo && (!logoParam || logoParam.trim() === '')) setStoreLogo(config.storeLogo);
        if (config.primaryColor) setPrimaryColor(config.primaryColor);
        if (config.fontFamily) setFontFamily(config.fontFamily);
        if (config.productName || config.product_name) {
          setProductName(config.productName || config.product_name);
        }
        if (config.productDescription || config.product_description) {
          setProductDescription(config.productDescription || config.product_description);
        }
        if (config.publicId || config.public_id) {
          setPublicId(config.publicId || config.public_id);
        }
        if (config.collectionId && !collectionIdParam) setCollectionId(config.collectionId);
        if (config.collectionHandle && !collectionHandleParam) setCollectionHandle(config.collectionHandle);
        if (config.defaultGender !== undefined && !defaultGenderParam) {
          setDefaultGender(normalizeDefaultGender(config.defaultGender));
        }
        if (config.collectionType !== undefined) {
          setCollectionTypeResolved(true);
          setIsFootwearCollection(
            normalizeFootwearCollectionType(config.collectionType)
          );
        }
        if (config.shoeModelUrl && !shoeModelParam) setShoeModelUrl(config.shoeModelUrl);
        if (config.shoeModelIosUrl && !shoeModelIosParam) setShoeModelIosUrl(config.shoeModelIosUrl);
        const heroBg = config.tryonLayoutBackgroundImage || config.tryon_layout_background_image;
        if (typeof heroBg === 'string' && !heroBackgroundParam) setTryonLayoutBackgroundImage(heroBg.trim());

        const configLanguage = normalizeWidgetLanguage(
          config.adminLocale || config.admin_locale || config.language
        );
        if (configLanguage) setStoreLanguage(configLanguage);
      } catch (error) {
        console.error('Erro ao parsear config do widget de calçados:', error);
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'omafit-context' || event.data.type === 'omafit-config-update') {
        if (event.data.storeName) setStoreName(event.data.storeName);
        if (event.data.storeLogo) setStoreLogo(event.data.storeLogo);
        if (event.data.primaryColor) setPrimaryColor(event.data.primaryColor);
        if (event.data.fontFamily) setFontFamily(event.data.fontFamily);
        if (event.data.productImage) setProductImage(event.data.productImage);
        if (event.data.productName || event.data.product_name) {
          setProductName(event.data.productName || event.data.product_name);
        }
        if (event.data.productDescription || event.data.product_description) {
          setProductDescription(event.data.productDescription || event.data.product_description);
        }
        if (event.data.publicId || event.data.public_id) {
          setPublicId(event.data.publicId || event.data.public_id);
        }
        if (event.data.productId) setProductId(event.data.productId);
        if (event.data.shopDomain) setShopDomain(event.data.shopDomain);
        if (event.data.collectionId) setCollectionId(event.data.collectionId);
        if (event.data.collectionHandle !== undefined || event.data.collectionHandles !== undefined) {
          const list = parseCollectionHandlesFromMessage(event.data.collectionHandles);
          const resolved = pickPreferredCollectionHandle(
            list,
            event.data.collectionHandle !== undefined && event.data.collectionHandle !== null
              ? String(event.data.collectionHandle)
              : undefined
          );
          setCollectionHandle(resolved || '');
        }
        if (event.data.defaultGender !== undefined) {
          setDefaultGender(normalizeDefaultGender(event.data.defaultGender));
        }
        if (event.data.collectionType !== undefined) {
          setCollectionTypeResolved(true);
          setIsFootwearCollection(
            normalizeFootwearCollectionType(event.data.collectionType)
          );
        }
        if (event.data.shoeModelUrl) setShoeModelUrl(event.data.shoeModelUrl);
        if (event.data.shoeModelIosUrl) setShoeModelIosUrl(event.data.shoeModelIosUrl);
        const heroBg = event.data.tryon_layout_background_image ?? event.data.tryonLayoutBackgroundImage;
        if (typeof heroBg === 'string') setTryonLayoutBackgroundImage(heroBg.trim());
        if (event.data.productCatalog && typeof event.data.productCatalog === 'object') {
          const catalog = event.data.productCatalog as Partial<ProductCatalog>;
          setProductCatalog({
            sizes: Array.isArray(catalog.sizes) ? catalog.sizes.map((value) => String(value)) : [],
            colors: Array.isArray(catalog.colors) ? catalog.colors.map((value) => String(value)) : [],
            variants: Array.isArray(catalog.variants) ? catalog.variants : [],
          });
        }
        if (event.data.selectedVariantId !== undefined) {
          setSelectedVariantId(String(event.data.selectedVariantId || '').trim());
        }
        if (event.data.selectedVariantOptions && typeof event.data.selectedVariantOptions === 'object') {
          const normalizedOptions = Object.entries(event.data.selectedVariantOptions as Record<string, unknown>).reduce<Record<string, string>>(
            (acc, [key, value]) => {
              const normalizedKey = String(key || '').trim();
              const normalizedValue = String(value || '').trim();
              if (!normalizedKey || !normalizedValue) return acc;
              acc[normalizedKey] = normalizedValue;
              return acc;
            },
            {}
          );
          setSelectedVariantOptions(normalizedOptions);
        }

        const eventLanguage = normalizeWidgetLanguage(
          event.data.adminLocale || event.data.admin_locale || event.data.language
        );
        if (eventLanguage) setStoreLanguage(eventLanguage);

        const tl = event.data.tryon_layout ?? event.data.tryonLayout;
        if (tl === 'hero' || tl === 'sidebar' || tl === 'default') {
          setTryonSidebarChrome(tl === 'sidebar' || tl === 'hero');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div
      className={
        tryonSidebarChrome
          ? 'flex h-dvh min-h-0 flex-col overflow-hidden bg-transparent p-0'
          : 'flex min-h-screen items-center justify-center bg-transparent px-2 py-4 sm:p-4'
      }
      style={{ fontFamily: fontFamily || 'inherit' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={
          tryonSidebarChrome
            ? 'flex min-h-0 w-full flex-1 flex-col overflow-hidden'
            : 'max-h-[92vh] w-full overflow-auto sm:max-w-6xl'
        }
      >
        {!collectionTypeResolved ? (
          <div className="min-h-[240px] flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#810707]" />
          </div>
        ) : isFootwearCollection ? (
          <ShoeARWidget
            productImage={productImage}
            productId={productId}
            productName={productName}
            productDescription={productDescription}
            publicId={publicId}
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
            collectionHandles={collectionHandlesList}
            defaultGender={defaultGender}
            productCatalog={productCatalog}
            selectedVariantId={selectedVariantId}
            selectedVariantOptions={selectedVariantOptions}
            tryonLayoutOverride={undefined}
            tryonLayoutBackgroundImage={tryonLayoutBackgroundImage}
            onTryonLayoutChange={handleTryonLayoutChange}
          />
        ) : (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-xl">
            <h2 className="text-2xl font-semibold text-slate-900">Widget indisponível</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              O widget de calçados só pode ser exibido quando a coleção recebida for de calçados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
