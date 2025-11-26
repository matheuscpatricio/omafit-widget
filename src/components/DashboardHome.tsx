import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Package, TrendingUp, Eye, Plus, ArrowRight, Code, Zap, Coins } from 'lucide-react';
import type { Database } from '../lib/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type TryonSession = Database['public']['Tables']['tryon_sessions']['Row'];

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  images_limit: number;
  images_used: number;
  period_start: string;
  period_end: string;
}

interface DashboardStats {
  totalProducts: number;
  totalTryons: number;
  successfulTryons: number;
  recentProducts: Product[];
  subscription: Subscription | null;
}

const getPlanNameFromLimit = (imagesLimit: number): string => {
  if (imagesLimit === -1) return 'Unlimited';
  if (imagesLimit === 100) return 'Basic - 100 imagens';
  if (imagesLimit === 500) return 'Starter - 500 imagens';
  if (imagesLimit === 1000) return 'Growth - 1000 imagens';
  if (imagesLimit === 3000) return 'Scale - 3000 imagens';
  return 'Unknown Plan';
};

interface DashboardHomeProps {
  onNavigate: (page: string) => void;
}

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Get products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (productsError) throw productsError;

      // Get all sessions for stats
      const { data: allSessions, error: allSessionsError } = await supabase
        .from('tryon_sessions')
        .select('*');

      if (allSessionsError) throw allSessionsError;

      // Get user subscription
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (subscriptionError) throw subscriptionError;

      const totalProducts = products?.length || 0;
      const totalTryons = allSessions?.length || 0;
      const successfulTryons = allSessions?.filter(s => s.fashn_status === 'completed').length || 0;

      setStats({
        totalProducts,
        totalTryons,
        successfulTryons,
        recentProducts: products || [],
        subscription: subscription || null
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const getUserName = () => {
    return user?.user_metadata?.name || user?.email?.split('@')[0] || 'Cliente';
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#810707] to-red-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Bem-vindo, {getUserName()}!
            </h1>
            <p className="text-red-100 text-lg mb-4">
              Aqui estão alguns insights para usufruir do Omafit da melhor maneira
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Sistema ativo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span>IA processando</span>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
              <Zap className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Dicas para maximizar seus resultados</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-semibold">Posicione o widget estrategicamente:</span> Coloque o botão de try-on próximo ao botão "Adicionar ao Carrinho" na página do produto para aumentar a taxa de conversão em até 40%
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-semibold">Use imagens de alta qualidade:</span> Fotos dos produtos com boa iluminação e fundo limpo geram resultados de try-on muito mais realistas
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-semibold">Acompanhe as métricas:</span> Verifique regularmente o Analytics para entender quais produtos têm mais engajamento e ajustar sua estratégia
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-semibold">Personalize o widget:</span> Ajuste as cores e textos do widget para combinar com a identidade visual da sua loja
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-semibold">Promova a função:</span> Destaque o try-on virtual em suas campanhas de marketing para aumentar o engajamento dos clientes
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Tokens Disponíveis</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {stats?.subscription
                  ? (stats.subscription.images_limit === -1
                    ? '∞'
                    : (stats.subscription.images_limit - stats.subscription.images_used))
                  : 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Coins className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {stats?.subscription && stats.subscription.images_limit !== -1
              ? `${stats.subscription.images_used} usados de ${stats.subscription.images_limit}`
              : stats?.subscription?.images_limit === -1
              ? 'Tokens ilimitados'
              : 'Nenhum plano ativo'}
          </div>
          {stats?.subscription && (
            <div className="mt-2 text-xs text-gray-400">
              {getPlanNameFromLimit(stats.subscription.images_limit)}
            </div>
          )}
          <button
            onClick={() => onNavigate('pricing')}
            className="mt-4 text-orange-600 text-sm font-medium hover:text-orange-700 flex items-center gap-1"
          >
            Gerenciar plano <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Produtos Cadastrados</p>
              <p className="text-3xl font-bold text-[#810707] mt-1">{stats?.totalProducts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-[#810707]" />
            </div>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="mt-4 text-[#810707] text-sm font-medium hover:text-red-800 flex items-center gap-1"
          >
            Gerenciar produtos <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Try-ons Realizados</p>
              <p className="text-3xl font-bold text-cyan-600 mt-1">{stats?.totalTryons || 0}</p>
            </div>
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
          <button
            onClick={() => onNavigate('analytics')}
            className="mt-4 text-cyan-600 text-sm font-medium hover:text-cyan-700 flex items-center gap-1"
          >
            Ver analytics <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Taxa de Sucesso</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats?.totalTryons ? Math.round((stats.successfulTryons / stats.totalTryons) * 100) : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-green-600 text-sm font-medium">
            {stats?.successfulTryons || 0} de {stats?.totalTryons || 0} concluídos
          </div>
        </div>
      </div>

      {/* Recent Products */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Produtos Recentes</h3>
            <button
              onClick={() => onNavigate('products')}
              className="text-[#810707] text-sm font-medium hover:text-red-800"
            >
              Ver todos
            </button>
          </div>
        </div>

        <div className="p-6">
          {stats?.recentProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Nenhum produto cadastrado</p>
              <button
                onClick={() => onNavigate('products')}
                className="bg-gradient-to-r from-[#810707] to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-800 hover:to-red-900 transition-all flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Adicionar Produto
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {stats?.recentProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                    {product.garment_image ? (
                      <img
                        src={product.garment_image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{product.name}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(product.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button className="text-[#810707] hover:text-red-800 p-1">
                    <Code className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate('products')}
            className="p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all text-left"
          >
            <Plus className="w-6 h-6 text-[#810707] mb-2" />
            <h4 className="font-medium text-gray-800">Adicionar Produto</h4>
            <p className="text-sm text-gray-600">Cadastre um novo produto para try-on</p>
          </button>

          <button
            onClick={() => onNavigate('shopify')}
            className="p-4 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-all text-left"
          >
            <Code className="w-6 h-6 text-cyan-600 mb-2" />
            <h4 className="font-medium text-gray-800">Integrar Shopify</h4>
            <p className="text-sm text-gray-600">Configure sua loja Shopify</p>
          </button>

          <button
            onClick={() => onNavigate('analytics')}
            className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all text-left"
          >
            <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-800">Ver Analytics</h4>
            <p className="text-sm text-gray-600">Acompanhe performance dos produtos</p>
          </button>
        </div>
      </div>
    </div>
  );
}