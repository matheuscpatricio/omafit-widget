import React, { useState, useEffect } from 'react';
import { Save, Store, Globe, Key, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface ShopifyConfig {
  storeUrl: string;
  accessToken: string;
  apiKey: string;
  apiSecret: string;
  storeName: string;
}

export function ShopifyConfigPage() {
  const [config, setConfig] = useState<ShopifyConfig>({
    storeUrl: '',
    accessToken: '',
    apiKey: '',
    apiSecret: '',
    storeName: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load saved config from localStorage
    const savedConfig = localStorage.getItem('shopify_config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
      setSaved(true);
    }
  }, []);

  const handleSave = async () => {
    if (!config.storeUrl || !config.accessToken || !config.apiKey || !config.apiSecret) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (!config.storeUrl.includes('.myshopify.com')) {
      setError('URL da loja deve ser no formato: sua-loja.myshopify.com');
      return;
    }

    setSaving(true);
    setError('');

    try {
      localStorage.setItem('shopify_config', JSON.stringify(config));
      setSaved(true);
      
      setTimeout(() => {
        setSaving(false);
      }, 1000);
    } catch (err) {
      setError('Erro ao salvar configurações');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-[#810707]">Configurações da Loja</h3>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {saved && !saving && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-green-700 text-sm">Configurações salvas com sucesso!</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                URL da Loja *
              </label>
              <input
                type="text"
                value={config.storeUrl}
                onChange={(e) => setConfig({ ...config, storeUrl: e.target.value })}
                placeholder="sua-loja.myshopify.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Loja
              </label>
              <input
                type="text"
                value={config.storeName}
                onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
                placeholder="Minha Loja Fashion"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                Access Token *
              </label>
              <input
                type="password"
                value={config.accessToken}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                placeholder="shpat_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key *
              </label>
              <input
                type="text"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="API Key"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Secret *
              </label>
              <input
                type="password"
                value={config.apiSecret}
                onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                placeholder="API Secret"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#810707] text-white py-3 rounded-lg hover:bg-[#440303] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-xl font-semibold text-[#810707] mb-4">Como Configurar</h3>

          <div className="space-y-4 text-sm">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Passo 1: Criar App Privado</h4>
              <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                <li>Acesse o admin da sua loja Shopify</li>
                <li>Vá em "Apps" → "App and sales channel settings"</li>
                <li>Clique em "Develop apps"</li>
                <li>Clique em "Create an app"</li>
              </ol>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Passo 2: Configurar Permissões</h4>
              <p className="text-green-700 mb-2">Configure as seguintes permissões:</p>
              <ul className="text-green-700 space-y-1 list-disc list-inside">
                <li><code>read_products</code> - Ler produtos</li>
                <li><code>read_themes</code> - Ler temas</li>
                <li><code>write_themes</code> - Modificar temas</li>
                <li><code>read_script_tags</code> - Ler script tags</li>
                <li><code>write_script_tags</code> - Criar script tags</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Passo 3: Obter Credenciais</h4>
              <ul className="text-yellow-700 space-y-1 list-disc list-inside">
                <li>Instale o app na sua loja</li>
                <li>Copie o <strong>Admin API access token</strong></li>
                <li>Copie a <strong>API key</strong></li>
                <li>Copie a <strong>API secret key</strong></li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <a
                href="https://help.shopify.com/en/manual/apps/app-types/private-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#810707] hover:text-[#440303] font-medium flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Documentação Oficial Shopify
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Required */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-xl font-semibold text-[#810707] mb-4">Permissões Necessárias no Shopify</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Admin API Access Scopes:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">read_products</code>
                <span className="text-sm text-gray-600">- Ler produtos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">read_themes</code>
                <span className="text-sm text-gray-600">- Ler temas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">write_themes</code>
                <span className="text-sm text-gray-600">- Modificar temas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">read_script_tags</code>
                <span className="text-sm text-gray-600">- Ler scripts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">write_script_tags</code>
                <span className="text-sm text-gray-600">- Criar scripts</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-800 mb-3">Opcional (Recomendado):</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-gray-400 rounded"></div>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">read_orders</code>
                <span className="text-sm text-gray-600">- Analytics avançados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-gray-400 rounded"></div>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">read_customers</code>
                <span className="text-sm text-gray-600">- Dados de clientes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}