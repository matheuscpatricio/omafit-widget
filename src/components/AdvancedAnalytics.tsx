import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { generateSampleAnalyticsData } from '../utils/generateSampleData';
import {
  DollarSign,
  Users,
  ShoppingCart,
  Eye,
  Clock,
  TrendingUp,
  Trophy,
  AlertCircle,
  Share2,
  Image as ImageIcon,
  Zap,
  BarChart3,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';

interface AdvancedMetrics {
  // Revenue metrics
  totalRevenue: number;
  revenueInfluencedByTryon: number;
  revenuePercentage: number;
  averageTicket: number;
  averageTicketWithTryon: number;

  // Customer metrics
  uniqueUsers: number;
  totalSessions: number;
  averageTryonsPerUser: number;
  repurchaseRate: number;

  // Order metrics
  ordersAfterTryon: number;
  conversionRateWithTryon: number;
  conversionRateWithoutTryon: number;

  // Session metrics
  averageSessionDuration: number;
  averageProcessingTime: number;
  totalImagesProcessed: number;
  averageUploadTime: number;

  // Product metrics
  topProducts: Array<{
    id: string;
    name: string;
    garment_image: string | null;
    tryonCount: number;
  }>;

  // Behavior metrics
  abandonmentRate: number;
  shareRate: number;
  completionRate: number;
}

export function AdvancedAnalytics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [generatingSample, setGeneratingSample] = useState(false);

  useEffect(() => {

      fetchAdvancedMetrics();

  }, [user, timeRange]);

  const handleGenerateSampleData = async () => {
    if (!user) {
      setLoading(false);
      return;
    };

    setGeneratingSample(true);
    
    const success = await generateSampleAnalyticsData(user.id);
    
    if (success) {
      await fetchAdvancedMetrics();
    }
    setGeneratingSample(false);
  };

  const fetchAdvancedMetrics = async () => {
    if (!user) {
      setLoading(false);
      return;
    };
    
    try {
      setLoading(true);

      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - parseInt(timeRange));

      // Get all orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .gte('order_date', dateFilter.toISOString());

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      }

      // Get all tryon sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('tryon_sessions')
        .select('*')
        .gte('created_at', dateFilter.toISOString());

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
      }

      // Get session analytics
      const { data: sessionAnalytics, error: sessionAnalyticsError } = await supabase
        .from('session_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', dateFilter.toISOString());

      if (sessionAnalyticsError) {
        console.error('Error fetching session analytics:', sessionAnalyticsError);
      }

      // Get products with analytics (incluindo shopify_id para fazer match)
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, shopify_id, name, garment_image')
        .eq('user_id', user.id);

      if (productsError) {
        console.error('Error fetching products:', productsError);
      }

      // Get customer analytics
      const { data: customerAnalytics, error: customerAnalyticsError } = await supabase
        .from('customer_analytics')
        .select('*')
        .eq('user_id', user.id);

      if (customerAnalyticsError) {
        console.error('Error fetching customer analytics:', customerAnalyticsError);
      }

      // Calculate metrics
      const ordersData = orders || [];
      const sessionsData = sessions || [];
      const sessionAnalyticsData = sessionAnalytics || [];
      const productsData = products || [];
      const customerData = customerAnalytics || [];

      // Revenue metrics
      const totalRevenue = ordersData.reduce((sum, order) => sum + Number(order.order_value), 0);
      const ordersWithTryon = ordersData.filter(o => o.used_tryon);
      const revenueInfluencedByTryon = ordersWithTryon.reduce((sum, order) => sum + Number(order.order_value), 0);
      const revenuePercentage = totalRevenue > 0 ? (revenueInfluencedByTryon / totalRevenue) * 100 : 0;

      const averageTicket = ordersData.length > 0 ? totalRevenue / ordersData.length : 0;
      const averageTicketWithTryon = ordersWithTryon.length > 0
        ? revenueInfluencedByTryon / ordersWithTryon.length
        : 0;

      // Customer metrics
      const uniqueEmails = new Set(sessionsData.map(s => s.customer_email));
      const uniqueUsers = uniqueEmails.size;
      const totalSessions = sessionsData.length;
      const averageTryonsPerUser = uniqueUsers > 0 ? totalSessions / uniqueUsers : 0;

      // Repurchase rate
      const customersWithMultiplePurchases = customerData.filter(c => c.total_orders > 1).length;
      const totalCustomers = customerData.length;
      const repurchaseRate = totalCustomers > 0 ? (customersWithMultiplePurchases / totalCustomers) * 100 : 0;

      // Order metrics
      const ordersAfterTryon = ordersWithTryon.length;
      const completedSessions = sessionsData.filter(s => s.fashn_status === 'completed').length;
      const conversionRateWithTryon = completedSessions > 0 ? (ordersAfterTryon / completedSessions) * 100 : 0;

      const ordersWithoutTryon = ordersData.filter(o => !o.used_tryon).length;
      const conversionRateWithoutTryon = ordersData.length > 0
        ? (ordersWithoutTryon / ordersData.length) * 100
        : 0;

      // Session metrics
      const completedSessionAnalytics = sessionAnalyticsData.filter(sa => sa.completed);
      const averageSessionDuration = completedSessionAnalytics.length > 0
        ? completedSessionAnalytics.reduce((sum, sa) => sum + (sa.duration_seconds || 0), 0) / completedSessionAnalytics.length
        : 0;

      const averageProcessingTime = sessionAnalyticsData.length > 0
        ? sessionAnalyticsData.reduce((sum, sa) => sum + (sa.processing_time_seconds || 0), 0) / sessionAnalyticsData.length
        : 0;

      const totalImagesProcessed = sessionAnalyticsData.reduce((sum, sa) => sum + (sa.images_processed || 0), 0);
      const averageUploadTime = sessionAnalyticsData.length > 0
        ? sessionAnalyticsData.reduce((sum, sa) => sum + (sa.processing_time_seconds || 0), 0) / sessionAnalyticsData.length
        : 0;

      // Product metrics - Top 10
      const productTryonCounts = sessionsData.reduce((acc, session) => {
        if (session.product_id) {
          acc[session.product_id] = (acc[session.product_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Criar um mapa de shopify_id -> product
      const shopifyIdToProduct = productsData.reduce((acc, product) => {
        if (product.shopify_id) {
          acc[product.shopify_id] = product;
        }
        acc[product.id] = product;
        return acc;
      }, {} as Record<string, any>);

      // Converter para array com nomes ou IDs
      const topProducts = Object.entries(productTryonCounts)
        .map(([productId, count]) => {
          const product = shopifyIdToProduct[productId];
          return {
            id: productId,
            name: product?.name || `Produto ${productId.substring(0, 8)}...`,
            garment_image: product?.garment_image || null,
            tryonCount: count
          };
        })
        .sort((a, b) => b.tryonCount - a.tryonCount)
        .slice(0, 10);

      // Behavior metrics
      const abandonedSessions = sessionAnalyticsData.filter(sa => !sa.completed).length;
      const abandonmentRate = sessionAnalyticsData.length > 0
        ? (abandonedSessions / sessionAnalyticsData.length) * 100
        : 0;

      const sharedSessions = sessionAnalyticsData.filter(sa => sa.shared).length;
      const shareRate = completedSessionAnalytics.length > 0
        ? (sharedSessions / completedSessionAnalytics.length) * 100
        : 0;

      const completionRate = sessionsData.length > 0
        ? (completedSessions / sessionsData.length) * 100
        : 0;

      setMetrics({
        totalRevenue,
        revenueInfluencedByTryon,
        revenuePercentage,
        averageTicket,
        averageTicketWithTryon,
        uniqueUsers,
        totalSessions,
        averageTryonsPerUser,
        repurchaseRate,
        ordersAfterTryon,
        conversionRateWithTryon,
        conversionRateWithoutTryon,
        averageSessionDuration,
        averageProcessingTime,
        totalImagesProcessed,
        averageUploadTime,
        topProducts,
        abandonmentRate,
        shareRate,
        completionRate
      });
    } catch (error) {
      console.error('Error fetching advanced metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#810707]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Analytics Avançado</h2>
          <p className="text-gray-600 mt-1">Métricas detalhadas do desempenho do Omafit</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateSampleData}
            disabled={generatingSample}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${generatingSample ? 'animate-spin' : ''}`} />
            {generatingSample ? 'Gerando...' : 'Gerar Dados de Exemplo'}
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#810707] focus:border-transparent"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
          </select>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-[#810707]" />
          Métricas de Receita
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Vendas Totais</p>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(metrics?.totalRevenue || 0)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Influenciado por Omafit</p>
              <TrendingUp className="w-5 h-5 text-[#810707]" />
            </div>
            <p className="text-2xl font-bold text-[#810707]">{formatCurrency(metrics?.revenueInfluencedByTryon || 0)}</p>
            <div className="flex items-center gap-1 mt-2">
              <Percent className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{metrics?.revenuePercentage.toFixed(1)}% da receita total</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Ticket Médio Geral</p>
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(metrics?.averageTicket || 0)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Ticket Médio com Omafit</p>
              <ShoppingCart className="w-5 h-5 text-[#810707]" />
            </div>
            <p className="text-2xl font-bold text-[#810707]">{formatCurrency(metrics?.averageTicketWithTryon || 0)}</p>
            {metrics && metrics.averageTicketWithTryon > metrics.averageTicket && (
              <div className="flex items-center gap-1 mt-2 text-green-600">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm font-medium">
                  +{((metrics.averageTicketWithTryon - metrics.averageTicket) / metrics.averageTicket * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer & Usage Metrics */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-[#810707]" />
          Métricas de Usuários
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Usuários Únicos</p>
              <Users className="w-5 h-5 text-[#810707]" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{metrics?.uniqueUsers || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Total de Sessões</p>
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{metrics?.totalSessions || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Try-ons por Usuário</p>
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{metrics?.averageTryonsPerUser.toFixed(1) || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Taxa de Recompra</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{metrics?.repurchaseRate.toFixed(1) || 0}%</p>
          </div>
        </div>
      </div>

      {/* Conversion Metrics */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-[#810707]" />
          Métricas de Conversão
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Pedidos Após Try-on</p>
              <ShoppingCart className="w-5 h-5 text-[#810707]" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{metrics?.ordersAfterTryon || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Conversão COM Omafit</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{metrics?.conversionRateWithTryon.toFixed(1) || 0}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Conversão SEM Omafit</p>
              <BarChart3 className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-2xl font-bold text-gray-600">{metrics?.conversionRateWithoutTryon.toFixed(1) || 0}%</p>
            {metrics && metrics.conversionRateWithTryon > metrics.conversionRateWithoutTryon && (
              <div className="flex items-center gap-1 mt-2 text-green-600">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {(metrics.conversionRateWithTryon - metrics.conversionRateWithoutTryon).toFixed(1)}% melhor
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session & Performance Metrics */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-[#810707]" />
          Métricas de Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Tempo Médio de Sessão</p>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {formatDuration(metrics?.averageSessionDuration || 0)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Tempo de Processamento</p>
              <Zap className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {formatDuration(metrics?.averageProcessingTime || 0)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Imagens Processadas</p>
              <ImageIcon className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{metrics?.totalImagesProcessed || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Tempo Médio de Upload</p>
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {formatDuration(metrics?.averageUploadTime || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Behavior Metrics */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-[#810707]" />
          Métricas de Comportamento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Taxa de Conclusão</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{metrics?.completionRate.toFixed(1) || 0}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Taxa de Abandono</p>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">{metrics?.abandonmentRate.toFixed(1) || 0}%</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm font-medium">Taxa de Compartilhamento</p>
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{metrics?.shareRate.toFixed(1) || 0}%</p>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <h3 className="text-xl font-semibold text-gray-800">TOP 10 Produtos Mais Testados</h3>
          </div>
        </div>

        {metrics?.topProducts && metrics.topProducts.length > 0 ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:border-[#810707] transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-200 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-[#810707] bg-opacity-10 text-[#810707]'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                    {product.garment_image ? (
                      <img
                        src={product.garment_image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Eye className="w-4 h-4 text-[#810707]" />
                      <span className="text-sm font-semibold text-[#810707]">
                        {product.tryonCount} try-ons
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum produto testado ainda</p>
          </div>
        )}
      </div>
    </div>
  );
}
