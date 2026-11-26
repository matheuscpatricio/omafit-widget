export type VtexCatalogCandidate = {
  handle: string
  title: string
  url: string
  image_url: string
  product_type?: string
  price_amount?: number | null
  currency_code?: string | null
  in_stock?: boolean
}

export type VtexParentProduct = {
  id: string
  handle: string
  title: string
  product_type: string
  url: string
  images: string[]
  image_url: string
  catalog: {
    sizes: string[]
    colors: string[]
    variants: Array<{
      id: string
      title: string
      available: boolean
      selectedOptions: Record<string, string>
      seller: string
    }>
  }
  collection_handles: string[]
}

type RawSeller = {
  sellerId?: string
  commertialOffer?: { Price?: number; AvailableQuantity?: number }
}

type RawSku = {
  itemId?: string
  name?: string
  images?: Array<{ imageUrl?: string }>
  variations?: Array<{ name?: string; values?: string[] }>
  sellers?: RawSeller[]
}

type RawProduct = {
  productId?: string | number
  productName?: string
  linkText?: string
  categories?: string[]
  items?: RawSku[]
}

const SIZE_NAME = /tamanho|size|talla|talle|numero|numeracao/i
const COLOR_NAME = /cor\b|color|colour/i

function optionKey(name: string): string {
  if (SIZE_NAME.test(name)) return 'Tamanho'
  if (COLOR_NAME.test(name)) return 'Cor'
  return name.trim() || 'Opção'
}

function productUrl(origin: string, handle: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/${handle}/p`
}

function mapProduct(product: RawProduct, origin: string): VtexParentProduct | null {
  const handle = String(product.linkText || '').trim()
  const id = String(product.productId || '').trim()
  if (!handle || !id) return null
  const sizes = new Set<string>()
  const colors = new Set<string>()
  const images: string[] = []
  const variants = (product.items || [])
    .filter((item) => String(item.itemId || '').trim())
    .map((item) => {
      const selectedOptions: Record<string, string> = {}
      for (const variation of item.variations || []) {
        const value = String(variation.values?.[0] || '').trim()
        const name = String(variation.name || '').trim()
        if (!name || !value) continue
        const key = optionKey(name)
        selectedOptions[key] = value
        if (key === 'Tamanho') sizes.add(value)
        if (key === 'Cor') colors.add(value)
      }
      for (const image of item.images || []) {
        const url = String(image.imageUrl || '').trim()
        if (url && !images.includes(url)) images.push(url)
      }
      const seller =
        (item.sellers || []).find((entry) => Number(entry.commertialOffer?.AvailableQuantity) > 0) ||
        item.sellers?.[0]
      const quantity = Number(seller?.commertialOffer?.AvailableQuantity)
      return {
        id: String(item.itemId),
        title: String(item.name || product.productName || ''),
        available: Number.isFinite(quantity) ? quantity > 0 : true,
        selectedOptions,
        seller: String(seller?.sellerId || '1'),
      }
    })
  const handles = (product.categories || [])
    .flatMap((path) => String(path || '').split('/'))
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  return {
    id,
    handle,
    title: String(product.productName || handle),
    product_type: handles[handles.length - 1] || '',
    url: productUrl(origin, handle),
    images,
    image_url: images[0] || '',
    catalog: { sizes: Array.from(sizes), colors: Array.from(colors), variants },
    collection_handles: Array.from(new Set(handles)),
  }
}

export function mapVtexSearchHits(
  raw: unknown,
  excludeHandle: string,
  origin: string
): { candidates: VtexCatalogCandidate[]; products: VtexParentProduct[] } {
  const list = Array.isArray(raw) ? (raw as RawProduct[]) : []
  const excluded = excludeHandle.trim().toLowerCase()
  const products = list
    .map((item) => mapProduct(item, origin))
    .filter((item): item is VtexParentProduct => Boolean(item))
    .filter((item) => item.handle.toLowerCase() !== excluded)
    .slice(0, 8)
  return {
    products,
    candidates: products.map((product) => ({
      handle: product.handle,
      title: product.title,
      url: product.url,
      image_url: product.image_url,
      product_type: product.product_type,
      in_stock: product.catalog.variants.some((variant) => variant.available),
      price_amount: null,
      currency_code: null,
    })),
  }
}

export function findVtexProductByHandle(
  raw: unknown,
  handle: string,
  origin: string
): VtexParentProduct | null {
  const wanted = handle.trim().toLowerCase()
  const list = Array.isArray(raw) ? (raw as RawProduct[]) : []
  const mapped = list
    .map((item) => mapProduct(item, origin))
    .filter((item): item is VtexParentProduct => Boolean(item))
  return mapped.find((item) => item.handle.toLowerCase() === wanted) || mapped[0] || null
}

export async function searchStoreCatalog(query: string, excludeHandle: string, origin: string) {
  const term = query.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'roupa'
  const response = await fetch(
    `/api/catalog_system/pub/products/search/${encodeURIComponent(term)}?_from=0&_to=15`
  )
  if (!response.ok) {
    return { candidates: [], products: [], error: `http_${response.status}` }
  }
  const json: unknown = await response.json()
  return { ...mapVtexSearchHits(json, excludeHandle, origin), error: null as string | null }
}

export async function loadStoreProduct(handle: string, origin: string) {
  const response = await fetch(
    `/api/catalog_system/pub/products/search/${encodeURIComponent(handle)}?_from=0&_to=11`
  )
  if (!response.ok) return { product: null, error: `http_${response.status}` }
  const json: unknown = await response.json()
  return { product: findVtexProductByHandle(json, handle, origin), error: null as string | null }
}
