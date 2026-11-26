export type WidgetLocale = 'pt' | 'en' | 'es'

export function toWidgetLocale(locale: string | undefined | null): WidgetLocale {
  const base = String(locale || '')
    .trim()
    .toLowerCase()
    .replace('_', '-')
    .split('-')[0]
  if (base === 'en') return 'en'
  if (base === 'es') return 'es'
  if (base === 'pt') return 'pt'
  return 'pt'
}
