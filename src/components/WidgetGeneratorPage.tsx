import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Copy, CheckCircle, Download, Code, Eye, Settings, Upload, Camera, Sparkles, AlertCircle, X } from 'lucide-react';
import type { Database } from '../lib/supabase';

type Product = Database['public']['Tables']['products']['Row'];

export function WidgetGeneratorPage() {
  const { user } = useAuth();
  const widgetTestRef = useRef<HTMLDivElement>(null);
  const [linkText, setLinkText] = useState('Experimentar virtualmente');
  const [linkColor, setLinkColor] = useState('#810707');
  const [popupColor, setPopupColor] = useState('#810707');
  const [storeName, setStoreName] = useState('');
  const [storeLogo, setStoreLogo] = useState('');
  const [selectedFont, setSelectedFont] = useState('Outfit');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [publicId, setPublicId] = useState<string>('');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [error, setError] = useState('');
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);


  useEffect(() => {
    if (user) {
      loadOrCreateWidgetKey();
      loadWidgetConfig();
    }
  }, [user]);

  const loadWidgetConfig = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('widget_keys')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.name) setLinkText(data.name);

        const config = data as any;
        if (config.link_color) setLinkColor(config.link_color);
        if (config.popup_color) setPopupColor(config.popup_color);
        if (config.store_name) setStoreName(config.store_name);
        if (config.store_logo) setStoreLogo(config.store_logo);
        if (config.font_family) setSelectedFont(config.font_family);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveWidgetConfig = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('widget_keys')
        .update({
          name: linkText,
          link_color: linkColor,
          popup_color: popupColor,
          store_name: storeName,
          store_logo: storeLogo,
          font_family: selectedFont,
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setError('Erro ao salvar configurações');
    }
  };

  useEffect(() => {
    if (publicId && linkText && linkColor && popupColor) {
      const timeoutId = setTimeout(() => {
        saveWidgetConfig();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [linkText, linkColor, popupColor, storeName, storeLogo]);

  // Inject widget into test div when publicId is ready
  useEffect(() => {
    if (publicId && widgetTestRef.current) {
      const widgetCode = generateWidget();

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = widgetCode;

      const scripts = tempDiv.querySelectorAll('script');
      widgetTestRef.current.innerHTML = widgetCode.replace(/<script[\s\S]*?<\/script>/gi, '');

      scripts.forEach((script) => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        document.body.appendChild(newScript);
      });
    }
  }, [publicId, linkText, linkColor, popupColor, storeName, storeLogo, selectedFont]);

  const loadOrCreateWidgetKey = async () => {
    if (!user) return;

    try {
      setGeneratingKey(true);

      const { data: existingKeys, error: fetchError } = await supabase
        .from('widget_keys')
        .select('public_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingKeys) {
        setPublicId(existingKeys.public_id);
      } else {
        const { data: newKeyData, error: generateError } = await supabase.rpc('generate_widget_key');

        if (generateError) {
          throw generateError;
        }

        const newKey = newKeyData as string;

        const { data: newPublicIdData, error: generatePublicIdError } = await supabase.rpc('generate_widget_public_id');

        if (generatePublicIdError) {
          throw generatePublicIdError;
        }

        const newPublicId = newPublicIdData as string;

        const { error: insertError } = await supabase
          .from('widget_keys')
          .insert({
            user_id: user.id,
            key: newKey,
            public_id: newPublicId,
            name: `Widget ${new Date().toLocaleDateString()}`,
            status: 'active'
          });

        if (insertError) {
          throw insertError;
        }

        setPublicId(newPublicId);
      }
    } catch (error) {
      setError('Erro ao gerar chave do widget. Tente novamente.');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingLogo(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `widget-logos/${fileName}`;

      console.log('📤 Iniciando upload:', { fileName, filePath, fileSize: file.size });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Video banner')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Erro no upload:', uploadError);
        throw uploadError;
      }

      console.log('✅ Upload concluído:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('Video banner')
        .getPublicUrl(filePath);

      console.log('🔗 URL pública gerada:', publicUrl);

      setStoreLogo(publicUrl);
      console.log('✅ Logo atualizado no estado');
    } catch (error: any) {
      console.error('❌ Error uploading logo:', error);
      setError(`Erro ao fazer upload: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const generateWidget = () => {
    const currentUrl = "https://omafit.netlify.app"

    if (!publicId) {
      return '<!-- Gerando chave do widget... Por favor, aguarde. -->';
    }

    return `<div style="text-align: center; margin-top: 24px; margin-bottom: 24px;">
    <!-- OmaFit Virtual Try-On Widget -->
    <!-- IMPORTANTE: Esta chave é única para sua conta. Não compartilhe este código com terceiros. -->
<div class="omafit-widget">
  <a href="javascript:void(0);" class="omafit-try-on-link">
    ${linkText}
  </a>
</div>
<div style="height: 40px;"></div>

<script>
(function() {
  // Carregar fontes do Google Fonts
  const fontsToLoad = [
    'Outfit:wght@100..900',
    'Playfair+Display:wght@400..900',
    'Raleway:wght@100..900',
    'Inter:opsz,wght@14..32,100..900'
  ];

  fontsToLoad.forEach(font => {
    const fontName = font.split(':')[0];
    if (!document.querySelector('link[href*="' + fontName + '"]')) {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=' + font + '&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  });

  // Função para normalizar URLs (adicionar https: se começar com //)
  function normalizeUrl(url) {
    if (!url) return null;
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    return url;
  }

  // Função para obter apenas imagens do produto diretamente dos dados do Shopify
  async function getOnlyProductImages() {
    // 1. Tenta meta.product
    if (window.meta && window.meta.product) {
      const p = window.meta.product;
      const imgs = [];

      if (Array.isArray(p.media)) {
        p.media.forEach(m => {
          if (m.src) imgs.push(normalizeUrl(m.src));
          else if (m.preview_image && m.preview_image.src) imgs.push(normalizeUrl(m.preview_image.src));
        });
      }

      if (Array.isArray(p.images)) {
        p.images.forEach(i => imgs.push(normalizeUrl(i)));
      }

      if (imgs.length > 0) {
        console.log('✅ Imagens encontradas via window.meta.product:', imgs.length);
        return [...new Set(imgs)];
      }
    }

    // 2. Tenta ShopifyAnalytics
    if (
      window.ShopifyAnalytics &&
      window.ShopifyAnalytics.meta &&
      window.ShopifyAnalytics.meta.product &&
      Array.isArray(window.ShopifyAnalytics.meta.product.images)
    ) {
      const imgs = window.ShopifyAnalytics.meta.product.images.map(i => normalizeUrl(i));
      console.log('✅ Imagens encontradas via ShopifyAnalytics:', imgs.length);
      return imgs;
    }

    // 3. Fallback universal: JSON do produto
    const handle = window.location.pathname.split('/products/')[1];
    if (handle) {
      try {
        const res = await fetch('/products/' + handle + '.js');
        const product = await res.json();
        if (Array.isArray(product.images)) {
          const imgs = product.images.map(i => normalizeUrl(i));
          console.log('✅ Imagens encontradas via product.js:', imgs.length);
          return imgs;
        }
      } catch (e) {
        console.error('Erro ao buscar produto:', e);
      }
    }

    return [];
  }

  // Função para obter imagem do produto na página
  function getProductImageFromPage() {
    // 1. Prioridade: elemento #omafit-featured-image
    const omafitImage = document.querySelector('#omafit-featured-image');
    if (omafitImage) {
      // Tentar data-src primeiro
      if (omafitImage.dataset && omafitImage.dataset.src) {
        console.log('✅ Imagem encontrada via #omafit-featured-image[data-src]');
        return normalizeUrl(omafitImage.dataset.src);
      }
      // Fallback para src (se for uma img)
      if (omafitImage.src) {
        console.log('✅ Imagem encontrada via #omafit-featured-image[src]');
        return normalizeUrl(omafitImage.src);
      }
      // Fallback para atributo data-src como string
      const dataSrcAttr = omafitImage.getAttribute('data-src');
      if (dataSrcAttr) {
        console.log('✅ Imagem encontrada via #omafit-featured-image[data-src] (getAttribute)');
        return normalizeUrl(dataSrcAttr);
      }
    }

    // 2. Tentar meta tag og:image
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const content = ogImage.getAttribute('content');
      if (content) {
        console.log('✅ Imagem encontrada via og:image');
        return normalizeUrl(content);
      }
    }

    // 3. Shopify específico
    const shopifySelectors = [
      '.product__media--featured img',
      '.product__media img[src*="cdn.shopify.com"]',
      '.product-single__photo img',
      '[data-product-featured-media] img'
    ];

    for (const selector of shopifySelectors) {
      const img = document.querySelector(selector);
      if (img && img.src) {
        console.log('✅ Imagem encontrada via seletor Shopify:', selector);
        return normalizeUrl(img.src);
      }
    }

    // 4. Fallback: primeira imagem grande
    const allImages = document.querySelectorAll('.product__media img, .product img, [class*="product"] img');
    for (const img of allImages) {
      if (img.naturalWidth > 300 && img.naturalHeight > 300) {
        console.log('✅ Imagem encontrada via fallback (imagem grande)');
        return normalizeUrl(img.src);
      }
    }

    console.warn('⚠️ Nenhuma imagem de produto encontrada');
    console.log('💡 Dica: Adicione um elemento com id="omafit-featured-image" e data-src="URL_DA_IMAGEM" na sua página');
    return null;
  }

  // Captura info do produto (Shopify)
  function getProductInfo() {
    let productId = '';
    let productName = '';

    if (window.meta && window.meta.product) {
      productId = window.meta.product.id;
      productName = window.meta.product.title;
    } else if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.product) {
      productId = window.ShopifyAnalytics.meta.product.id;
      productName = window.ShopifyAnalytics.meta.product.name;
    } else {
      const nameEl = document.querySelector('.product-single__title, h1.product__title, .product__title, [itemprop="name"]');
      if (nameEl) productName = nameEl.textContent.trim();

      const idEl = document.querySelector('[data-product-id]');
      if (idEl) productId = idEl.getAttribute('data-product-id');
    }

    return { productId, productName };
  }

  // Configuração do OmaFit
  const productInfo = getProductInfo();
  const OMAFIT_CONFIG = {
    apiUrl: '${currentUrl}',
    publicId: '${publicId}',
    productId: productInfo.productId,
    productName: productInfo.productName,
    getProductImage: getProductImageFromPage,
    linkText: '${linkText.replace(/'/g, "\\'")}',
    storeName: '${storeName.replace(/'/g, "\\'")}',
    storeLogo: '${storeLogo.replace(/'/g, "\\'")}',
    fontFamily: '${selectedFont.replace(/'/g, "\\'")}',
    colors: {
      primary: '${popupColor}',
      background: '#ffffff',
      text: '${linkColor}',
      overlay: '${popupColor}CC'
    }
  };

  // Função para abrir o modal
  window.openOmafitModal = async function() {
    // Obter a imagem atual do produto na página
    const productImage = OMAFIT_CONFIG.getProductImage();

    if (!productImage) {
      alert('Não foi possível detectar a imagem do produto nesta página.\\nVerifique se você está em uma página de produto.');
      return;
    }


    // Obter todas as imagens do produto dos dados do Shopify
    const allProductImages = await getOnlyProductImages();
    console.log('📸 Total de imagens encontradas:', allProductImages.length);

    // Detectar se é mobile
    const isMobile = window.innerWidth <= 768;

    // Criar overlay
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

    // Criar iframe do widget com a imagem do produto
    const iframe = document.createElement('iframe');

    const config = {
      storeName: OMAFIT_CONFIG.storeName || 'Omafit',
      primaryColor: OMAFIT_CONFIG.colors.primary,
      storeLogo: OMAFIT_CONFIG.storeLogo,
      fontFamily: OMAFIT_CONFIG.fontFamily
    };
    const widgetUrl = OMAFIT_CONFIG.apiUrl + '/widget?productImage=' + encodeURIComponent(productImage) +
      '&productImages=' + encodeURIComponent(JSON.stringify(allProductImages)) +
      '&productId=' + encodeURIComponent(OMAFIT_CONFIG.productId || 'unknown') +
      '&productName=' + encodeURIComponent(OMAFIT_CONFIG.productName || 'Produto') +
      '&publicId=' + encodeURIComponent(OMAFIT_CONFIG.publicId) +
      '&config=' + encodeURIComponent(JSON.stringify(config));
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

    // Adicionar container de loading com prévia da imagem
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
      'font-family: Outfit, sans-serif;' +
      'margin-top: 15px;' +
      'font-weight: 500;';
    loadingText.textContent = 'Carregando try-on virtual...';

    // Adicionar loading spinner
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

    // Remover spinner quando iframe carregar
    iframe.addEventListener('load', function() {
      if (loadingContainer.parentNode) {
        loadingContainer.parentNode.removeChild(loadingContainer);
      }
    });

    // Tratamento de erro
    iframe.addEventListener('error', function() {
      if (loadingContainer.parentNode) {
        loadingContainer.innerHTML = '<div style="padding: 20px; text-align: center; background: white; border-radius: 12px; font-family: Outfit, sans-serif;">' +
          '<div style="font-size: 18px; margin-bottom: 10px;">⚠️ Erro ao carregar o widget</div>' +
          '<div style="font-size: 14px; opacity: 0.8; margin-top: 10px;">Tente novamente mais tarde</div>' +
          '</div>';
      }
    });

    // Adicionar keyframes para animação do spinner
    if (!document.getElementById('omafit-spinner-style')) {
      const spinnerStyle = document.createElement('style');
      spinnerStyle.id = 'omafit-spinner-style';
      spinnerStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(spinnerStyle);
    }


    // Container para o iframe e botão de fechar
    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText =
      'position: relative;' +
      'width: 95vw;' +
      'max-width: 1000px;' +
      'height: 85vh;' +
      'max-height: 800px;';

    // Botão de fechar
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

    // Hover effect
    closeButton.addEventListener('mouseenter', function() {
      this.style.opacity = '1';
    });
    closeButton.addEventListener('mouseleave', function() {
      this.style.opacity = '0.7';
    });

    // Eventos de fechamento
    const closeModal = function() {
      if (document.body.contains(overlay)) {
        // Animar saída
        overlay.style.background = 'rgba(0, 0, 0, 0)';
        overlay.style.backdropFilter = 'blur(0px)';
        overlay.style.opacity = '0';
        iframe.style.transform = 'scale(0.9)';
        iframe.style.opacity = '0';

        // Remover após a animação
        setTimeout(function() {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
            document.body.style.overflow = '';
          }
        }, 400);
      }
    };

    closeButton.addEventListener('click', closeModal);

    // No desktop, permite fechar clicando no overlay
    if (!isMobile) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          closeModal();
        }
      });
    }

    // Fechar com ESC
    const handleEscape = function(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Montar modal
    iframeContainer.appendChild(iframe);
    iframeContainer.appendChild(closeButton);
    overlay.appendChild(loadingContainer);
    overlay.appendChild(iframeContainer);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Animar entrada com delay para permitir o render
    setTimeout(function() {
      if (!isMobile) {
        overlay.style.background = 'rgba(0, 0, 0, 0.6)';
        overlay.style.backdropFilter = 'blur(4px)';
      }
      overlay.style.opacity = '1';
      iframe.style.transform = 'scale(1)';
      iframe.style.opacity = '1';
    }, 10);
  };

  // Aplicar estilos e eventos aos links
  function initializeLinks() {
    const links = document.querySelectorAll('.omafit-try-on-link');

    links.forEach(link => {
      // Aplicar estilos
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

      // Eventos de hover
      link.addEventListener('mouseenter', function() {
        this.style.opacity = '0.7';
        this.style.textDecorationThickness = '2px';
      });

      link.addEventListener('mouseleave', function() {
        this.style.opacity = '1';
        this.style.textDecorationThickness = '1px';
      });

      // Evento de click para abrir o modal
      link.addEventListener('click', function(e) {
        e.preventDefault();
        if (typeof window.openOmafitModal === 'function') {
          window.openOmafitModal();
        }
      });
    });
  }

  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLinks);
  } else {
    initializeLinks();
  }

  // CSS adicional para responsividade
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
})();
</script>`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateWidget());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const downloadWidget = () => {
    const content = generateWidget();
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omafit-widget-${selectedProduct?.name.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      tops: 'Blusas',
      dresses: 'Vestidos',
      bottoms: 'Calças',
      shoes: 'Sapatos',
      accessories: 'Acessórios'
    };
    return labels[category] || category;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('A imagem deve ter no máximo 10MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione apenas arquivos de imagem');
        return;
      }

      setModelImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTryOn = async () => {
    if (!modelImage || !selectedProduct || !customerEmail) {
      setError('Por favor, selecione um produto, informe seu e-mail e faça upload da sua foto');
      return;
    }

    setProcessing(true);
    setError('');
    setResult(null);

    try {
      const modelImageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(modelImage);
      });

      const payload = {
        model_image: modelImageDataUrl,
        garment_image: selectedProduct.garment_image,
        customer_email: customerEmail,
        product_name: selectedProduct.name,
        product_id: selectedProduct.id,
        public_id: publicId
      };

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tryon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no processamento da imagem');
      }

      const result = await response.json();

      if (result.success && result.fal_request_id) {
        startPolling(result.fal_request_id);
      } else {
        throw new Error(result.error || 'Erro no processamento');
      }
    } catch (error: any) {
      console.error('Erro no try-on:', error);
      setError(error.message || 'Erro no processamento da imagem');
      setProcessing(false);
    }
  };

  const startPolling = (predictionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const statusResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tryon-status/${predictionId}`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          }
        );

        if (!statusResponse.ok) {
          throw new Error('Erro ao verificar status');
        }

        const statusData = await statusResponse.json();

        if (statusData.status === 'completed' && statusData.output && statusData.output.length > 0) {
          clearInterval(pollInterval);
          setResult(statusData.output[0]);
          setProcessing(false);
        } else if (statusData.status === 'failed' || statusData.status === 'error') {
          clearInterval(pollInterval);
          setError('Falha no processamento da imagem. Tente novamente.');
          setProcessing(false);
        }
      } catch (error) {
        console.error('Erro no polling:', error);
        clearInterval(pollInterval);
        setError('Erro na verificação do status. Tente novamente.');
        setProcessing(false);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(pollInterval);
      if (processing) {
        setError('Tempo limite excedido. Tente novamente.');
        setProcessing(false);
      }
    }, 300000);
  };

  const resetTryOn = () => {
    setModelImage(null);
    setImagePreview(null);
    setResult(null);
    setError('');
    setProcessing(false);
    setCopiedResult(false);
  };

  const copyResultLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `tryon-resultado-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#810707] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">

      {/* Info Banner */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-4 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Settings className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Widget na Página do Produto</h3>
            <p className="text-gray-700">
              O widget exibe automaticamente o produto que está sendo visto pelo usuário na página do produto. O cliente escolhe o produto, faz upload da foto e vê o resultado instantaneamente. Personalize as cores e textos para combinar com a identidade da sua loja.
            </p>
          </div>
        </div>
      </div>

      {/* Widget Customization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-semibold text-[#810707] mb-4">Personalizar Widget</h3>

          <div className="space-y-6">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Logo da Marca
              </label>
              <div className="space-y-3">
                {storeLogo && (
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <img
                      src={storeLogo}
                      alt="Logo"
                      className="h-12 w-auto object-contain"
                    />
                    <button
                      onClick={() => setStoreLogo('')}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remover
                    </button>
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#810707] cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {uploadingLogo ? 'Enviando...' : 'Clique para fazer upload do logo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Este logo aparecerá no topo do widget
              </p>
              {error && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>


            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Texto do Link
              </label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent"
                placeholder="Experimentar virtualmente"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Cor do Texto do Link
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={linkColor}
                  onChange={(e) => setLinkColor(e.target.value)}
                  className="w-20 h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={linkColor}
                  onChange={(e) => setLinkColor(e.target.value)}
                  placeholder="#810707"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent uppercase"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Escolha a cor visualmente ou insira o código hex (ex: #810707)
              </p>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Cor Predominante do Pop-up
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={popupColor}
                  onChange={(e) => setPopupColor(e.target.value)}
                  className="w-20 h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={popupColor}
                  onChange={(e) => setPopupColor(e.target.value)}
                  placeholder="#810707"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent uppercase"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Escolha a cor visualmente ou insira o código hex (ex: #810707)
              </p>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Fonte do Widget
              </label>
              <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400&family=Playfair+Display:wght@400&family=Raleway:wght@400&family=Inter:wght@400&family=Roboto:wght@400&family=Open+Sans:wght@400&family=Montserrat:wght@400&family=Lato:wght@400&family=Poppins:wght@400&display=swap');
                .font-selector option { padding: 8px 0; }
              `}</style>
              <select
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                className="font-selector w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent text-base"
                style={{ fontFamily: selectedFont }}
              >
                <option value="Outfit" style={{ fontFamily: 'Outfit, sans-serif' }}>Outfit</option>
                <option value="Playfair Display" style={{ fontFamily: 'Playfair Display, serif' }}>Playfair Display</option>
                <option value="Raleway" style={{ fontFamily: 'Raleway, sans-serif' }}>Raleway</option>
                <option value="Inter" style={{ fontFamily: 'Inter, sans-serif' }}>Inter</option>
                <option value="Roboto" style={{ fontFamily: 'Roboto, sans-serif' }}>Roboto</option>
                <option value="Open Sans" style={{ fontFamily: 'Open Sans, sans-serif' }}>Open Sans</option>
                <option value="Montserrat" style={{ fontFamily: 'Montserrat, sans-serif' }}>Montserrat</option>
                <option value="Lato" style={{ fontFamily: 'Lato, sans-serif' }}>Lato</option>
                <option value="Poppins" style={{ fontFamily: 'Poppins, sans-serif' }}>Poppins</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Selecione a fonte que será usada em todo o widget
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Preview do Link:</h4>
              <div className="bg-white p-4 rounded border">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="underline underline-offset-[3px] hover:opacity-70 transition-opacity"
                  style={{ color: linkColor, textDecorationColor: linkColor, fontFamily: 'inherit' }}
                >
                  {linkText}
                </a>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * O link e o widget herdam automaticamente a tipografia do tema da sua loja
              </p>
            </div>
          </div>
        </div>

        {/* Widget Code */}
        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h3 className="text-lg md:text-xl font-semibold text-[#810707]">Código do Widget</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-2 text-[#810707] border border-[#810707] rounded-lg hover:bg-[#810707] hover:text-white transition-all flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Ocultar' : 'Preview'}
              </button>
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  copied 
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-[#810707] text-white hover:bg-red-800'
                }`}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                onClick={downloadWidget}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>

          {showPreview && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Preview do Modal:</h4>
              <style>{`
                @import url('https://fonts.googleapis.com/css2?family=${selectedFont.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap');
              `}</style>
              <div className="p-4 rounded-lg" style={{ backgroundColor: popupColor }}>
                <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md mx-auto" style={{ fontFamily: selectedFont }}>
                  {/* Header */}
                  <div className="bg-white border-b border-gray-200 p-3">
                    <div className="flex items-center justify-center relative">
                      {storeLogo ? (
                        <img src={storeLogo} alt="Logo" className="h-8 object-contain" />
                      ) : (
                        <span className="text-lg font-semibold" style={{ color: popupColor }}>Omafit</span>
                      )}
                    </div>
                  </div>
                  {/* Content */}
                  <div className="p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Camisa Polo Premium</h3>
                      <p className="text-sm text-gray-500">Produto de exemplo</p>
                    </div>
                    <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-4 overflow-hidden">
                      <img
                        src="https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=400"
                        alt="Modelo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Step info simulation */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Altura (cm)</label>
                        <input
                          type="text"
                          value="175"
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                        <input
                          type="text"
                          value="70"
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        />
                      </div>
                      <button
                        className="w-full py-3 rounded-lg text-white font-medium text-sm transition-colors"
                        style={{ backgroundColor: popupColor }}
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96">
            <pre className="text-sm whitespace-pre-wrap font-mono">{generateWidget()}</pre>
          </div>
        </div>
      </div>

      {/* Installation Instructions */}
      <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-[#810707] mb-4">Como Instalar no Shopify</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Método 1: Template do Produto</h4>
            <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
              <li>Vá para <strong>Online Store → Themes</strong></li>
              <li>Clique em <strong>Actions → Edit code</strong></li>
              <li>Encontre <code>templates/product.liquid</code></li>              
              <li>Cole o código onde deseja que o link apareça</li>
              <li>Salve as alterações</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium text-gray-800 mb-3">Método 2: Seção Personalizada</h4>
            <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
              <li>Crie um novo arquivo em <code>sections/</code></li>
              <li>Cole o código do widget</li>
              <li>Adicione a seção no template do produto</li>
              <li>Configure via Theme Customizer</li>
              <li>Publique as alterações</li>
            </ol>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">🎯 Fluxo do Cliente</h4>
          <ol className="text-green-700 text-sm space-y-2 list-decimal list-inside">
            <li><strong>Cliente clica</strong> no link "{linkText}"</li>
            <li><strong>Modal abre</strong> exibindo o produto visualizado pelo usuário na página do produto</li>
            <li><strong>Cliente informa</strong> suas medidas</li>
            <li><strong>Cliente faz upload</strong> da foto seguindo as instruções</li>
            <li><strong>IA processa</strong> e exibe o resultado em tempo real</li>
            <li><strong>Cliente decide</strong> adicionar ao carrinho ou testar outro produto</li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">💡 Dicas de Posicionamento</h4>
          <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
            <li><strong>Próximo ao botão de carrinho</strong> - Área mais decisiva da venda</li>
            <li><strong>Perto da descrição do produto</strong> - Onde o cliente pode se interessar</li>
           
          </ul>
        </div>
      </div>


      {/* Widget Features */}
      <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-[#810707] mb-4">Características do Widget</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#810707] bg-opacity-10 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Code className="w-6 h-6 text-[#810707]" />
            </div>
            <h4 className="font-medium text-gray-800 mb-2">Catálogo Integrado</h4>
            <p className="text-sm text-gray-600">Exibe automaticamente o produto visualizado na página do produto</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-[#810707] bg-opacity-10 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Settings className="w-6 h-6 text-[#810707]" />
            </div>
            <h4 className="font-medium text-gray-800 mb-2">Busca e Filtros</h4>
            <p className="text-sm text-gray-600">Cliente encontra produtos facilmente com busca integrada</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-[#810707] bg-opacity-10 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Eye className="w-6 h-6 text-[#810707]" />
            </div>
            <h4 className="font-medium text-gray-800 mb-2">UX Impecável</h4>
            <p className="text-sm text-gray-600">Fluxo intuitivo e responsivo do início ao fim</p>
          </div>
        </div>
      </div>
    </div>
  );
}