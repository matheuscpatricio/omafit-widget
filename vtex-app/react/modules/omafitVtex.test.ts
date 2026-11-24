import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildProductCatalog,
  collectImageUrls,
  isCategoryExcluded,
  readCategory,
  resolveCartTarget,
} from './catalog.ts'
import { toWidgetLocale } from './locale.ts'
import { adoptDeviceId, isTrustedWidgetSource, parseCartRequest, readOrCreateDeviceId } from './messages.ts'
import { canOpenWidget, normalizeSettings, resolveRuntimeSettings } from './settings.ts'
import { backendShopDomain, buildShopDomain } from './shopDomain.ts'
import { buildWidgetContext, buildWidgetUrl, encodeForSecondDecode } from './widgetUrl.ts'

const product = {
  productId: '10',
  productName: 'Camiseta 100% algodão',
  linkText: 'camiseta-algodao',
  description: '<p>Malha leve</p>',
  categoryId: '20',
  categoryTree: [
    { id: 2, name: 'Roupas' },
    { id: 20, name: 'Camisetas' },
  ],
  items: [
    {
      itemId: '101',
      name: 'Preto P',
      images: [{ imageUrl: 'https://cdn.example/p.jpg' }, { imageUrl: 'https://cdn.example/p2.jpg' }],
      variations: [
        { name: 'Cor', values: ['Preto'] },
        { name: 'Tamanho', values: ['P'] },
      ],
      sellers: [{ sellerId: '1', commertialOffer: { AvailableQuantity: 3, Price: 99 } }],
    },
    {
      itemId: '102',
      name: 'Preto M',
      images: [{ imageUrl: 'https://cdn.example/m.jpg' }],
      variations: [
        { name: 'Cor', values: ['Preto'] },
        { name: 'Tamanho', values: ['M'] },
      ],
      sellers: [{ sellerId: '1', commertialOffer: { AvailableQuantity: 0, Price: 99 } }],
    },
    {
      itemId: '103',
      name: 'Branco M',
      images: [{ imageUrl: 'https://cdn.example/m.jpg' }],
      variations: [
        { name: 'Color', values: ['Branco'] },
        { name: 'Size', values: ['M'] },
      ],
      sellers: [{ sellerId: '2', sellerDefault: true, commertialOffer: { AvailableQuantity: 4, Price: 89 } }],
    },
  ],
}

test('shop domain survives the try-on path strip', () => {
  const domain = buildShopDomain('Minha Loja_01')
  assert.equal(domain, 'minhaloja01.myvtex.com')
  assert.equal(backendShopDomain(domain), domain)
  assert.equal(buildShopDomain(''), '')
})

test('locale maps pt-BR, en-US and es-AR', () => {
  assert.equal(toWidgetLocale('pt-BR'), 'pt')
  assert.equal(toWidgetLocale('en-US'), 'en')
  assert.equal(toWidgetLocale('es-AR'), 'es')
  assert.equal(toWidgetLocale(''), 'pt')
})

test('settings accept the public id and reject the private-looking placeholder', () => {
  const ok = normalizeSettings({
    publicId: 'wgt_pub_abc123def456',
    primaryColor: '#fff',
    ctaType: 'button',
    widgetEnabled: 'true',
  })
  assert.equal(ok.issues.length, 0)
  assert.equal(ok.settings.primaryColor, '#fff')
  assert.equal(ok.settings.ctaType, 'button')
  assert.equal(canOpenWidget(ok.settings), true)

  const bad = normalizeSettings({ publicId: 'wgt_pub_default', widgetBaseUrl: 'http://omafit.co/widget' })
  assert.equal(bad.issues.some((issue) => issue.code === 'public-id'), true)
  assert.equal(bad.issues.some((issue) => issue.code === 'url'), true)
  assert.equal(canOpenWidget(bad.settings), false)
})

test('site editor public id overrides an empty app setting', () => {
  const settings = resolveRuntimeSettings({ message: JSON.stringify({ widgetEnabled: true }) }, {
    publicId: 'wgt_pub_fromeditor01',
    linkText: 'Provar',
  })
  assert.equal(settings.publicId, 'wgt_pub_fromeditor01')
  assert.equal(settings.linkText, 'Provar')
})

test('catalog exposes sizes, colors and the selected sku first', () => {
  const catalog = buildProductCatalog(product, '103')
  assert.deepEqual(catalog.sizes, ['P', 'M'])
  assert.deepEqual(catalog.colors, ['Preto', 'Branco'])
  assert.equal(catalog.variants[0]?.id, '103')
  assert.equal(catalog.variants[0]?.selectedOptions.Tamanho, 'M')
  assert.equal(catalog.variants[0]?.seller, '2')
  const images = collectImageUrls(product, '101')
  assert.equal(images[0], 'https://cdn.example/p.jpg')
  assert.equal(new Set(images).size, images.length)
})

test('cart keeps the selected color and only adds a sku of this product', () => {
  const catalog = buildProductCatalog(product, '101')
  const otherColor = resolveCartTarget(catalog, { recommendedSize: 'M', selectedItemId: '101' })
  assert.equal(otherColor.ok, false)
  if (!otherColor.ok) assert.equal(otherColor.reason, 'unavailable')
  const requestedColor = resolveCartTarget(catalog, {
    recommendedSize: 'M',
    selectedItemId: '101',
    selectedOptions: { Cor: 'Branco', Tamanho: 'M' },
  })
  assert.equal(requestedColor.ok && requestedColor.itemId, '103')
  const explicit = resolveCartTarget(catalog, { variantId: '101' })
  assert.equal(explicit.ok && explicit.itemId, '101')
  const foreign = resolveCartTarget(catalog, { variantId: '999' })
  assert.equal(foreign.ok, false)
  if (!foreign.ok) assert.equal(foreign.reason, 'unknown-sku')
  const soldOut = resolveCartTarget(catalog, { variantId: '102' })
  assert.equal(soldOut.ok, false)
})

test('category slug and exclusion', () => {
  const category = readCategory(product)
  assert.equal(category.handle, 'camisetas')
  assert.equal(category.garmentArea, 'upper')
  assert.equal(isCategoryExcluded(category, 'camisetas'), true)
  assert.equal(isCategoryExcluded(category, 'a, sapatos'), false)
  const shoes = readCategory({
    productName: 'Tênis runner',
    categoryTree: [{ name: 'Calçados' }],
  })
  assert.equal(shoes.garmentArea, 'footwear')
  assert.equal(shoes.handle, 'calcados')
})

test('widget url carries the product contract and double-encodes the name', () => {
  const category = readCategory(product)
  const href = buildWidgetUrl({
    baseUrl: 'https://omafit.co/widget',
    entry: 'tryon',
    publicId: 'wgt_pub_abc123def456',
    shopDomain: 'loja.myvtex.com',
    storeName: 'Loja',
    locale: 'pt',
    productId: '10',
    productName: 'Camiseta 100% algodão',
    productHandle: 'camiseta-algodao',
    productImage: 'https://cdn.example/p.jpg',
    primaryColor: '#810707',
    tryonLayout: 'sidebar',
    collectionHandle: category.handle,
    collectionHandles: category.handles,
    collectionId: category.leafId,
    collectionType: 'upper',
    defaultGender: 'unisex',
    account: 'loja',
  })
  const url = new URL(href)
  assert.equal(url.origin + url.pathname, 'https://omafit.co/widget')
  assert.equal(url.searchParams.get('platform'), 'vtex')
  assert.equal(url.searchParams.get('shopDomain'), 'loja.myvtex.com')
  assert.equal(url.searchParams.get('publicId'), 'wgt_pub_abc123def456')
  assert.equal(
    decodeURIComponent(url.searchParams.get('productName') || ''),
    'Camiseta 100% algodão'
  )
  assert.equal(url.searchParams.get('productName'), encodeForSecondDecode('Camiseta 100% algodão'))
  assert.equal(url.searchParams.get('collectionHandle'), 'camisetas')
  assert.equal(url.searchParams.get('tryonLayout'), 'sidebar')

  const footwear = new URL(
    buildWidgetUrl({
      baseUrl: 'https://omafit.co/widget/',
      entry: 'footwear-ar',
      publicId: 'wgt_pub_abc123def456',
      shopDomain: 'loja.myvtex.com',
      storeName: '',
      locale: 'es',
      productId: '1',
      productName: 'Zapato',
      productHandle: 'zapato',
      productImage: '',
      primaryColor: '#000',
      tryonLayout: 'default',
      collectionHandle: '',
      collectionHandles: [],
      collectionId: '',
      collectionType: '',
      defaultGender: '',
      account: 'loja',
    })
  )
  assert.equal(footwear.pathname, '/widget-shoes')
  assert.equal(footwear.searchParams.get('language'), 'es')
})

test('context payload includes sku sizes for the iframe', () => {
  const catalog = buildProductCatalog(product, '101')
  const category = readCategory(product)
  const payload = buildWidgetContext({
    url: {
      baseUrl: 'https://omafit.co/widget',
      entry: 'tryon',
      publicId: 'wgt_pub_abc123def456',
      shopDomain: 'loja.myvtex.com',
      storeName: 'Loja',
      locale: 'en',
      productId: '10',
      productName: product.productName,
      productHandle: product.linkText,
      productImage: 'https://cdn.example/p.jpg',
      primaryColor: '#810707',
      tryonLayout: 'default',
      collectionHandle: category.handle,
      collectionHandles: category.handles,
      collectionId: category.leafId,
      collectionType: 'upper',
      defaultGender: '',
      account: 'loja',
    },
    images: collectImageUrls(product, '101'),
    description: 'Malha leve',
    catalog,
    selectedItemId: '101',
    deviceId: 'device-1',
    categoryTitle: category.title,
  })
  assert.equal(payload.type, 'omafit-context')
  assert.deepEqual(payload.sizes, ['P', 'M'])
  assert.equal(payload.selectedVariantId, '101')
  assert.equal(payload.productImages.length, 3)
})

test('cart and device messages are parsed and the iframe source is checked', () => {
  const parsed = parseCartRequest({
    type: 'omafit-add-to-cart-request',
    requestId: 'cart_1',
    quantity: 2,
    selection: {
      selected_variant_id: '101',
      recommended_size: 'P',
      selected_options: { Cor: 'Preto', Tamanho: 'P' },
    },
  })
  assert.equal(parsed?.variantId, '101')
  assert.equal(parsed?.quantity, 2)
  assert.equal(parsed?.selectedOptions.Cor, 'Preto')
  assert.equal(parseCartRequest({ type: 'other' }), null)

  const iframe = { name: 'frame' }
  assert.equal(
    isTrustedWidgetSource(
      { origin: 'https://omafit.co', source: iframe },
      { origin: 'https://omafit.co', source: iframe }
    ),
    true
  )
  assert.equal(
    isTrustedWidgetSource(
      { origin: 'https://evil.example', source: iframe },
      { origin: 'https://omafit.co', source: iframe }
    ),
    false
  )

  const bag = new Map<string, string>()
  const storage = {
    getItem: (key: string) => bag.get(key) ?? null,
    setItem: (key: string, value: string) => {
      bag.set(key, value)
    },
  }
  const created = readOrCreateDeviceId(storage)
  assert.equal(readOrCreateDeviceId(storage), created)
  adoptDeviceId(storage, 'from-iframe')
  assert.equal(readOrCreateDeviceId(storage), 'from-iframe')
})
