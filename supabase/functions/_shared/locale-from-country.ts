export type WelcomeLocale = "pt" | "es" | "en";

const PORTUGUESE_COUNTRIES = new Set([
  "BR", "PT", "AO", "MZ", "CV", "GW", "ST", "TL",
]);

const SPANISH_COUNTRIES = new Set([
  "ES", "MX", "AR", "CO", "CL", "PE", "VE", "EC", "GT", "CU", "BO", "DO",
  "HN", "PY", "SV", "NI", "CR", "PA", "UY", "PR", "GQ",
]);

export function localeFromCountryCode(
  countryCode: string | null | undefined,
): WelcomeLocale {
  const code = (countryCode ?? "").trim().toUpperCase();
  if (!code) return "en";
  if (PORTUGUESE_COUNTRIES.has(code)) return "pt";
  if (SPANISH_COUNTRIES.has(code)) return "es";
  return "en";
}
