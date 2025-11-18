import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Plus, Edit2, Trash2, Image as ImageIcon, Eye, Settings } from 'lucide-react';
import { ProductForm } from './ProductForm';
import { ProductDetails } from './ProductDetails';
import { WidgetCustomizer } from './WidgetCustomizer';
import type { Database } from '../lib/supabase';

type Product = Database['public']['Tables']['products']['Row'];

export function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
    fetchProducts();
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Meus Produtos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            Nenhum produto cadastrado
          </h3>
          <p className="text-gray-500 mb-4">
            Comece adicionando seu primeiro produto
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-cyan-700 transition-all"
          >
            Adicionar Produto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                {product.garment_image ? (
                  <img
                    src={product.garment_image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="p-3 md:p-4">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-semibold text-sm md:text-base text-gray-800 truncate flex-1">{product.name}</h3>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    {getCategoryLabel(product.category)}
                  </span>
                </div>
                
                {product.description && (
                  <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4 line-clamp-2">
                    {product.description}
                  </p>
                )}
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(product.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingProduct(product)}
                      className="text-blue-600 hover:text-blue-700 p-1 rounded"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCustomizingProduct(product)}
                      className="text-purple-600 hover:text-purple-700 p-1 rounded"
                      title="Personalizar Widget"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-gray-600 hover:text-gray-700 p-1 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-700 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleFormClose}
        />
      )}

      {customizingProduct && (
        <WidgetCustomizer
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
        />
      )}
      {viewingProduct && (
        <ProductDetails
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
        />
      )}
    </div>
  );
}