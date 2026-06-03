/** Calendário comercial por país (v1: BR completo, extensível). */

export type CountryCode = 'BR' | 'US' | string;

export type RetailOccasionId =
  | 'christmas'
  | 'new_year'
  | 'mothers_day'
  | 'fathers_day'
  | 'valentines_br'
  | 'black_friday';

export type RetailOccasion = {
  id: RetailOccasionId;
  label: string;
  tone: 'gift' | 'party' | 'family' | 'commercial';
  dressCodeHint: 'festive' | 'smart_casual' | 'relaxed' | 'formal';
  /** Dias antes do evento em que o consultor deve considerar a ocasião ativa. */
  leadDays: number;
  /** Dia do evento (para mensagens). */
  eventDate: Date;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** n = 1 → primeiro domingo do mês (1-based). */
export function nthSundayOfMonth(year: number, monthIndex: number, n: number): Date {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, monthIndex, day);
    if (d.getMonth() !== monthIndex) break;
    if (d.getDay() === 0) {
      count++;
      if (count === n) return d;
    }
  }
  return new Date(year, monthIndex, 1);
}

function isWithinLeadWindow(today: Date, event: Date, leadDays: number): boolean {
  const t = startOfDay(today).getTime();
  const e = startOfDay(event).getTime();
  const start = e - leadDays * 86400000;
  return t >= start && t <= e + 86400000;
}

function brOccasionsForYear(year: number, today: Date): RetailOccasion[] {
  const candidates: Array<Omit<RetailOccasion, 'eventDate'> & { eventDate: Date }> = [
    {
      id: 'christmas',
      label: 'Natal',
      tone: 'gift',
      dressCodeHint: 'festive',
      leadDays: 21,
      eventDate: new Date(year, 11, 25),
    },
    {
      id: 'new_year',
      label: 'Ano Novo',
      tone: 'party',
      dressCodeHint: 'festive',
      leadDays: 10,
      eventDate: new Date(year, 11, 31),
    },
    {
      id: 'mothers_day',
      label: 'Dia das Mães',
      tone: 'gift',
      dressCodeHint: 'smart_casual',
      leadDays: 14,
      eventDate: nthSundayOfMonth(year, 4, 2),
    },
    {
      id: 'fathers_day',
      label: 'Dia dos Pais',
      tone: 'gift',
      dressCodeHint: 'smart_casual',
      leadDays: 14,
      eventDate: nthSundayOfMonth(year, 7, 2),
    },
    {
      id: 'valentines_br',
      label: 'Dia dos Namorados',
      tone: 'gift',
      dressCodeHint: 'smart_casual',
      leadDays: 10,
      eventDate: new Date(year, 5, 12),
    },
    {
      id: 'black_friday',
      label: 'Black Friday',
      tone: 'commercial',
      dressCodeHint: 'relaxed',
      leadDays: 5,
      eventDate: new Date(year, 10, 29),
    },
  ];

  return candidates.filter((c) => isWithinLeadWindow(today, c.eventDate, c.leadDays));
}

function usOccasionsForYear(year: number, today: Date): RetailOccasion[] {
  const candidates: Array<Omit<RetailOccasion, 'eventDate'> & { eventDate: Date }> = [
    {
      id: 'christmas',
      label: 'Christmas',
      tone: 'gift',
      dressCodeHint: 'festive',
      leadDays: 21,
      eventDate: new Date(year, 11, 25),
    },
    {
      id: 'new_year',
      label: "New Year's",
      tone: 'party',
      dressCodeHint: 'festive',
      leadDays: 10,
      eventDate: new Date(year, 11, 31),
    },
    {
      id: 'mothers_day',
      label: "Mother's Day",
      tone: 'gift',
      dressCodeHint: 'smart_casual',
      leadDays: 14,
      eventDate: nthSundayOfMonth(year, 4, 2),
    },
    {
      id: 'fathers_day',
      label: "Father's Day",
      tone: 'gift',
      dressCodeHint: 'smart_casual',
      leadDays: 14,
      eventDate: nthSundayOfMonth(year, 5, 3),
    },
    {
      id: 'black_friday',
      label: 'Black Friday',
      tone: 'commercial',
      dressCodeHint: 'relaxed',
      leadDays: 5,
      eventDate: new Date(year, 10, 29),
    },
  ];

  return candidates.filter((c) => isWithinLeadWindow(today, c.eventDate, c.leadDays));
}

export function normalizeCountryCode(input?: string): CountryCode {
  const s = String(input || '')
    .trim()
    .toUpperCase();
  if (s === 'BR' || s === 'BRA' || s === 'BRAZIL') return 'BR';
  if (s === 'US' || s === 'USA' || s === 'UNITED STATES') return 'US';
  return s || 'BR';
}

export function getActiveRetailOccasions(
  today: Date = new Date(),
  countryCode?: string
): RetailOccasion[] {
  const country = normalizeCountryCode(countryCode);
  const year = today.getFullYear();
  if (country === 'US') return usOccasionsForYear(year, today);
  return brOccasionsForYear(year, today);
}

/** Hemisfério sul: dez–fev verão, mar–mai outono, jun–ago inverno, set–nov primavera. */
export function getSeasonLabel(
  today: Date = new Date(),
  countryCode?: string
): 'summer' | 'autumn' | 'winter' | 'spring' {
  const country = normalizeCountryCode(countryCode);
  const month = today.getMonth() + 1;
  const southern = country === 'BR' || country === 'AR' || country === 'AU';
  if (!southern) {
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    if (month === 12 || month <= 2) return 'winter';
    return 'spring';
  }
  if (month === 12 || month <= 2) return 'summer';
  if (month >= 3 && month <= 5) return 'autumn';
  if (month >= 6 && month <= 8) return 'winter';
  return 'spring';
}

export function seasonLabelPt(season: ReturnType<typeof getSeasonLabel>): string {
  const map = {
    summer: 'verão',
    autumn: 'outono',
    winter: 'inverno',
    spring: 'primavera',
  };
  return map[season];
}

export function inferCountryFromShopDomain(shopDomain?: string): CountryCode {
  const d = String(shopDomain || '').toLowerCase();
  if (d.endsWith('.com.br') || d.includes('brazil') || d.includes('brasil')) return 'BR';
  if (d.endsWith('.com') && !d.endsWith('.com.br')) return 'US';
  return 'BR';
}
