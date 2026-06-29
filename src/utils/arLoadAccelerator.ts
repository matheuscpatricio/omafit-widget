/** Alinhado a `ESM_THREE_VER` / `ESM_MINDAR_FACE_THREE` em `omafit-ar-widget.js`. */
const ESM_THREE_VER = '0.150.1';
const ESM_SH = 'https://esm.sh';

type WindowWithArPreload = Window & {
  __omafitArModuleBundlePromise?: Promise<unknown>;
  __omafitArWidgetModulePromise?: Promise<unknown>;
};

function appendLinkOnce(rel: string, href: string, crossOrigin?: string) {
  if (typeof document === 'undefined' || !href) return;
  const sel = `link[rel="${rel}"][href="${href}"]`;
  if (document.head.querySelector(sel)) return;
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (crossOrigin) link.crossOrigin = crossOrigin;
  document.head.appendChild(link);
}

/** DNS/preconnect para esm.sh (Three/MindAR) e Draco WASM. */
export function injectArResourceHints() {
  appendLinkOnce('dns-prefetch', ESM_SH);
  appendLinkOnce('preconnect', ESM_SH, 'anonymous');
  appendLinkOnce('preconnect', 'https://www.gstatic.com', 'anonymous');
}

/** `modulepreload` do bundle AR versionado — começa download antes do React montar o root. */
export function preloadArModuleScript(arModuleUrl: string) {
  appendLinkOnce('modulepreload', arModuleUrl);
}

/**
 * Three + GLTFLoader + MindAR em paralelo com o parse do `omafit-ar-widget.js`.
 * Reutiliza `window.__omafitArModuleBundlePromise` quando o widget AR arranca.
 */
export function warmMindArEsmBundle() {
  if (typeof window === 'undefined') return;
  const w = window as WindowWithArPreload;
  if (w.__omafitArModuleBundlePromise) return;
  w.__omafitArModuleBundlePromise = Promise.all([
    import(/* @vite-ignore */ `${ESM_SH}/three@${ESM_THREE_VER}/es2022/three.mjs`),
    import(
      /* @vite-ignore */ `${ESM_SH}/three@${ESM_THREE_VER}/examples/jsm/loaders/GLTFLoader.js`
    ),
    import(
      /* @vite-ignore */ `${ESM_SH}/mind-ar@1.2.5/dist/mindar-face-three.prod.js?deps=three@${ESM_THREE_VER}`
    ),
  ]).catch((err) => {
    w.__omafitArModuleBundlePromise = undefined;
    throw err;
  });
}

/** Prefetch HTTP do GLB (cache do browser; o widget reutiliza via `omafitWarmGlbBuffer`). */
export function warmGlbFetch(glbUrl: string) {
  const url = String(glbUrl || '').trim();
  if (!url || typeof fetch === 'undefined') return;
  void fetch(url, { mode: 'cors', credentials: 'omit' }).catch(() => {});
}

/** Import dinâmico partilhado — evita duplicar fetch do módulo AR. */
export function loadArWidgetModule(arModuleUrl: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const w = window as WindowWithArPreload;
  if (!w.__omafitArWidgetModulePromise) {
    w.__omafitArWidgetModulePromise = import(/* @vite-ignore */ arModuleUrl).then(() => undefined);
  }
  return w.__omafitArWidgetModulePromise;
}

export function primeArLoadPipeline(opts: { arModuleUrl: string; glbUrl?: string }) {
  injectArResourceHints();
  preloadArModuleScript(opts.arModuleUrl);
  warmMindArEsmBundle();
  void loadArWidgetModule(opts.arModuleUrl);
  if (opts.glbUrl) warmGlbFetch(opts.glbUrl);
}

export function buildArModuleUrl(origin: string, cacheBust: string): string {
  return `${origin}/ar/omafit-ar-widget.${encodeURIComponent(cacheBust)}.js`;
}
