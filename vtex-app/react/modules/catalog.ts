export type GarmentArea = 'upper' | 'lower' | 'full' | 'footwear' | 'unknown'

export type CategoryInfo = {
  leafName: string
  leafId: string
  handle: string
  handles: string[]
  title: string
  garmentArea: GarmentArea
}

export type CatalogVariant = {
  id: string
  title: string
  available: boolean
  options: Record<string, string>
  selectedOptions: Record<string, string>
  option1?: string
  option2?: string
  option3?: string
  price_amount: number | null
  seller: string
}

export type ProductCatalog = {
  sizes: string[]
  colors: string[]
  variants: CatalogVariant[]
}

export type VtexVariation = { name?: string; values?: string[] }
export type VtexSeller = {
  sellerId?: string
  sellerDefault?: boolean
  commertialOffer?: { AvailableQuantity?: number; Price?: number }
}
export type VtexSku = {
  itemId?: string
  name?: string
  images?: Array<{ imageUrl?: string }>
  variations?: VtexVariation[]
  sellers?: VtexSeller[]
}
export type VtexProductSnapshot = {
  productId?: string
  productName?: string
  description?: string
  linkText?: string
  categoryId?: string
  categories?: string[]
  categoryTree?: Array<{ id?: string | number; name?: string }>
  items?: VtexSku[]
}

const SIZE_NAME =
  /tamanho|size|talla|talle|taille|numero|numeracao|number|pointure/i
const COLOR_NAME = /cor\b|color|colour|couleur|farbe|estampa/i
const FOOTWEAR =
  /calcado|tenis|sapato|sandalia|chinelo|bota|shoe|sneaker|footwear|boot|sandal|zapato|zapatilla|calzado/i
const LOWER =
  /calca|pants|jeans|short|bermuda|saia|skirt|legging|pantalon|bottom/i
const FULL = /vestido|dress|macacao|jumpsuit|conjunto|one piece|enterizo/i

export function slugify(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function stripHtml(value: string): string {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000)
}

export function normalizeToken(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function variationValue(variation: VtexVariation | undefined): string {
  const values = variation?.values || []
  return String(values[0] || '').trim()
}

function optionKey(name: string): string {
  if (SIZE_NAME.test(name)) return 'Tamanho'
  if (COLOR_NAME.test(name)) return 'Cor'
  return name.trim() || 'Opção'
}

function pickSeller(sku: VtexSku): { seller: string; available: boolean; price: number | null } {
  const sellers = sku.sellers || []
  const withStock = sellers.find((seller) => Number(seller.commertialOffer?.AvailableQuantity) > 0)
  const preferred = withStock || sellers.find((seller) => seller.sellerDefault) || sellers[0]
  const quantity = Number(preferred?.commertialOffer?.AvailableQuantity)
  const price = preferred?.commertialOffer?.Price
  return {
    seller: String(preferred?.sellerId || '1'),
    available: Number.isFinite(quantity) ? quantity > 0 : true,
    price: typeof price === 'number' && Number.isFinite(price) ? price : null,
  }
}

export function inferGarmentArea(text: string): GarmentArea {
  const folded = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (FOOTWEAR.test(folded)) return 'footwear'
  if (FULL.test(folded)) return 'full'
  if (LOWER.test(folded)) return 'lower'
  if (folded.trim()) return 'upper'
  return 'unknown'
}

export function readCategory(product: VtexProductSnapshot): CategoryInfo {
  const tree = product.categoryTree || []
  const leaf = tree.length > 0 ? tree[tree.length - 1] : undefined
  const leafName = String(leaf?.name || '').trim()
  const leafId = String(leaf?.id || product.categoryId || '').trim()
  const names = tree.map((item) => String(item?.name || '').trim()).filter(Boolean)
  const pathNames = (product.categories || [])
    .flatMap((path) => String(path || '').split('/'))
    .map((part) => part.trim())
    .filter(Boolean)
  const title = (names.length > 0 ? names : pathNames).join(' > ')
  const handleSource = leafName || pathNames[pathNames.length - 1] || ''
  const handles = Array.from(
    new Set(
      [...names, ...pathNames, leafId]
        .map((item) => slugify(item))
        .filter(Boolean)
    )
  )
  return {
    leafName,
    leafId,
    handle: slugify(handleSource),
    handles,
    title,
    garmentArea: inferGarmentArea(`${title} ${product.productName || ''} ${product.linkText || ''}`),
  }
}

export function isCategoryExcluded(category: CategoryInfo, rawList: string): boolean {
  const tokens = rawList
    .split(/[,;\n]/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length >= 2)
  if (tokens.length === 0) return false
  const haystack = [
    category.leafName,
    category.leafId,
    category.handle,
    category.title,
    ...category.handles,
  ]
    .map((item) => item.toLowerCase())
    .filter(Boolean)
  return tokens.some((token) => haystack.some((value) => value === token || value.includes(token)))
}

function toVariant(product: VtexProductSnapshot, item: VtexSku, sizes: Set<string>, colors: Set<string>): CatalogVariant {
  const named: Record<string, string> = {}
  const ordered: string[] = []
  for (const variation of item.variations || []) {
    const rawName = String(variation.name || '').trim()
    const value = variationValue(variation)
    if (!rawName || !value) continue
    const key = optionKey(rawName)
    named[key] = value
    ordered.push(value)
    if (key === 'Tamanho') sizes.add(value)
    if (key === 'Cor') colors.add(value)
  }
  const offer = pickSeller(item)
  return {
    id: String(item.itemId),
    title: String(item.name || product.productName || ''),
    available: offer.available,
    options: named,
    selectedOptions: named,
    option1: ordered[0],
    option2: ordered[1],
    option3: ordered[2],
    price_amount: offer.price,
    seller: offer.seller,
  }
}

export function buildProductCatalog(
  product: VtexProductSnapshot,
  selectedItemId?: string
): ProductCatalog {
  const sizes = new Set<string>()
  const colors = new Set<string>()
  const items = (product.items || []).filter((item) => String(item.itemId || '').trim())
  const variants = items.map((item) => toVariant(product, item, sizes, colors))
  const selected = String(selectedItemId || '')
  const ordered = [...variants].sort((a, b) => {
    const aSelected = a.id === selected ? 1 : 0
    const bSelected = b.id === selected ? 1 : 0
    return bSelected - aSelected
  })
  return {
    sizes: Array.from(sizes),
    colors: Array.from(colors),
    variants: ordered,
  }
}

export function collectImageUrls(product: VtexProductSnapshot, selectedItemId?: string): string[] {
  const items = product.items || []
  const selected = items.find((item) => String(item.itemId) === String(selectedItemId || ''))
  const ordered = selected ? [selected, ...items.filter((item) => item !== selected)] : items
  const urls: string[] = []
  for (const item of ordered) {
    for (const image of item.images || []) {
      const url = String(image.imageUrl || '').trim()
      if (url && !urls.includes(url)) urls.push(url)
    }
  }
  return urls
}

export type CartRequest = {
  variantId?: string
  recommendedSize?: string
  quantity?: number
  selectedItemId?: string
}

export type CartResolution =
  | { ok: true; itemId: string; seller: string; quantity: number }
  | { ok: false; reason: 'unknown-sku' | 'unavailable' | 'no-match' }

function clampQuantity(value: number | undefined): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(5, Math.round(parsed)))
}

export function resolveCartTarget(
  catalog: ProductCatalog,
  request: CartRequest
): CartResolution {
  const quantity = clampQuantity(request.quantity)
  const variants = catalog.variants
  if (variants.length === 0) return { ok: false, reason: 'no-match' }

  const requestedId = String(request.variantId || '').trim()
  if (requestedId) {
    const match = variants.find((variant) => variant.id === requestedId)
    if (!match) return { ok: false, reason: 'unknown-sku' }
    if (!match.available) return { ok: false, reason: 'unavailable' }
    return { ok: true, itemId: match.id, seller: match.seller, quantity }
  }

  const sizeToken = normalizeToken(request.recommendedSize || '')
  const pool = sizeToken
    ? variants.filter((variant) => normalizeToken(variant.selectedOptions.Tamanho || '') === sizeToken)
    : variants
  if (pool.length === 0) return { ok: false, reason: 'no-match' }

  const selected = pool.find((variant) => variant.id === String(request.selectedItemId || ''))
  const available = pool.find((variant) => variant.available)
  const chosen = (selected && selected.available ? selected : available) || selected || pool[0]
  if (!chosen.available) return { ok: false, reason: 'unavailable' }
  return { ok: true, itemId: chosen.id, seller: chosen.seller, quantity }
}
