import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { TrendingUp, Users, Eye, Package, BarChart3, Zap } from 'lucide-react';

interface DashboardStats {
  totalTryons: number;
  successfulTryons: number;
  failedTryons: number;
}

interface Subscription {
  plan_id: string;
  images_limit: number;
  images_used: number;
  status: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTryons: 0,
    successfulTryons: 0,
    failedTryons: 0
  });
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_id, images_limit, images_used, status')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) {
        console.error('Error fetching subscription:', subError);
      } else if (subData) {
        setSubscription(subData);
      } else {
        // Create default subscription if none exists
        const { data: newSub, error: createError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user!.id,
            plan_id: 'basic',
            status: 'active',
            images_limit: 100,
            images_used: 0
          })
          .select('plan_id, images_limit, images_used, status')
          .single();

        if (!createError && newSub) {
          setSubscription(newSub);
        }
      }

      // Fetch try-on sessions stats
      const { data: sessions, error: sessionsError } = await supabase
        .from('tryon_sessions')
        .select('fashn_status')
        .order('created_at', { ascending: false });

      if (!sessionsError && sessions) {
        const successful = sessions.filter(s => s.fashn_status === 'completed').length;
        const failed = sessions.filter(s => s.fashn_status === 'failed').length;

        setStats({
          totalTryons: sessions.length,
          successfulTryons: successful,
          failedTryons: failed
        });
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = () => {
    return user?.user_metadata?.name || user?.email?.split('@')[0] || 'Cliente';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#810707]"></div>
      </div>
    );
  }

  const successRate = stats.totalTryons > 0 ? Math.round((stats.successfulTryons / stats.totalTryons) * 100) : 0;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#810707] to-red-700 rounded-xl md:rounded-2xl p-4 md:p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl md:text-3xl font-bold mb-2">
              Bem-vindo, {getUserName()}!
            </h1>
            <p className="text-red-100 text-sm md:text-lg mb-3 md:mb-4">
              Aqui estão alguns insights para usufruir do Omafit da melhor maneira
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs md:text-sm">
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
          <div className="hidden lg:block">
            <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white/10 rounded-full flex items-center justify-center">
              <Zap className="w-12 h-12 lg:w-16 lg:h-16 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Info */}
      {subscription && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Plano {subscription.plan_id.charAt(0).toUpperCase() + subscription.plan_id.slice(1)}</h3>
                <p className="text-sm text-gray-600">
                  {subscription.images_limit === -1
                    ? 'Imagens ilimitadas'
                    : `${subscription.images_used} de ${subscription.images_limit} imagens usadas`}
                </p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: subscription.images_limit === -1
                        ? '100%'
                        : `${Math.min((subscription.images_used / subscription.images_limit) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {subscription.images_limit === -1
                  ? '∞'
                  : subscription.images_limit - subscription.images_used}
              </p>
              <p className="text-sm text-gray-600">disponíveis</p>
            </div>
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-4 md:p-6">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3">Dicas para maximizar seus resultados</h3>
            <ul className="space-y-3 text-sm md:text-base text-gray-700">
              <li className="flex items-start gap-2 md:gap-3">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-semibold">Posicione o widget estrategicamente:</span> Coloque o botão de try-on próximo ao botão "Adicionar ao Carrinho" na página do produto para aumentar a taxa de conversão em até 40%
                </div>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-semibold">Use imagens de alta qualidade:</span> Fotos dos produtos com boa iluminação e fundo limpo geram resultados de try-on muito mais realistas
                </div>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-semibold">Acompanhe as métricas:</span> Verifique regularmente o Analytics para entender quais produtos têm mais engajamento e ajustar sua estratégia
                </div>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-semibold">Personalize o widget:</span> Ajuste as cores e textos do widget para combinar com a identidade visual da sua loja
                </div>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-semibold">Promova a função:</span> Destaque o try-on virtual em suas campanhas de marketing para aumentar o engajamento dos clientes
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs md:text-sm font-medium">Total Try-ons</p>
              <p className="text-2xl md:text-3xl font-bold text-[#810707] mt-1">{stats.totalTryons}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#810707] bg-opacity-10 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 md:w-6 md:h-6 text-[#810707]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs md:text-sm font-medium">Sucessos</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600 mt-1">{stats.successfulTryons}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs md:text-sm font-medium">Falhas</p>
              <p className="text-2xl md:text-3xl font-bold text-red-600 mt-1">{stats.failedTryons}</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs md:text-sm font-medium">Taxa de Sucesso</p>
              <p className="text-2xl md:text-3xl font-bold text-[#810707] mt-1">{successRate}%</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#810707] bg-opacity-10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-[#810707]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
