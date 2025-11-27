import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Save, Key, User, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function SettingsPage() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadApiKey();
  }, [user]);

  const loadApiKey = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('api_config')
        .select('key_value')
        .eq('user_id', user.id)
        .in('key_name', ['fal_api_key', 'fashn_api_key'])
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setApiKey(data.key_value);
      }
    } catch (err) {
      console.error('Error loading API key:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!user || !apiKey.trim()) {
      setError('Por favor, insira uma chave de API válida');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data: existing } = await supabase
        .from('api_config')
        .select('id')
        .eq('user_id', user.id)
        .in('key_name', ['fal_api_key', 'fashn_api_key'])
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('api_config')
          .update({
            key_value: apiKey,
            key_name: 'fal_api_key',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('api_config')
          .insert({
            user_id: user.id,
            key_name: 'fal_api_key',
            key_value: apiKey
          });

        if (error) throw error;
      }

      alert('✅ Chave da API salva com sucesso!');
    } catch (err) {
      console.error('Error saving API key:', err);
      setError('Erro ao salvar chave da API. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800">Configurações</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Account Info */}
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-800">Conta</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1 w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700">ID do Usuário</label>
              <input
                type="text"
                value={user?.id || ''}
                disabled
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-800">API Fashn.ai</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Chave da API
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                disabled={loading}
                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtenha sua chave em <a href="https://www.fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">fal.ai</a>
              </p>
              {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
              )}
            </div>

            <button
              onClick={handleSaveApiKey}
              disabled={saving || loading}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-2 rounded-lg hover:from-purple-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : loading ? 'Carregando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-800">Segurança</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Autenticação 2FA</span>
              <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Em breve
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Logs de Acesso</span>
              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                Ativo
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Backup Automático</span>
              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                Ativo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Instructions */}
      <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Como usar o Widget</h3>
        <div className="prose prose-sm max-w-none">
          <ol className="space-y-2">
            <li>Cadastre seus produtos na seção "Produtos"</li>
            <li>Clique em "Ver Detalhes" do produto desejado</li>
            <li>Copie o código do widget gerado</li>
            <li>Cole o código na sua loja online onde deseja que o botão apareça</li>
            <li>Suas clientes poderão fazer try-ons virtuais diretamente da sua loja</li>
          </ol>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Dica:</strong> O widget se adapta automaticamente ao design da sua loja e funciona em qualquer plataforma de e-commerce.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}