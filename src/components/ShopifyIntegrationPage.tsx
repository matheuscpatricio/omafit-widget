import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Save, Store, Key, Globe, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import type { Database } from '../lib/supabase';

type ShopifyStore = Database['public']['Tables']['shopify_stores']['Row'];

export function ShopifyIntegrationPage() {
  const { user } = useAuth();
  const [store, setStore] = useState<ShopifyStore | null>(null);
  const [formData, setFormData] = useState({
    store_url: '',
    access_token: '',
    api_key: '',
    api_secret: '',
    store_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchShopifyStore();
  }, []);

  const fetchShopifyStore = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shopify_stores')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setStore(data);
        setFormData({
          store_url: data.store_url,
          access_token: data.access_token,
          api_key: data.api_key,
          api_secret: data.api_secret,
          store_name: data.store_name || '',
        });
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Validate store URL
      if (!formData.store_url.includes('.myshopify.com')) {
        throw new Error('URL da loja deve ser no formato: sua-loja.myshopify.com');
      }

      const storeData = {
        user_id: user.id,
        store_url: formData.store_url,
        access_token: formData.access_token,
        api_key: formData.api_key,
        api_secret: formData.api_secret,
        store_name: formData.store_name,
      };

      if (store) {
        // Update existing store
        const { error } = await supabase
          .from('shopify_stores')
          .update(storeData)
          .eq('id', store.id);

        if (error) throw error;
      } else {
        // Create new store
        const { data, error } = await supabase
          .from('shopify_stores')
          .insert([storeData])
          .select()
          .single();

        if (error) throw error;
        setStore(data);
      }

      setSuccess('Configurações do Shopify salvas com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <Store className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Integração Shopify</h2>
          <p className="text-sm md:text-base text-gray-600">Configure sua loja Shopify para usar o Omafit</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Configuration Form */}
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
            Configurações da API
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                URL da Loja
              </label>
              <input
                type="text"
                value={formData.store_url}
                onChange={(e) => setFormData({ ...formData, store_url: e.target.value })}
                placeholder="sua-loja.myshopify.com"
                required
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Nome da Loja (opcional)
              </label>
              <input
                type="text"
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                placeholder="Minha Loja Fashion"
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                Token de Acesso
              </label>
              <input
                type="password"
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                placeholder="shpat_..."
                required
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Chave da API
              </label>
              <input
                type="text"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="API Key"
                required
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Chave Secreta da API
              </label>
              <input
                type="password"
                value={formData.api_secret}
                onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                placeholder="API Secret"
                required
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </form>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
            Como Configurar
          </h3>

          <div className="space-y-4 text-xs md:text-sm">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Passo 1: Criar App Privado</h4>
              <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                <li>Acesse o admin da sua loja Shopify</li>
                <li>Vá em "Apps" → "Develop apps"</li>
                <li>Clique em "Create an app"</li>
                <li>Configure as permissões necessárias</li>
              </ol>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Passo 2: Permissões Necessárias</h4>
              <ul className="text-green-700 space-y-1 list-disc list-inside">
                <li><code>read_products</code> - Ler produtos</li>
                <li><code>read_themes</code> - Ler temas</li>
                <li><code>write_themes</code> - Modificar temas</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Passo 3: Obter Credenciais</h4>
              <ul className="text-yellow-700 space-y-1 list-disc list-inside">
                <li>Copie o <strong>Access Token</strong></li>
                <li>Copie a <strong>API Key</strong></li>
                <li>Copie a <strong>API Secret</strong></li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <a
                href="https://help.shopify.com/en/manual/apps/private-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Documentação Oficial Shopify
              </a>
            </div>
          </div>
        </div>
      </div>

      {store && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-base md:text-lg font-semibold text-green-800">
              Loja Conectada com Sucesso!
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
            <div>
              <span className="font-medium text-green-800">Loja:</span>
              <span className="text-green-700 ml-2">{store.store_url}</span>
            </div>
            {store.store_name && (
              <div>
                <span className="font-medium text-green-800">Nome:</span>
                <span className="text-green-700 ml-2">{store.store_name}</span>
              </div>
            )}
          </div>
          <p className="text-green-700 mt-3">
            Agora você pode criar widgets personalizados para seus produtos e instalá-los na sua loja Shopify.
          </p>
        </div>
      )}
    </div>
  );
}