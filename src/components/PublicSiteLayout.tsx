import { Outlet } from 'react-router-dom';
import { LandingLocaleProvider } from '../contexts/LandingLocaleContext';

/** Envolve rotas públicas para compartilhar idioma (localStorage) com a landing. */
export function PublicSiteLayout() {
  return (
    <LandingLocaleProvider>
      <Outlet />
    </LandingLocaleProvider>
  );
}