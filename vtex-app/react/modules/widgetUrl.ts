import { FOOTWEAR_WIDGET_PATH } from './constants'
import type { WidgetEntry } from './settings'
import type { ProductCatalog } from './catalog'
import type { WidgetLocale } from './locale'

export type WidgetUrlInput = {
  baseUrl: string
  entry: WidgetEntry
  publicId: string
  shopDomain: string
  storeName: string
  locale: WidgetLocale
  productId: string
  productName: string
  productHandle: string
  productImage: string
  primaryColor: string
  tryonLayout: 'default' | 'hero' | 'sidebar'
  collectionHandle: string
  collectionHandles: string[]
  collectionId: string
  collectionType: '' | 'upper' | 'lower' | 'full'
  defaultGender: '' | 'male' | 'female' | 'unisex'
  account: string
}

/**
 * `WidgetPage` chama `decodeURIComponent` de novo em nome, handle e nome da loja
 * depois do decode do `URLSearchParams`. Codificamos duas vezes para o `%` do
 * nome sobreviver.
 */
export function encodeForSecondDecode(value: string): string {
  return encodeURIComponent(value)
}

export function resolveWidgetBase(baseUrl: string, entry: WidgetEntry): URL {
  const url = new URL(baseUrl)
  if (entry === 'footwear-ar') {
    if (/\/widget\/?$/.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/widget\/?$/, FOOTWEAR_WIDGET_PATH)
    } else if (!url.pathname.endsWith(FOOTWEAR_WIDGET_PATH)) {
      url.pathname = `${url.pathname.replace(/\/$/, '')}${FOOTWEAR_WIDGET_PATH}`
    }
  }
  url.search = ''
  url.hash = ''
  return url
}

export function buildWidgetUrl(input: WidgetUrlInput): string {
  const url = resolveWidgetBase(input.baseUrl, input.entry)
  const set = (key: string, value: string) => {
    if (value) url.searchParams.set(key, value)
  }
  set('platform', 'vtex')
  set('store_id', input.account)
  set('publicId', input.publicId)
  set('public_id', input.publicId)
  set('shopDomain', input.shopDomain)
  set('shop_domain', input.shopDomain)
  set('productId', input.productId)
  set('product_id', input.productId)
  set('productName', encodeForSecondDecode(input.productName))
  set('product_name', input.productName)
  set('productHandle', encodeForSecondDecode(input.productHandle))
  set('product_handle', input.productHandle)
  set('productImage', input.productImage)
  set('product_image', input.productImage)
  set('language', input.locale)
  set('locale', input.locale)
  set('storeLanguage', input.locale)
  set('adminLocale', input.locale)
  set('shopName', encodeForSecondDecode(input.storeName))
  set('storeName', encodeForSecondDecode(input.storeName))
  set('primaryColor', input.primaryColor)
  set('primary_color', input.primaryColor)
  set('tryon_layout', input.tryonLayout)
  set('tryonLayout', input.tryonLayout)
  set('collectionHandle', input.collectionHandle)
  set('collectionHandles', input.collectionHandles.join(','))
  set('collectionId', input.collectionId)
  set('collectionType', input.collectionType)
  set('defaultGender', input.defaultGender)
  return url.toString()
}

export function widgetOrigin(baseUrl: string): string {
  return new URL(baseUrl).origin
}

export type WidgetContextPayload = {
  type: 'omafit-context'
  platform: 'vtex'
  language: WidgetLocale
  locale: WidgetLocale
  storeLanguage: WidgetLocale
  shopDomain: string
  shop_domain: string
  publicId: string
  shopName: string
  storeName: string
  productId: string
  productName: string
  product_name: string
  productHandle: string
  product_handle: string
  productImage: string
  productImages: string[]
  product_images: string[]
  productDescription: string
  product_description: string
  collectionHandle: string
  collectionHandles: string[]
  collectionTitle: string
  collectionId: string
  collectionType: string
  defaultGender: string
  tryon_layout: string
  tryonLayout: string
  primaryColor: string
  productCatalog: ProductCatalog
  sizes: string[]
  colors: string[]
  variants: ProductCatalog['variants']
  selectedVariantId: string
  selectedVariantOptions: Record<string, string>
  omafitDeviceId: string
}

export function buildWidgetContext(input: {
  url: WidgetUrlInput
  images: string[]
  description: string
  catalog: ProductCatalog
  selectedItemId: string
  deviceId: string
  categoryTitle: string
}): WidgetContextPayload {
  const selected =
    input.catalog.variants.find((variant) => variant.id === input.selectedItemId) ||
    input.catalog.variants[0]
  return {
    type: 'omafit-context',
    platform: 'vtex',
    language: input.url.locale,
    locale: input.url.locale,
    storeLanguage: input.url.locale,
    shopDomain: input.url.shopDomain,
    shop_domain: input.url.shopDomain,
    publicId: input.url.publicId,
    shopName: input.url.storeName,
    storeName: input.url.storeName,
    productId: input.url.productId,
    productName: input.url.productName,
    product_name: input.url.productName,
    productHandle: input.url.productHandle,
    product_handle: input.url.productHandle,
    productImage: input.images[0] || input.url.productImage,
    productImages: input.images,
    product_images: input.images,
    productDescription: input.description,
    product_description: input.description,
    collectionHandle: input.url.collectionHandle,
    collectionHandles: input.url.collectionHandles,
    collectionTitle: input.categoryTitle,
    collectionId: input.url.collectionId,
    collectionType: input.url.collectionType,
    defaultGender: input.url.defaultGender,
    tryon_layout: input.url.tryonLayout,
    tryonLayout: input.url.tryonLayout,
    primaryColor: input.url.primaryColor,
    productCatalog: input.catalog,
    sizes: input.catalog.sizes,
    colors: input.catalog.colors,
    variants: input.catalog.variants,
    selectedVariantId: selected?.id || '',
    selectedVariantOptions: selected?.selectedOptions || {},
    omafitDeviceId: input.deviceId,
  }
}
