import { DEFAULT_WIDGET_BASE_URL, PUBLIC_ID_PATTERN } from './constants'

export type CtaType = 'link' | 'button'
export type TryonLayout = 'default' | 'hero' | 'sidebar'
export type WidgetEntry = 'tryon' | 'footwear-ar'
export type DefaultGender = '' | 'male' | 'female' | 'unisex'

export type OmafitSettings = {
  publicId: string
  widgetBaseUrl: string
  widgetEnabled: boolean
  linkText: string
  primaryColor: string
  ctaType: CtaType
  ctaBorderRadius: number
  tryonLayout: TryonLayout
  entry: WidgetEntry
  excludedCategories: string
  storeName: string
  defaultGender: DefaultGender
}

export type SettingsIssue = {
  field: keyof OmafitSettings
  code: 'public-id' | 'url' | 'color' | 'radius' | 'excluded'
}

export const DEFAULT_SETTINGS: OmafitSettings = {
  publicId: '',
  widgetBaseUrl: DEFAULT_WIDGET_BASE_URL,
  widgetEnabled: true,
  linkText: '',
  primaryColor: '#810707',
  ctaType: 'link',
  ctaBorderRadius: 40,
  tryonLayout: 'default',
  entry: 'tryon',
  excludedCategories: '',
  storeName: '',
  defaultGender: '',
}

const COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  return input as Record<string, unknown>
}

export function unwrapSettingsPayload(input: unknown): unknown {
  if (typeof input === 'string') {
    const text = input.trim()
    if (!text) return {}
    try {
      return JSON.parse(text) as unknown
    } catch {
      return {}
    }
  }
  const record = asRecord(input)
  if (typeof record.message !== 'string') return input
  return unwrapSettingsPayload(record.message)
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return fallback
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const text = String(value ?? '').trim() as T
  return allowed.includes(text) ? text : fallback
}

export function normalizeSettings(input: unknown): {
  settings: OmafitSettings
  issues: SettingsIssue[]
} {
  const source = asRecord(unwrapSettingsPayload(input))
  const publicId = String(source.publicId ?? '')
    .trim()
  const widgetBaseUrl = String(source.widgetBaseUrl ?? DEFAULT_SETTINGS.widgetBaseUrl).trim()
  const linkText = String(source.linkText ?? '').trim().slice(0, 80)
  const primaryColor = String(source.primaryColor ?? DEFAULT_SETTINGS.primaryColor).trim()
  const radiusNumber = Number(source.ctaBorderRadius)
  const ctaBorderRadius = Number.isFinite(radiusNumber)
    ? Math.max(0, Math.min(40, Math.round(radiusNumber)))
    : DEFAULT_SETTINGS.ctaBorderRadius
  const excludedCategories = String(source.excludedCategories ?? '')
    .trim()
    .slice(0, 500)
  const storeName = String(source.storeName ?? '').trim().slice(0, 80)

  const settings: OmafitSettings = {
    publicId,
    widgetBaseUrl: widgetBaseUrl || DEFAULT_SETTINGS.widgetBaseUrl,
    widgetEnabled: readBoolean(source.widgetEnabled, true),
    linkText,
    primaryColor: primaryColor || DEFAULT_SETTINGS.primaryColor,
    ctaType: readEnum(source.ctaType, ['link', 'button'] as const, 'link'),
    ctaBorderRadius,
    tryonLayout: readEnum(source.tryonLayout, ['default', 'hero', 'sidebar'] as const, 'default'),
    entry: readEnum(source.entry, ['tryon', 'footwear-ar'] as const, 'tryon'),
    excludedCategories,
    storeName,
    defaultGender: readEnum(source.defaultGender, ['', 'male', 'female', 'unisex'] as const, ''),
  }

  const issues: SettingsIssue[] = []
  if (publicId && (publicId === 'wgt_pub_default' || !PUBLIC_ID_PATTERN.test(publicId))) {
    issues.push({ field: 'publicId', code: 'public-id' })
  }
  if (!isHttpsWidgetUrl(settings.widgetBaseUrl)) {
    issues.push({ field: 'widgetBaseUrl', code: 'url' })
  }
  if (String(source.primaryColor ?? '').trim() && !COLOR_PATTERN.test(primaryColor)) {
    issues.push({ field: 'primaryColor', code: 'color' })
  }
  if (String(source.ctaBorderRadius ?? '').trim() && !Number.isFinite(radiusNumber)) {
    issues.push({ field: 'ctaBorderRadius', code: 'radius' })
  }
  return { settings, issues }
}

export function isHttpsWidgetUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    if (url.username || url.password) return false
    return Boolean(url.hostname)
  } catch {
    return false
  }
}

export function resolveRuntimeSettings(
  fromRuntime: unknown,
  blockProps?: { publicId?: string; linkText?: string }
): OmafitSettings {
  const normalized = normalizeSettings(fromRuntime).settings
  const propId = String(blockProps?.publicId || '').trim()
  const propLabel = String(blockProps?.linkText || '').trim()
  return {
    ...normalized,
    publicId: propId || normalized.publicId,
    linkText: propLabel || normalized.linkText,
  }
}

export function safePrimaryColor(color: string): string {
  return COLOR_PATTERN.test(color) ? color : DEFAULT_SETTINGS.primaryColor
}

export function canOpenWidget(settings: OmafitSettings): boolean {
  if (!settings.widgetEnabled) return false
  if (!settings.publicId || !PUBLIC_ID_PATTERN.test(settings.publicId)) return false
  if (settings.publicId === 'wgt_pub_default') return false
  return isHttpsWidgetUrl(settings.widgetBaseUrl)
}
