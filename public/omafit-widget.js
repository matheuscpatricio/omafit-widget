// Omafit - Widget oficial adaptado para Theme App Extension
(function () {
  // Configuração global (será preenchida pela API)
  let OMAFIT_CONFIG = null;
  let SHOP_DOMAIN = '';

  // Carregar fontes do Google Fonts
  const fontsToLoad = [
    'Outfit:wght@100..900',
    'Playfair+Display:wght@400..900',
    'Raleway:wght@100..900',
    'Inter:opsz,wght@14..32,100..900'
  ];

  fontsToLoad.forEach((font) => {
    const fontName = font.split(':')[0];
    if (!document.querySelector('link[href*="' + fontName + '"]')) {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=' + font + '&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  });

  // Normalizar URLs
  function normalizeUrl(url) {
    if (!url) return null;
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    return url;
  }

  // Obter só imagens de produto, usando várias fontes de dados Shopify
  async function getOnlyProductImages() {
    // 1. window.meta.product
    if (window.meta && window.meta.product) {
      const p = window.meta.product;
      const imgs = [];

      if (Array.isArray(p.media)) {
        p.media.forEach((m) => {
          if (m.src) imgs.push(normalizeUrl(m.src));
          else if (m.preview_image && m.preview_image.src) imgs.push(normalizeUrl(m.preview_image.src));
        });
      }

      if (Array.isArray(p.images)) {
        p.images.forEach((i) => imgs.push(normalizeUrl(i)));
      }

      if (imgs.length > 0) {
        console.log('✅ Imagens encontradas via window.meta.product:', imgs.length);
        return [...new Set(imgs)];
      }
    }

    // 2. ShopifyAnalytics
    if (
      window.ShopifyAnalytics &&
      window.ShopifyAnalytics.meta &&
      window.ShopifyAnalytics.meta.product &&
      Array.isArray(window.ShopifyAnalytics.meta.product.images)
    ) {
      const imgs = window.ShopifyAnalytics.meta.product.images.map((i) => normalizeUrl(i));
      console.log('✅ Imagens encontradas via ShopifyAnalytics:', imgs.length);
      return imgs;
    }

    // 3. Fallback /products/{handle}.js
    const handlePart = window.location.pathname.split('/products/')[1];
    if (handlePart) {
      const handle = handlePart.split('/')[0];
      try {
        const res = await fetch('/products/' + handle + '.js');
        const product = await res.json();
        if (Array.isArray(product.images)) {
          const imgs = product.images.map((i) => normalizeUrl(i));
          console.log('✅ Imagens encontradas via product.js:', imgs.length);
          return imgs;
        }
      } catch (e) {
        console.error('Erro ao buscar produto:', e);
      }
    }

    return [];
  }

  // Tentar encontrar imagem do produto na página
  function getProductImageFromPage() {
    // 1. Elemento #omafit-featured-image (se loja quiser configurar)
    const omafitImage = document.querySelector('#omafit-featured-image');
    if (omafitImage) {
      if (omafitImage.dataset && omafitImage.dataset.src) {
        console.log('✅ Imagem via #omafit-featured-image[data-src]');
        return normalizeUrl(omafitImage.dataset.src);
      }
      if (omafitImage.src) {
        console.log('✅ Imagem via #omafit-featured-image[src]');
        return normalizeUrl(omafitImage.src);
      }
      const dataSrcAttr = omafitImage.getAttribute('data-src');
      if (dataSrcAttr) {
        console.log('✅ Imagem via #omafit-featured-image[data-src] (getAttribute)');
        return normalizeUrl(dataSrcAttr);
      }
    }

    // 2. Meta og:image
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const content = ogImage.getAttribute('content');
      if (content) {
        console.log('✅ Imagem via og:image');
        return normalizeUrl(content);
      }
    }

    // 3. Selectores comuns de tema Shopify
    const shopifySelectors = [
      '.product__media--featured img',
      '.product__media img[src*="cdn.shopify.com"]',
      '.product-single__photo img',
      '[data-product-featured-media] img'
    ];

    for (const selector of shopifySelectors) {
      const img = document.querySelector(selector);
      if (img && img.src) {
        console.log('✅ Imagem via seletor Shopify:', selector);
        return normalizeUrl(img.src);
      }
    }

    // 4. Fallback: primeira imagem grande
    const allImages = document.querySelectorAll('.product__media img, .product img, [class*="product"] img');
    for (const img of allImages) {
      if (img.naturalWidth > 300 && img.naturalHeight > 300) {
        console.log('✅ Imagem via fallback (imagem grande)');
        return normalizeUrl(img.src);
      }
    }

    console.warn('⚠️ Nenhuma imagem de produto encontrada');
    return null;
  }

  // Capturar info do produto
  function getProductInfo() {
    let productId = '';
    let productName = '';
    let productHandle = '';

    // Pegar do elemento omafit-widget-root primeiro (prioridade)
    const rootElement = document.getElementById('omafit-widget-root');
    if (rootElement) {
      productId = rootElement.dataset.productId || '';
      productHandle = rootElement.dataset.productHandle || '';
    }

    // Se não tiver, tentar window.meta.product
    if (!productId && window.meta && window.meta.product) {
      productId = window.meta.product.id;
      productName = window.meta.product.title;
    } else if (
      !productId &&
      window.ShopifyAnalytics &&
      window.ShopifyAnalytics.meta &&
      window.ShopifyAnalytics.meta.product
    ) {
      productId = window.ShopifyAnalytics.meta.product.id;
      productName = window.ShopifyAnalytics.meta.product.name;
    }

    // Nome do produto
    if (!productName) {
      const nameEl = document.querySelector(
        '.product-single__title, h1.product__title, .product__title, [itemprop="name"]'
      );
      if (nameEl) productName = nameEl.textContent.trim();
    }

    // Handle do produto
    if (!productHandle) {
      const urlParts = window.location.pathname.split('/products/');
      if (urlParts.length > 1) {
        productHandle = urlParts[1].split('/')[0];
      }
    }

    return { productId, productName, productHandle };
  }

  // Buscar configuração do Omafit via API
  async function fetchOmafitConfig() {
    try {
      const rootElement = document.getElementById('omafit-widget-root');
      let shopDomain = '';
      let publicId = '';

      if (rootElement) {
        shopDomain = rootElement.dataset.shopDomain || '';
        publicId = rootElement.dataset.publicId || '';
      }

      // Tentar detectar shop domain do Shopify
      if (!shopDomain && window.Shopify && window.Shopify.shop) {
        shopDomain = window.Shopify.shop;
      }

      // Salvar shopDomain globalmente
      SHOP_DOMAIN = shopDomain;

      // Construir URL da API
      const apiUrl = 'https://lhkgnirolvbmomeduoaj.supabase.co/functions/v1/omafit-config';
      let queryParams = new URLSearchParams();

      if (publicId) {
        queryParams.append('public_id', publicId);
      } else if (shopDomain) {
        queryParams.append('shop', shopDomain);
      } else {
        throw new Error('Nem public_id nem shop domain foram fornecidos');
      }

      const response = await fetch(apiUrl + '?' + queryParams.toString());

      if (!response.ok) {
        throw new Error('Erro ao buscar configuração do widget');
      }

      const config = await response.json();
      console.log('✅ Configuração do Omafit carregada:', config);
      console.log('🖼️ Logo recebido da API:', config.storeLogo);
      console.log('🏪 Shop Domain:', SHOP_DOMAIN);
      return config;
    } catch (error) {
      console.error('❌ Erro ao buscar configuração:', error);
      // Retornar configuração padrão em caso de erro
      return {
        publicId: 'wgt_pub_default',
        linkText: 'Experimentar virtualmente',
        storeName: '',
        storeLogo: '',
        fontFamily: 'Outfit, sans-serif',
        colors: {
          primary: '#810707',
          background: '#ffffff',
          text: '#810707',
          overlay: '#810707CC'
        }
      };
    }
  }

  // Função que abre o modal do Omafit
  window.openOmafitModal = async function () {
    if (!OMAFIT_CONFIG) {
      console.error('Omafit: configuração não carregada');
      return;
    }

    const productImage = getProductImageFromPage();

    if (!productImage) {
      alert(
        'Não foi possível detectar a imagem do produto nesta página.\nVerifique se você está em uma página de produto.'
      );
      return;
    }

    const allProductImages = await getOnlyProductImages();
    console.log('📸 Total de imagens encontradas:', allProductImages.length);

    const productInfo = getProductInfo();
    const isMobile = window.innerWidth <= 768;

    const overlay = document.createElement('div');
    overlay.className = 'omafit-modal-overlay';
    overlay.style.cssText =
      'position: fixed;' +
      'top: 0;' +
      'left: 0;' +
      'width: 100%;' +
      'height: 100%;' +
      'background: rgba(0, 0, 0, 0);' +
      'z-index: 999999;' +
      'display: flex;' +
      'align-items: center;' +
      'justify-content: center;' +
      (isMobile ? 'padding: 0;' : 'padding: 20px;') +
      'box-sizing: border-box;' +
      'backdrop-filter: blur(0px);' +
      'transition: all 0.4s ease-in-out;' +
      'opacity: 0;';

    const iframe = document.createElement('iframe');

    const config = {
      storeName: OMAFIT_CONFIG.storeName || 'Omafit',
      primaryColor: OMAFIT_CONFIG.colors.primary,
      storeLogo: OMAFIT_CONFIG.storeLogo,
      fontFamily: OMAFIT_CONFIG.fontFamily
    };

    console.log('🔧 Config montado para iframe:', config);
    console.log('🖼️ Logo que será passado:', config.storeLogo);

    const widgetUrl =
      'https://omafit.netlify.app/widget' +
      '?productImage=' + encodeURIComponent(productImage) +
      '&productImages=' + encodeURIComponent(JSON.stringify(allProductImages)) +
      '&productId=' + encodeURIComponent(productInfo.productId || 'unknown') +
      '&productName=' + encodeURIComponent(productInfo.productName || 'Produto') +
      '&publicId=' + encodeURIComponent(OMAFIT_CONFIG.publicId) +
      '&shopDomain=' + encodeURIComponent(SHOP_DOMAIN) +
      '&config=' + encodeURIComponent(JSON.stringify(config));

    console.log('🔗 URL do widget:', widgetUrl);

    iframe.src = widgetUrl;
    iframe.allow = 'camera; microphone; fullscreen';
    iframe.style.cssText =
      'width: 95vw;' +
      'max-width: 1000px;' +
      'height: 85vh;' +
      'max-height: 800px;' +
      'border: none;' +
      'border-radius: 16px;' +
      'background: ' + OMAFIT_CONFIG.colors.background + ';' +
      'box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);' +
      'transform: scale(0.9);' +
      'opacity: 0;' +
      'transition: all 0.4s ease-in-out;';

    const loadingContainer = document.createElement('div');
    loadingContainer.style.cssText =
      'position: absolute;' +
      'top: 50%;' +
      'left: 50%;' +
      'transform: translate(-50%, -50%);' +
      'text-align: center;' +
      'z-index: 1000000;';

    const loadingText = document.createElement('div');
    loadingText.style.cssText =
      'color: white;' +
      'font-size: 16px;' +
      'font-family: ' + OMAFIT_CONFIG.fontFamily + ';' +
      'margin-top: 15px;' +
      'font-weight: 500;';
    loadingText.textContent = 'Carregando try-on virtual...';

    const spinner = document.createElement('div');
    spinner.style.cssText =
      'width: 50px;' +
      'height: 50px;' +
      'border: 4px solid rgba(255,255,255,0.3);' +
      'border-top-color: white;' +
      'border-radius: 50%;' +
      'animation: spin 1s linear infinite;' +
      'margin: 0 auto 15px;';

    loadingContainer.appendChild(spinner);
    loadingContainer.appendChild(loadingText);

    iframe.addEventListener('load', function () {
      if (loadingContainer.parentNode) {
        loadingContainer.parentNode.removeChild(loadingContainer);
      }

      // Enviar configurações via postMessage após o iframe carregar
      setTimeout(function() {
        if (iframe.contentWindow) {
          // Enviar logo
          if (OMAFIT_CONFIG.storeLogo) {
            iframe.contentWindow.postMessage({
              type: 'omafit-store-logo',
              logo: OMAFIT_CONFIG.storeLogo
            }, '*');
          }

          // Enviar configuração completa
          iframe.contentWindow.postMessage({
            type: 'omafit-config-update',
            fontFamily: OMAFIT_CONFIG.fontFamily,
            primaryColor: OMAFIT_CONFIG.colors.primary,
            storeName: OMAFIT_CONFIG.storeName,
            storeLogo: OMAFIT_CONFIG.storeLogo
          }, '*');

          console.log('📤 Configurações enviadas via postMessage');
        }
      }, 500);
    });

    iframe.addEventListener('error', function () {
      if (loadingContainer.parentNode) {
        loadingContainer.innerHTML =
          '<div style="padding: 20px; text-align: center; background: white; border-radius: 12px; font-family: ' +
          OMAFIT_CONFIG.fontFamily +
          ';">' +
          '<div style="font-size: 18px; margin-bottom: 10px;">⚠️ Erro ao carregar o widget</div>' +
          '<div style="font-size: 14px; opacity: 0.8; margin-top: 10px;">Tente novamente mais tarde</div>' +
          '</div>';
      }
    });

    if (!document.getElementById('omafit-spinner-style')) {
      const spinnerStyle = document.createElement('style');
      spinnerStyle.id = 'omafit-spinner-style';
      spinnerStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(spinnerStyle);
    }

    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText =
      'position: relative;' +
      'width: 95vw;' +
      'max-width: 1000px;' +
      'height: 85vh;' +
      'max-height: 800px;';

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText =
      'position: absolute;' +
      'top: 12px;' +
      'right: 12px;' +
      'width: 36px;' +
      'height: 36px;' +
      'border: none;' +
      'border-radius: 0;' +
      'background: transparent;' +
      'color: #333;' +
      'font-size: 32px;' +
      'cursor: pointer;' +
      'display: flex;' +
      'align-items: center;' +
      'justify-content: center;' +
      'z-index: 1000001;' +
      'font-weight: 300;' +
      'line-height: 1;' +
      'padding: 4px;' +
      'transition: opacity 0.2s;' +
      'opacity: 0.7;';

    const closeModal = function () {
      if (document.body.contains(overlay)) {
        overlay.style.background = 'rgba(0, 0, 0, 0)';
        overlay.style.backdropFilter = 'blur(0px)';
        overlay.style.opacity = '0';
        iframe.style.transform = 'scale(0.9)';
        iframe.style.opacity = '0';

        setTimeout(function () {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
            document.body.style.overflow = '';
          }
        }, 400);
      }
    };

    closeButton.addEventListener('mouseenter', function () {
      this.style.opacity = '1';
    });
    closeButton.addEventListener('mouseleave', function () {
      this.style.opacity = '0.7';
    });

    closeButton.addEventListener('click', closeModal);

    if (!isMobile) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          closeModal();
        }
      });
    }

    const handleEscape = function (e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    iframeContainer.appendChild(iframe);
    iframeContainer.appendChild(closeButton);
    overlay.appendChild(loadingContainer);
    overlay.appendChild(iframeContainer);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    setTimeout(function () {
      if (!isMobile) {
        overlay.style.background = 'rgba(0, 0, 0, 0.6)';
        overlay.style.backdropFilter = 'blur(4px)';
      }
      overlay.style.opacity = '1';
      iframe.style.transform = 'scale(1)';
      iframe.style.opacity = '1';
    }, 10);
  };

  // Criar link Omafit logo abaixo do botão "Adicionar ao carrinho"
  function insertOmafitLinkUnderAddToCart() {
    if (!OMAFIT_CONFIG) {
      console.error('Omafit: configuração não carregada, não é possível inserir link');
      return;
    }

    // Tentar alguns seletores comuns de botão de carrinho
    const addToCartSelectors = [
      'button[name="add"]',
      'button[type="submit"][name="add"]',
      '.product-form__submit',
      'form[action*="/cart/add"] button[type="submit"]',
      'form[action*="/cart/add"] input[type="submit"]'
    ];

    let addToCartButton = null;
    for (const sel of addToCartSelectors) {
      const btn = document.querySelector(sel);
      if (btn) {
        addToCartButton = btn;
        break;
      }
    }

    if (!addToCartButton) {
      console.warn('Omafit: botão "Adicionar ao carrinho" não encontrado nos seletores padrão.');
      return;
    }

    // Criar container e link
    const container = document.createElement('div');
    container.className = 'omafit-widget';
    container.style.textAlign = 'center';
    container.style.marginTop = '16px';
    container.style.marginBottom = '24px';

    const link = document.createElement('a');
    link.href = 'javascript:void(0);';
    link.className = 'omafit-try-on-link';
    link.textContent = OMAFIT_CONFIG.linkText || 'Experimentar virtualmente';

    // Estilos do link
    link.style.fontFamily = 'inherit';
    link.style.fontSize = 'inherit';
    link.style.fontWeight = 'inherit';
    link.style.lineHeight = 'inherit';
    link.style.color = OMAFIT_CONFIG.colors.text;
    link.style.textDecoration = 'underline';
    link.style.textDecorationColor = OMAFIT_CONFIG.colors.primary;
    link.style.textUnderlineOffset = '3px';
    link.style.cursor = 'pointer';
    link.style.transition = 'all 0.2s ease';

    link.addEventListener('mouseenter', function () {
      this.style.opacity = '0.7';
      this.style.textDecorationThickness = '2px';
    });
    link.addEventListener('mouseleave', function () {
      this.style.opacity = '1';
      this.style.textDecorationThickness = '1px';
    });

    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof window.openOmafitModal === 'function') {
        window.openOmafitModal();
      }
    });

    container.appendChild(link);

    // Inserir logo após o botão de carrinho
    if (addToCartButton.parentNode) {
      addToCartButton.parentNode.insertBefore(container, addToCartButton.nextSibling);
    } else {
      // fallback: tenta inserir no root, se existir
      const root = document.getElementById('omafit-widget-root');
      if (root) {
        root.appendChild(container);
      } else {
        document.body.appendChild(container);
      }
    }

    // CSS extra para mobile e foco
    const style = document.createElement('style');
    style.textContent =
      '@media (max-width: 768px) {' +
      '  .omafit-modal-overlay {' +
      '    background: transparent !important;' +
      '    backdrop-filter: none !important;' +
      '  }' +
      '  .omafit-modal-overlay > div:not([style*="transform: translate"]) {' +
      '    width: 100vw !important;' +
      '    height: 100vh !important;' +
      '    max-width: none !important;' +
      '    max-height: none !important;' +
      '  }' +
      '  .omafit-modal-overlay iframe {' +
      '    width: 100vw !important;' +
      '    height: 100vh !important;' +
      '    max-width: none !important;' +
      '    max-height: none !important;' +
      '    border-radius: 0 !important;' +
      '  }' +
      '  .omafit-modal-overlay > div > button {' +
      '    position: fixed !important;' +
      '    top: 20px !important;' +
      '    right: 16px !important;' +
      '    z-index: 1000002 !important;' +
      '    background: white !important;' +
      '    border-radius: 50% !important;' +
      '    width: 40px !important;' +
      '    height: 40px !important;' +
      '    box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;' +
      '  }' +
      '}' +
      '.omafit-try-on-link:focus {' +
      '  outline: 2px solid ' + OMAFIT_CONFIG.colors.primary + ';' +
      '  outline-offset: 2px;' +
      '}';
    document.head.appendChild(style);
  }

  // Inicializar assim que a página e configuração estiverem prontas
  async function initOmafit() {
    try {
      console.log('🚀 Inicializando Omafit...');

      // Buscar configuração via API
      OMAFIT_CONFIG = await fetchOmafitConfig();

      if (!OMAFIT_CONFIG || !OMAFIT_CONFIG.publicId) {
        console.error('❌ Falha ao carregar configuração do Omafit');
        return;
      }

      console.log('✅ Configuração carregada, inserindo widget');

      // Inserir o widget na página
      insertOmafitLinkUnderAddToCart();

      console.log('✅ Omafit inicializado com sucesso');
    } catch (e) {
      console.error('❌ Omafit: erro ao inicializar widget', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOmafit);
  } else {
    initOmafit();
  }
})();
