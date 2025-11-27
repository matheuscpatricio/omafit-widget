import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Key, User, Shield } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();

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
            <h3 className="text-base md:text-lg font-semibold text-gray-800">API Status</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Processamento de IA</span>
              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                Ativo
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Try-On Virtual</span>
              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                Ativo
              </span>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                Todos os recursos de IA estão configurados e prontos para uso.
              </p>
            </div>
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