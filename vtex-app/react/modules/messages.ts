const DEVICE_KEY = 'omafit_device_id'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function readOrCreateDeviceId(storage: StorageLike): string {
  const current = String(storage.getItem(DEVICE_KEY) || '').trim()
  if (current) return current
  const created = randomId()
  storage.setItem(DEVICE_KEY, created)
  return created
}

export function adoptDeviceId(storage: StorageLike, deviceId: string): void {
  const next = String(deviceId || '').trim()
  if (!next || next.length > 128) return
  storage.setItem(DEVICE_KEY, next)
}

export function parseDeviceAdopt(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  if (record.type !== 'omafit-device-id-adopt') return null
  const id = String(record.deviceId || record.omafit_device_id || '').trim()
  return id || null
}

export type ParsedCartRequest = {
  requestId: string
  variantId: string
  recommendedSize: string
  quantity: number
}

export function parseCartRequest(data: unknown): ParsedCartRequest | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  if (record.type !== 'omafit-add-to-cart-request') return null
  const selection = (record.selection || {}) as Record<string, unknown>
  const quantity = Number(record.quantity)
  return {
    requestId: String(record.requestId || '').trim(),
    variantId: String(
      selection.selected_variant_id || selection.variant_id || record.variantId || ''
    ).trim(),
    recommendedSize: String(
      selection.recommended_size || selection.recommended_size_label || ''
    ).trim(),
    quantity: Number.isFinite(quantity) ? quantity : 1,
  }
}

export function isTrustedWidgetSource(
  event: { origin: string; source: unknown },
  expected: { origin: string; source: unknown }
): boolean {
  return event.origin === expected.origin && event.source != null && event.source === expected.source
}
