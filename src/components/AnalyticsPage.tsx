import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Users, Package, Calendar, Eye, Trophy, BarChart3 } from 'lucide-react';
import type { Database } from '../lib/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type TryonSession = Database['public']['Tables']['tryon_sessions']['Row'];

interface ProductAnalytics extends Product {
  tryonCount: number;
  successCount: number;
  successRate: number;
  lastTryonDate: string | null;
}

interface AnalyticsData {
  totalProducts: number;
  totalTryons: number;
  successfulTryons: number;
  topProducts: ProductAnalytics[];
  recentSessions: (TryonSession & { products: Product })[];
  conversionRate: number;
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - parseInt(timeRange));

      // Get products with tryon statistics
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;

      // Get tryon sessions with product details
      const { data: sessions, error: sessionsError } = await supabase
        .from('tryon_sessions')
        .select('*, products(*)')
        .gte('created_at', dateFilter.toISOString())
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Calculate product analytics
      const productAnalytics: ProductAnalytics[] = products?.map(product => {
        const productSessions = sessions?.filter(s => s.product_id === product.id) || [];
        const successfulSessions = productSessions.filter(s => s.fashn_status === 'completed');
        const lastSession = productSessions[0];

        return {
          ...product,
          tryonCount: productSessions.length,
          successCount: successfulSessions.length,
          successRate: productSessions.length > 0 ? Math.round((successfulSessions.length / productSessions.length) * 100) : 0,
          lastTryonDate: lastSession?.created_at || null
        };
      }).sort((a, b) => b.tryonCount - a.tryonCount) || [];

      // Calculate general stats
      const totalProducts = products?.length || 0;
      const totalTryons = sessions?.length || 0;
      const successfulTryons = sessions?.filter(s => s.fashn_status === 'completed').length || 0;
      const conversionRate = totalTryons > 0 ? Math.round((successfulTryons / totalTryons) * 100) : 0;

      setData({
        totalProducts,
        totalTryons,
        successfulTryons,
        topProducts: productAnalytics.slice(0, 10),
        recentSessions: sessions?.slice(0, 10) || [],
        conversionRate
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-gray-800">Dashboard Analytics</h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">Acompanhe o desempenho dos seus produtos</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 md:p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs md:text-sm font-medium">Total de Produtos</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{data?.totalProducts || 0}</p>
            </div>
            <Package className="w-8 h-8 md:w-10 md:h-10 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-xs md:text-sm font-medium">Total Try-ons</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{data?.totalTryons || 0}</p>
            </div>
            <Eye className="w-8 h-8 md:w-10 md:h-10 text-cyan-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs md:text-sm font-medium">Try-ons Concluídos</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{data?.successfulTryons || 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs md:text-sm font-medium">Taxa de Conversão</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{data?.conversionRate || 0}%</p>
            </div>
            <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-600" />
            <h3 className="text-lg md:text-xl font-bold text-gray-800">Produtos Mais Testados</h3>
          </div>
        </div>
        
        {data?.topProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum produto testado ainda</p>
            <p className="text-gray-400">Adicione produtos e compartilhe os widgets para ver dados aqui</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ranking
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Try-ons
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sucessos
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taxa Sucesso
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Try-on
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.topProducts.map((product, index) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-600' :
                          index === 2 ? 'bg-orange-100 text-orange-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden mr-4">
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
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        {getCategoryLabel(product.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 text-cyan-500 mr-2" />
                        <span className="text-sm font-bold text-cyan-600">{product.tryonCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm font-bold text-green-600">{product.successCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          product.successRate >= 80 ? 'bg-green-500' :
                          product.successRate >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          product.successRate >= 80 ? 'text-green-600' :
                          product.successRate >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {product.successRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.lastTryonDate ? (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(product.lastTryonDate).toLocaleDateString('pt-BR')}
                        </div>
                      ) : (
                        <span className="text-gray-400">Nunca</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b bg-gray-50">
          <h3 className="text-lg md:text-xl font-bold text-gray-800">Sessões Recentes</h3>
        </div>
        
        {data?.recentSessions.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhuma sessão encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {data?.recentSessions.map((session) => (
              <div key={session.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="w-3 h-3 bg-purple-400 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm md:text-base text-gray-800 truncate">{session.customer_email}</p>
                      <p className="text-xs md:text-sm text-gray-600 truncate">
                        Produto: {session.products?.name || 'N/A'}
                      </p>
                      <p className="text-xs md:text-sm text-gray-500">
                        {new Date(session.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.fashn_status)}`}>
                    {session.fashn_status === 'completed' ? 'Concluído' :
                     session.fashn_status === 'processing' ? 'Processando' :
                     session.fashn_status === 'failed' ? 'Falhou' : session.fashn_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}