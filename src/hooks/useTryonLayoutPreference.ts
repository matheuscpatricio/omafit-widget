import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isTryonWidgetEmbedded } from '../utils/isTryonWidgetEmbedded';
import { parseTryonLayoutFromUrl, type TryonLayoutMode } from '../utils/parseTryonLayoutFromUrl';

export type TryonLayoutPreferenceState = TryonLayoutMode | 'pending';

const SESSION_PREFIX = 'omafit_tryon_layout:';

function readTryonLayoutFromSession(shopDomain: string): TryonLayoutMode | null {
  if (typeof window === 'undefined' || !shopDomain) return null;
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_PREFIX}${shopDomain}`);
    if (raw === 'hero' || raw === 'sidebar' || raw === 'default') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function writeTryonLayoutToSession(shopDomain: string, layout: TryonLayoutMode) {
  if (typeof window === 'undefined' || !shopDomain) return;
  try {
    window.sessionStorage.setItem(`${SESSION_PREFIX}${shopDomain}`, layout);
  } catch {
    /* ignore */
  }
}

type Opts = {
  shopDomain: string;
  /** Props vindas do Netlify / Shopify quando não há fetch ao Supabase. */
  layoutOverride?: TryonLayoutMode;
  /** Notifica página pai (iframe chrome sem margens). */
  onLayoutResolved?: (layout: TryonLayoutMode) => void;
};

/**
 * Mesma fonte de verdade que TryOnWidget: URL → override → sessionStorage → widget_configurations.
 */
export function useTryonLayoutPreference({ shopDomain, layoutOverride, onLayoutResolved }: Opts) {
  const layoutFromUrl = useMemo(() => parseTryonLayoutFromUrl(), []);
  const effectiveShopDomain = (shopDomain || '').trim();

  const [tryonLayout, setTryonLayout] = useState<TryonLayoutPreferenceState>(() => {
    if (layoutFromUrl !== undefined) return layoutFromUrl;
    if (layoutOverride === 'hero' || layoutOverride === 'sidebar' || layoutOverride === 'default') return layoutOverride;
    if (effectiveShopDomain) {
      const cached = readTryonLayoutFromSession(effectiveShopDomain);
      if (cached !== null) return cached;
      return 'pending';
    }
    return isTryonWidgetEmbedded() ? 'pending' : 'default';
  });

  useEffect(() => {
    if (layoutFromUrl !== undefined) return;
    if (layoutOverride === 'hero' || layoutOverride === 'sidebar' || layoutOverride === 'default') {
      setTryonLayout(layoutOverride);
    }
  }, [layoutOverride, layoutFromUrl]);

  useEffect(() => {
    if (tryonLayout === 'pending') return;
    onLayoutResolved?.(tryonLayout);
  }, [tryonLayout, onLayoutResolved]);

  useEffect(() => {
    if (layoutFromUrl !== undefined || layoutOverride !== undefined) return;
    setTryonLayout((prev) => {
      if (prev !== 'pending') return prev;
      if (!effectiveShopDomain) return isTryonWidgetEmbedded() ? prev : 'default';
      const cached = readTryonLayoutFromSession(effectiveShopDomain);
      return cached ?? 'pending';
    });
  }, [effectiveShopDomain, layoutFromUrl, layoutOverride]);

  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      const d = event.data as Record<string, unknown> | null;
      if (!d || typeof d !== 'object') return;
      if (d.type !== 'omafit-context' && d.type !== 'omafit-config-update') return;
      if (layoutFromUrl !== undefined || layoutOverride !== undefined) return;
      const tl = d.tryon_layout ?? d.tryonLayout;
      if (tl !== 'hero' && tl !== 'sidebar' && tl !== 'default') return;
      const sd = String(d.shopDomain ?? d.shop_domain ?? effectiveShopDomain ?? '').trim();
      setTryonLayout(tl);
      if (sd) writeTryonLayoutToSession(sd, tl);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [effectiveShopDomain, layoutFromUrl, layoutOverride]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (layoutFromUrl !== undefined || layoutOverride !== undefined) return;
      if (!effectiveShopDomain) {
        if (!isTryonWidgetEmbedded()) {
          setTryonLayout((p) => (p === 'pending' ? 'default' : p));
        }
        return;
      }
      try {
        const { data: configs, error } = await supabase
          .from('widget_configurations')
          .select('tryon_layout, updated_at')
          .eq('shop_domain', effectiveShopDomain)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (cancelled) return;
        if (error) {
          setTryonLayout((p) => (p === 'pending' ? 'default' : p));
          return;
        }
        if (configs && configs.length > 0) {
          const raw = (configs[0] as { tryon_layout?: string }).tryon_layout;
          const resolved: TryonLayoutMode = raw === 'hero' ? 'hero' : raw === 'sidebar' ? 'sidebar' : 'default';
          setTryonLayout(resolved);
          writeTryonLayoutToSession(effectiveShopDomain, resolved);
        } else {
          setTryonLayout('default');
          writeTryonLayoutToSession(effectiveShopDomain, 'default');
        }
      } catch {
        if (!cancelled) setTryonLayout((p) => (p === 'pending' ? 'default' : p));
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [effectiveShopDomain, layoutFromUrl, layoutOverride]);

  const embed = tryonLayout === 'sidebar' || tryonLayout === 'hero';
  const isSidebarLayout = tryonLayout === 'sidebar';
  const isHeroLayout = tryonLayout === 'hero';

  return {
    tryonLayout,
    embed,
    isSidebarLayout,
    isHeroLayout,
    layoutFromUrl,
  };
}
