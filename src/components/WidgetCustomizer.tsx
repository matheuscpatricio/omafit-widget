import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Save, Upload } from 'lucide-react';
import type { Database } from '../lib/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type WidgetConfig = Database['public']['Tables']['widget_configurations']['Row'];

interface WidgetCustomizerProps {
  product: Product;
  onClose: () => void;
}

export function WidgetCustomizer({ product, onClose }: WidgetCustomizerProps) {
  const { user } = useAuth();
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [formData, setFormData] = useState({
    title: 'Experimente Virtualmente',
    subtitle: 'Veja como fica em você usando nossa IA',
    modal_config: {
      backgroundColor: '#FFFFFF',
      primaryColor: '#8B5CF6',
      secondaryColor: '#06B6D4',
      textColor: '#1F2937',
      borderRadius: '12px',
      fontFamily: 'Outfit, sans-serif',
      buttonStyle: 'gradient',
      showBrand: true,
      customCSS: '',
      storeName: '',
      storeLogo: '',
    },
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWidgetConfig();
  }, [product.id]);

  const fetchWidgetConfig = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('widget_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig(data);
        setFormData({
          title: data.title,
          subtitle: data.subtitle,
          modal_config: {
            backgroundColor: '#FFFFFF',
            primaryColor: '#8B5CF6',
            secondaryColor: '#06B6D4',
            textColor: '#1F2937',
            borderRadius: '12px',
            fontFamily: 'Outfit, sans-serif',
            buttonStyle: 'gradient',
            showBrand: true,
            customCSS: '',
            storeName: '',
            storeLogo: '',
            ...data.modal_config,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching widget config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData({
        ...formData,
        modal_config: { ...formData.modal_config, storeLogo: publicUrl }
      });

      alert('Logo enviado com sucesso!');
    } catch (error: any) {
      alert('Erro ao enviar logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const configData = {
        user_id: user.id,
        product_id: product.id,
        title: formData.title,
        subtitle: formData.subtitle,
        modal_config: formData.modal_config,
      };

      if (config) {
        const { error } = await supabase
          .from('widget_configurations')
          .update(configData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('widget_configurations')
          .insert([configData])
          .select()
          .single();

        if (error) throw error;
        setConfig(data);
      }

      alert('Configurações salvas com sucesso!');
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const generateShopifyCode = () => {
    const modalConfig = formData.modal_config;
    
    return `{% comment %}
Omafit Virtual Try-On Widget
Produto: ${product.name}
{% endcomment %}

<div class="omafit-widget-container" style="margin: 20px 0;">
  <!-- Título e Subtítulo -->
  <div class="omafit-header" style="text-align: center; margin-bottom: 20px;">
    <h3 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: ${modalConfig.textColor};">
      ${formData.title}
    </h3>
    <p style="margin: 0; font-size: 16px; color: #6B7280;">
      ${formData.subtitle}
    </p>
  </div>

  <!-- Widget Button -->
  <div id="omafit-widget-${product.id}" 
       data-product-id="${product.id}"
       data-product-name="${product.name.replace(/"/g, '&quot;')}"
       data-product-image="${product.garment_image || ''}"
       data-modal-config='${JSON.stringify(modalConfig)}'
       style="text-align: center;">
  </div>
</div>

<script>
(function() {
  var widgetId = 'omafit-widget-${product.id}';
  var widget = document.getElementById(widgetId);
  
  if (!widget) return;
  
  var config = {
    productId: widget.getAttribute('data-product-id'),
    productName: widget.getAttribute('data-product-name'),
    productImage: widget.getAttribute('data-product-image'),
    modalConfig: JSON.parse(widget.getAttribute('data-modal-config') || '{}')
  };
  
  // Create button
  var button = document.createElement('button');
  button.innerHTML = '✨ Experimentar Virtualmente';
  button.className = 'omafit-try-on-btn';
  
  // Button styles
  var buttonStyle = '';
  if (config.modalConfig.buttonStyle === 'gradient') {
    buttonStyle = 'background: linear-gradient(135deg, ' + config.modalConfig.primaryColor + ', ' + config.modalConfig.secondaryColor + ');';
  } else {
    buttonStyle = 'background: ' + config.modalConfig.primaryColor + ';';
  }
  
  button.style.cssText = 
    buttonStyle +
    'color: white;' +
    'padding: 16px 32px;' +
    'border: none;' +
    'border-radius: ' + config.modalConfig.borderRadius + ';' +
    'cursor: pointer;' +
    'font-weight: 600;' +
    'font-family: ' + config.modalConfig.fontFamily + ';' +
    'font-size: 16px;' +
    'transition: all 0.3s ease;' +
    'box-shadow: 0 4px 12px rgba(0,0,0,0.15);' +
    'width: 100%;' +
    'max-width: 300px;';
  
  // Hover effects
  button.onmouseover = function() {
    this.style.transform = 'translateY(-2px)';
    this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
  };
  
  button.onmouseout = function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  };
  
  // Click handler
  button.onclick = function() {
    openOmafitModal(config);
  };
  
  widget.appendChild(button);
  
  // Modal function
  window.openOmafitModal = function(config) {
    var modal = document.createElement('div');
    modal.className = 'omafit-modal-overlay';
    modal.style.cssText =
      'position: fixed;' +
      'top: 0;' +
      'left: 0;' +
      'width: 100%;' +
      'height: 100%;' +
      'background: rgba(0,0,0,0);' +
      'z-index: 10000;' +
      'display: flex;' +
      'align-items: center;' +
      'justify-content: center;' +
      'padding: 20px;' +
      'box-sizing: border-box;' +
      'transition: background 0.3s ease;' +
      'opacity: 0;';

    var iframe = document.createElement('iframe');
    iframe.src = '${window.location.origin}/widget/' + config.productId + '?config=' + encodeURIComponent(JSON.stringify(config.modalConfig));
    iframe.style.cssText =
      'width: 100%;' +
      'max-width: 1000px;' +
      'height: 85vh;' +
      'max-height: 800px;' +
      'border: none;' +
      'border-radius: ' + config.modalConfig.borderRadius + ';' +
      'background: ' + config.modalConfig.backgroundColor + ';' +
      'box-shadow: 0 20px 40px rgba(0,0,0,0.3);' +
      'transform: scale(0.9);' +
      'transition: transform 0.3s ease;';

    modal.appendChild(iframe);

    // Animate in
    document.body.appendChild(modal);
    setTimeout(function() {
      modal.style.background = 'rgba(0,0,0,0.8)';
      modal.style.opacity = '1';
      iframe.style.transform = 'scale(1)';
    }, 10);

    // Close function
    var closeModal = function() {
      modal.style.background = 'rgba(0,0,0,0)';
      modal.style.opacity = '0';
      iframe.style.transform = 'scale(0.9)';
      setTimeout(function() {
        if (modal.parentNode) {
          document.body.removeChild(modal);
        }
      }, 300);
    };

    // Close on overlay click
    modal.onclick = function(e) {
      if (e.target === modal) {
        closeModal();
      }
    };

    // Close on escape key
    var closeOnEscape = function(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', closeOnEscape);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
  };
  
  // Custom CSS
  if (config.modalConfig.customCSS) {
    var style = document.createElement('style');
    style.textContent = config.modalConfig.customCSS;
    document.head.appendChild(style);
  }
})();
</script>

<style>
  .omafit-widget-container {
    font-family: ${modalConfig.fontFamily};
  }
  
  .omafit-try-on-btn:focus {
    outline: 2px solid ${modalConfig.primaryColor};
    outline-offset: 2px;
  }
  
  @media (max-width: 768px) {
    .omafit-try-on-btn {
      font-size: 18px !important;
      padding: 18px 24px !important;
    }
    
    .omafit-header h3 {
      font-size: 20px !important;
    }
    
    .omafit-header p {
      font-size: 14px !important;
    }
  }
</style>`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Personalizar Widget</h2>
            <p className="text-gray-600">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
          <div className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Configurações do Widget</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo da Marca
                </label>
                <div className="space-y-3">
                  {formData.modal_config.storeLogo && (
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <img
                        src={formData.modal_config.storeLogo}
                        alt="Logo"
                        className="h-12 w-auto object-contain"
                      />
                      <button
                        onClick={() => setFormData({
                          ...formData,
                          modal_config: { ...formData.modal_config, storeLogo: '' }
                        })}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 cursor-pointer transition-colors">
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
                <p className="mt-1 text-sm text-gray-500">
                  Este logo aparecerá no topo do widget
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fonte do Widget
                </label>
                <select
                  value={formData.modal_config.fontFamily}
                  onChange={(e) => setFormData({
                    ...formData,
                    modal_config: { ...formData.modal_config, fontFamily: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Outfit, sans-serif">Outfit (Atual)</option>
                  <option value="'Playfair Display', serif">Playfair Display</option>
                  <option value="Raleway, sans-serif">Raleway</option>
                  <option value="'Google Sans', sans-serif">Google Sans</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título Principal
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Experimente Virtualmente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtítulo
                </label>
                <textarea
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Veja como fica em você usando nossa IA"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor do Texto do Link
                  </label>
                  <input
                    type="color"
                    value={formData.modal_config.textColor}
                    onChange={(e) => setFormData({
                      ...formData,
                      modal_config: { ...formData.modal_config, textColor: e.target.value }
                    })}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor Predominante do Pop-up
                  </label>
                  <input
                    type="color"
                    value={formData.modal_config.primaryColor}
                    onChange={(e) => setFormData({
                      ...formData,
                      modal_config: { ...formData.modal_config, primaryColor: e.target.value }
                    })}
                    className="w-full h-10 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:from-purple-700 hover:to-cyan-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}