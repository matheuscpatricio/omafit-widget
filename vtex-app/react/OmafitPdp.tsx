import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { useCssHandles } from 'vtex.css-handles'
import { useOrderItems } from 'vtex.order-items/OrderItems'
import { useProduct } from 'vtex.product-context'
import { useRuntime } from 'vtex.render-runtime'

import {
  buildProductCatalog,
  collectImageUrls,
  isCategoryExcluded,
  readCategory,
  resolveCartTarget,
  stripHtml,
  type VtexProductSnapshot,
} from './modules/catalog'
import { OMAFIT_APP_ID } from './modules/constants'
import { toWidgetLocale } from './modules/locale'
import {
  adoptDeviceId,
  isTrustedWidgetSource,
  parseCartRequest,
  parseDeviceAdopt,
  readOrCreateDeviceId,
} from './modules/messages'
import { canOpenWidget, resolveRuntimeSettings, safePrimaryColor } from './modules/settings'
import { buildShopDomain } from './modules/shopDomain'
import { buildWidgetContext, buildWidgetUrl, widgetOrigin } from './modules/widgetUrl'
import { loadStoreProduct, searchStoreCatalog, type VtexParentProduct } from './modules/vtexCatalog'

const CSS_HANDLES = [
  'container',
  'cta',
  'ctaLink',
  'ctaButton',
  'overlay',
  'dialog',
  'close',
  'frame',
] as const

type Props = {
  publicId?: string
  linkText?: string
}

const CART_MESSAGE: Record<'added' | 'unavailable' | 'unknownSku' | 'failed', string> = {
  added: 'store/omafit.cart.added',
  unavailable: 'store/omafit.cart.unavailable',
  unknownSku: 'store/omafit.cart.unknownSku',
  failed: 'store/omafit.cart.failed',
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export default function OmafitPdp({ publicId, linkText }: Props) {
  const intl = useIntl()
  const { handles } = useCssHandles(CSS_HANDLES)
  const productContext = useProduct()
  const runtime = useRuntime()
  const { addItems } = useOrderItems()
  const [open, setOpen] = useState(false)
  const [titleId] = useState(
    () => `omafit-dialog-${Math.random().toString(36).slice(2, 10)}`
  )
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const extraSkus = useRef<Map<string, string>>(new Map())
  const product = productContext?.product
  const selectedItem = productContext?.selectedItem

  const settings = resolveRuntimeSettings(runtime.getSettings?.(OMAFIT_APP_ID), {
    publicId,
    linkText,
  })
  const locale = toWidgetLocale(runtime.culture?.locale)
  const shopDomain = buildShopDomain(runtime.account)
  const snapshot = product as VtexProductSnapshot | null | undefined
  const category = useMemo(
    () => (snapshot ? readCategory(snapshot) : null),
    [snapshot]
  )
  const catalog = useMemo(
    () => (snapshot ? buildProductCatalog(snapshot, selectedItem?.itemId) : null),
    [snapshot, selectedItem?.itemId]
  )
  const images = useMemo(
    () => (snapshot ? collectImageUrls(snapshot, selectedItem?.itemId) : []),
    [snapshot, selectedItem?.itemId]
  )

  const excluded = category ? isCategoryExcluded(category, settings.excludedCategories) : false
  const visible =
    Boolean(snapshot?.productId) &&
    Boolean(shopDomain) &&
    Boolean(category) &&
    canOpenWidget(settings) &&
    !excluded

  const widgetUrl = useMemo(() => {
    if (!visible || !snapshot || !category || !catalog) return ''
    const area = category.garmentArea
    const collectionType = area === 'upper' || area === 'lower' || area === 'full' ? area : ''
    return buildWidgetUrl({
      baseUrl: settings.widgetBaseUrl,
      entry: settings.entry,
      publicId: settings.publicId,
      shopDomain,
      storeName: settings.storeName || runtime.account || '',
      locale,
      productId: String(snapshot.productId || ''),
      productName: String(snapshot.productName || ''),
      productHandle: String(snapshot.linkText || ''),
      productImage: images[0] || '',
      primaryColor: safePrimaryColor(settings.primaryColor),
      tryonLayout: settings.tryonLayout,
      collectionHandle: category.handle,
      collectionHandles: category.handles,
      collectionId: category.leafId,
      collectionType,
      defaultGender: settings.defaultGender,
      account: String(runtime.account || ''),
    })
  }, [
    visible,
    snapshot,
    category,
    catalog,
    settings.widgetBaseUrl,
    settings.entry,
    settings.publicId,
    settings.storeName,
    settings.primaryColor,
    settings.tryonLayout,
    settings.defaultGender,
    shopDomain,
    runtime.account,
    locale,
    images,
  ])

  const postContext = useCallback(() => {
    const frame = frameRef.current?.contentWindow
    if (!frame || !snapshot || !category || !catalog || !widgetUrl) return
    const storage = browserStorage()
    const deviceId = storage ? readOrCreateDeviceId(storage) : ''
    const area = category.garmentArea
    const payload = buildWidgetContext({
      url: {
        baseUrl: settings.widgetBaseUrl,
        entry: settings.entry,
        publicId: settings.publicId,
        shopDomain,
        storeName: settings.storeName || runtime.account || '',
        locale,
        productId: String(snapshot.productId || ''),
        productName: String(snapshot.productName || ''),
        productHandle: String(snapshot.linkText || ''),
        productImage: images[0] || '',
        primaryColor: safePrimaryColor(settings.primaryColor),
        tryonLayout: settings.tryonLayout,
        collectionHandle: category.handle,
        collectionHandles: category.handles,
        collectionId: category.leafId,
        collectionType: area === 'upper' || area === 'lower' || area === 'full' ? area : '',
        defaultGender: settings.defaultGender,
        account: String(runtime.account || ''),
      },
      images,
      description: stripHtml(String(snapshot.description || '')),
      catalog,
      selectedItemId: String(selectedItem?.itemId || ''),
      deviceId,
      categoryTitle: category.title,
    })
    const origin = widgetOrigin(settings.widgetBaseUrl)
    frame.postMessage(payload, origin)
    frame.postMessage({ ...payload, type: 'omafit-config-update' }, origin)
  }, [
    snapshot,
    category,
    catalog,
    widgetUrl,
    settings.widgetBaseUrl,
    settings.entry,
    settings.publicId,
    settings.storeName,
    settings.primaryColor,
    settings.tryonLayout,
    settings.defaultGender,
    shopDomain,
    runtime.account,
    locale,
    images,
    selectedItem?.itemId,
  ])

  useEffect(() => {
    if (!open) return undefined
    const origin = widgetOrigin(settings.widgetBaseUrl)
    const timers = [300, 1000].map((delay) => window.setTimeout(postContext, delay))
    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current?.contentWindow
      if (!frame || !isTrustedWidgetSource(event, { origin, source: frame })) return
      const storage = browserStorage()
      const adopted = parseDeviceAdopt(event.data)
      if (adopted && storage) {
        adoptDeviceId(storage, adopted)
        return
      }
      const data = event.data as { type?: string; requestId?: string; query?: string; excludeHandle?: string; handle?: string }
      if (data?.type === 'omafit-vtex-catalog-search' || data?.type === 'omafit-vtex-product-by-handle') {
        const requestId = String(data.requestId || '')
        const replyCatalog = (payload: Record<string, unknown>) => {
          frame.postMessage(payload, origin)
        }
        const remember = (product: VtexParentProduct | null) => {
          for (const variant of product?.catalog.variants || []) {
            if (variant.id) extraSkus.current.set(variant.id, variant.seller || '1')
          }
        }
        if (data.type === 'omafit-vtex-catalog-search') {
          searchStoreCatalog(String(data.query || ''), String(data.excludeHandle || ''), window.location.origin)
            .then((found) => {
              found.products.forEach(remember)
              replyCatalog({
                type: 'omafit-vtex-catalog-search-result',
                requestId,
                candidates: found.candidates,
                error: found.error,
              })
            })
            .catch(() =>
              replyCatalog({
                type: 'omafit-vtex-catalog-search-result',
                requestId,
                candidates: [],
                error: 'vtex_search_failed',
              })
            )
          return
        }
        loadStoreProduct(String(data.handle || ''), window.location.origin)
          .then((found) => {
            remember(found.product)
            replyCatalog({
              type: 'omafit-vtex-product-by-handle-result',
              requestId,
              product: found.product,
              error: found.error,
            })
          })
          .catch(() =>
            replyCatalog({
              type: 'omafit-vtex-product-by-handle-result',
              requestId,
              product: null,
              error: 'vtex_search_failed',
            })
          )
        return
      }
      const request = parseCartRequest(event.data)
      if (!request || !catalog) return
      const reply = (ok: boolean, messageId: keyof typeof CART_MESSAGE) => {
        frame.postMessage(
          {
            type: 'omafit-add-to-cart-result',
            ok,
            requestId: request.requestId,
            message: intl.formatMessage({ id: CART_MESSAGE[messageId] }),
          },
          origin
        )
      }
      const target = resolveCartTarget(catalog, {
        variantId: request.variantId,
        recommendedSize: request.recommendedSize,
        quantity: request.quantity,
        selectedItemId: String(selectedItem?.itemId || ''),
        selectedOptions: request.selectedOptions,
      })
      const suggestedSeller = extraSkus.current.get(request.variantId)
      if (!target.ok && target.reason === 'unknown-sku' && suggestedSeller && request.variantId) {
        const quantity = Math.max(1, Math.min(5, Math.round(Number(request.quantity) || 1)))
        addItems([{ id: request.variantId, quantity, seller: suggestedSeller }])
          .then(() => reply(true, 'added'))
          .catch(() => reply(false, 'failed'))
        return
      }
      if (!target.ok) {
        reply(false, target.reason === 'unknown-sku' ? 'unknownSku' : 'unavailable')
        return
      }
      addItems([{ id: target.itemId, quantity: target.quantity, seller: target.seller }])
        .then(() => reply(true, 'added'))
        .catch(() => reply(false, 'failed'))
    }
    window.addEventListener('message', onMessage)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener('message', onMessage)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, postContext, settings.widgetBaseUrl, catalog, selectedItem?.itemId, addItems, intl])

  if (!visible) return null

  const label =
    settings.linkText ||
    intl.formatMessage({
      id: settings.entry === 'footwear-ar' ? 'store/omafit.cta.footwear' : 'store/omafit.cta',
    })
  const color = safePrimaryColor(settings.primaryColor)
  const mobile = Boolean(runtime.hints?.mobile)

  return (
    <div className={handles.container}>
      <style>{`
        .${handles.container} { margin: 12px 0; }
        .${handles.ctaLink}, .${handles.ctaButton} {
          font: inherit;
          cursor: pointer;
          width: 100%;
          text-align: center;
        }
        .${handles.ctaLink} {
          background: transparent;
          border: 0;
          padding: 4px 0;
          text-decoration: underline;
          text-underline-offset: 3px;
          font-weight: 600;
        }
        .${handles.ctaButton} {
          background: #fff;
          border-style: solid;
          border-width: 2px;
          padding: 12px 22px;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.25;
        }
        .${handles.overlay} {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: ${mobile ? '0' : '20px'};
        }
        .${handles.dialog} {
          position: relative;
          width: ${mobile ? '100%' : 'min(1000px, 95vw)'};
          height: ${mobile ? '100%' : 'min(800px, 85vh)'};
          background: #fff;
          border-radius: ${mobile ? '0' : '16px'};
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .${handles.close} {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 2;
          border: 0;
          border-radius: 999px;
          background: #fff;
          width: 36px;
          height: 36px;
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
        }
        .${handles.frame} { flex: 1; width: 100%; border: 0; background: #fff; }
      `}</style>
      <button
        type="button"
        className={settings.ctaType === 'button' ? handles.ctaButton : handles.ctaLink}
        style={
          settings.ctaType === 'button'
            ? { color, borderColor: color, borderRadius: settings.ctaBorderRadius }
            : { color }
        }
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open ? (
        <div
          className={handles.overlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div
            className={handles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <p id={titleId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
              {intl.formatMessage({ id: 'store/omafit.dialogLabel' })}
            </p>
            <button
              type="button"
              className={handles.close}
              aria-label={intl.formatMessage({ id: 'store/omafit.close' })}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <iframe
              ref={frameRef}
              className={handles.frame}
              src={widgetUrl}
              title={intl.formatMessage({ id: 'store/omafit.iframeTitle' })}
              allow="camera; microphone; fullscreen"
              onLoad={postContext}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
