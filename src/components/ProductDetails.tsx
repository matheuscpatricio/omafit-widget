import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Code, Users, TrendingUp, Calendar, Copy, CheckCircle, Download } from 'lucide-react';
import type { Database } from '../lib/supabase';
import { resolveSupabaseStorageDisplayUrl } from '../utils/supabaseStorageDisplayUrl';

type Product = Database['public']['Tables']['products']['Row'];
type TryonSession = Database['public']['Tables']['tryon_sessions']['Row'];

type TryonSessionWithDisplayUrls = TryonSession & {
  displayModelUrl: string | null;
  displayResultUrl: string | null;
};

interface ProductDetailsProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetails({ product, onClose }: ProductDetailsProps) {
  const [sessions, setSessions] = useState<TryonSessionWithDisplayUrls[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWidget, setShowWidget] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [product.id]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('tryon_sessions')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = data || [];
      const enriched: TryonSessionWithDisplayUrls[] = await Promise.all(
        rows.map(async (s) => ({
          ...s,
          displayModelUrl: await resolveSupabaseStorageDisplayUrl(s.model_image),
          displayResultUrl: await resolveSupabaseStorageDisplayUrl(s.result_image),
        })),
      );
      setSessions(enriched);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateJavaScriptWidget = () => {
    return `
<!-- Omafit Try-On Widget - ${product.name} -->
<div id="omafit-widget-${product.id}"></div>

<script>
(function() {
  // Configuração do Widget Omafit
  const OMAFIT_CONFIG = {
    productId: '${product.id}',
    productName: '${product.name.replace(/'/g, "\\'")}',
    productImage: '${product.garment_image || ''}',
    apiUrl: 'https://omafit.netlify.app',
    
    // Personalização Visual
    style: {
      buttonText: '✨ Experimentar Virtualmente',
      buttonColor: '#8B5CF6',
      buttonHoverColor: '#7C3AED',
      textColor: '#FFFFFF',
      borderRadius: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      padding: '14px 28px',
      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
      hoverBoxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
      transition: 'all 0.3s ease'
    }
  };

  // Função para criar o botão do widget
  function createOmafitButton() {
    const container = document.getElementById('omafit-widget-${product.id}');
    if (!container) {
      console.error('Container do widget Omafit não encontrado');
      return;
    }

    // Criar botão
    const button = document.createElement('button');
    button.innerHTML = OMAFIT_CONFIG.style.buttonText;
    button.className = 'omafit-try-on-button';
    
    // Aplicar estilos
    Object.assign(button.style, {
      background: OMAFIT_CONFIG.style.buttonColor,
      color: OMAFIT_CONFIG.style.textColor,
      padding: OMAFIT_CONFIG.style.padding,
      border: 'none',
      borderRadius: OMAFIT_CONFIG.style.borderRadius,
      cursor: 'pointer',
      fontWeight: '600',
      fontFamily: OMAFIT_CONFIG.style.fontFamily,
      fontSize: OMAFIT_CONFIG.style.fontSize,
      transition: OMAFIT_CONFIG.style.transition,
      boxShadow: OMAFIT_CONFIG.style.boxShadow,
      width: '100%',
      maxWidth: '300px',
      display: 'block',
      margin: '0 auto'
    });

    // Efeitos de hover
    button.addEventListener('mouseenter', function() {
      this.style.background = OMAFIT_CONFIG.style.buttonHoverColor;
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = OMAFIT_CONFIG.style.hoverBoxShadow;
    });

    button.addEventListener('mouseleave', function() {
      this.style.background = OMAFIT_CONFIG.style.buttonColor;
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = OMAFIT_CONFIG.style.boxShadow;
    });

    // Evento de clique
    button.addEventListener('click', function() {
      openOmafitModal();
    });

    container.appendChild(button);
  }

  // Função para abrir o modal
  function openOmafitModal() {
    // Criar overlay do modal
    const overlay = document.createElement('div');
    overlay.className = 'omafit-modal-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: '999999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      backdropFilter: 'blur(4px)'
    });

    // Criar iframe
    const iframe = document.createElement('iframe');
    iframe.src = OMAFIT_CONFIG.apiUrl + '/widget/' + OMAFIT_CONFIG.productId;
    Object.assign(iframe.style, {
      width: '95vw',
      maxWidth: '500px',
      height: '95vh',
      maxHeight: '800px',
      border: 'none',
      borderRadius: '16px',
      backgroundColor: '#FFFFFF',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
    });

    // Botão de fechar
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    Object.assign(closeButton.style, {
      position: 'absolute',
      top: '10px',
      right: '10px',
      width: '40px',
      height: '40px',
      border: 'none',
      borderRadius: '50%',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      color: '#333',
      fontSize: '24px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1000000'
    });

    closeButton.addEventListener('click', function() {
      document.body.removeChild(overlay);
      document.body.style.overflow = '';
    });

    // Fechar ao clicar no overlay
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        document.body.style.overflow = '';
      }
    });

    // Fechar com ESC
    const handleEscape = function(e) {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Montar modal
    overlay.appendChild(iframe);
    overlay.appendChild(closeButton);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  // Inicializar widget quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createOmafitButton);
  } else {
    createOmafitButton();
  }

  // CSS adicional para responsividade
  const style = document.createElement('style');
  style.textContent = \`
    @media (max-width: 768px) {
      .omafit-try-on-button {
        font-size: 18px !important;
        padding: 16px 24px !important;
      }
      .omafit-modal-overlay iframe {
        width: 100vw !important;
        height: 100vh !important;
        max-height: none !important;
        border-radius: 0 !important;
      }
    }
    
    .omafit-try-on-button:focus {
      outline: 2px solid #8B5CF6;
      outline-offset: 2px;
    }
    
    .omafit-try-on-button:active {
      transform: translateY(0) !important;
    }
  \`;
  document.head.appendChild(style);
})();
</script>

<!-- 
  INSTRUÇÕES DE USO:
  1. Copie este código completo
  2. Cole no HTML da sua página de produto
  3. O widget aparecerá automaticamente
  4. Totalmente responsivo e personalizável
  
  SUPORTE: Para dúvidas, acesse https://omafit.netlify.app
-->`.trim();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateJavaScriptWidget());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const downloadWidget = () => {
    const content = generateJavaScriptWidget();
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omafit-widget-${product.name.toLowerCase().replace(/\s+/g, '-')}.html`;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {product.garment_image ? (
                  <img
                    src={product.garment_image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400">Sem imagem</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Informações</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Categoria:</span>
                    <span className="font-medium">{getCategoryLabel(product.category)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Criado em:</span>
                    <span className="font-medium">{new Date(product.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {product.description && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Descrição</h3>
                  <p className="text-gray-600">{product.description}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Try-ons</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{sessions.length}</span>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-cyan-600" />
                    <span className="text-sm font-medium text-cyan-800">Sucesso</span>
                  </div>
                  <span className="text-2xl font-bold text-cyan-600">
                    {sessions.filter(s => s.fashn_status === 'completed').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Widget JavaScript Code */}
          <div className="bg-gradient-to-r from-purple-50 to-cyan-50 rounded-xl p-6 border">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Code className="w-6 h-6 text-purple-600" />
                  Widget JavaScript (100% Puro)
                </h3>
                <p className="text-gray-600 mt-1">Código completo para integrar em qualquer site</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    copied 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={downloadWidget}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>

            <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96">
              <pre className="text-sm whitespace-pre-wrap font-mono">{generateJavaScriptWidget()}</pre>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">✅ Vantagens</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• JavaScript 100% puro</li>
                  <li>• Sem dependências externas</li>
                  <li>• Totalmente responsivo</li>
                  <li>• Carregamento rápido</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">🚀 Como Usar</h4>
                <ol className="text-green-700 text-sm space-y-1">
                  <li>1. Copie o código completo</li>
                  <li>2. Cole no HTML da página</li>
                  <li>3. Widget aparece automaticamente</li>
                  <li>4. Funciona em qualquer site!</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">⚙️ Personalização</h4>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• Cores customizáveis</li>
                  <li>• Texto personalizável</li>
                  <li>• Estilos adaptáveis</li>
                  <li>• Modal responsivo</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Try-on Sessions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sessões de Try-On</h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma sessão de try-on ainda
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium text-gray-800">{session.customer_email}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-500">
                            {new Date(session.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.fashn_status)}`}>
                        {session.fashn_status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <span className="text-sm font-medium text-gray-700 block mb-2">Foto da Cliente</span>
                        <img
                          src={session.displayModelUrl || session.model_image || ''}
                          alt="Cliente"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                      {session.result_image && (
                        <div>
                          <span className="text-sm font-medium text-gray-700 block mb-2">Resultado</span>
                          <img
                            src={session.displayResultUrl || session.result_image || ''}
                            alt="Resultado"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}