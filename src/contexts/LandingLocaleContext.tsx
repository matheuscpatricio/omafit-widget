import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  detectLandingLocale,
  getLandingCopy,
  persistLandingLocale,
  type LandingCopy,
  type LandingLocale,
} from '../locales/landing';

type LandingLocaleContextValue = {
  locale: LandingLocale;
  setLocale: (locale: LandingLocale) => void;
  t: LandingCopy;
};

const LandingLocaleContext = createContext<LandingLocaleContextValue | null>(null);

export function LandingLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LandingLocale>(() => detectLandingLocale());

  const setLocale = useCallback((next: LandingLocale) => {
    setLocaleState(next);
    persistLandingLocale(next);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: getLandingCopy(locale), // inclui contact, blog e partners
    }),
    [locale, setLocale],
  );

  return (
    <LandingLocaleContext.Provider value={value}>{children}</LandingLocaleContext.Provider>
  );
}

export function useLandingLocale() {
  const ctx = useContext(LandingLocaleContext);
  if (!ctx) {
    throw new Error('useLandingLocale must be used within LandingLocaleProvider');
  }
  return ctx;
}