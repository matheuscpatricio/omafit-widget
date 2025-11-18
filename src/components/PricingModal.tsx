import React from 'react';
import { X, Check, Zap } from 'lucide-react';
import { products } from '../stripe-config';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (priceId: string) => void;
}

export function PricingModal({ isOpen, onClose, onSelectPlan }: PricingModalProps) {
  if (!isOpen) return null;

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'BRL',
    }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Escolha seu Plano</h2>
            <p className="text-gray-600 text-sm mt-1">Selecione o plano ideal para seu negócio</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, index) => {
              const isPopular = index === 2;

              return (
                <div
                  key={product.id}
                  className={`relative bg-white rounded-2xl border-2 transition-all hover:shadow-xl hover:-translate-y-1 ${
                    isPopular
                      ? 'border-[#810707] shadow-lg scale-105'
                      : 'border-gray-200'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-[#810707] to-red-700 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                        MAIS POPULAR
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="text-center mb-6">
                      <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${
                        isPopular
                          ? 'bg-gradient-to-r from-[#810707] to-red-700'
                          : 'bg-gray-100'
                      }`}>
                        <Zap className={`w-6 h-6 ${isPopular ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h3>
                      <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                      <div className="text-3xl font-bold text-gray-900">
                        {formatPrice(product.price, product.currency)}
                        {product.mode === 'subscription' && (
                          <span className="text-base font-normal text-gray-600">/mês</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">Provador virtual com IA</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">Integração Shopify</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">Suporte técnico</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">Análises detalhadas</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectPlan(product.priceId)}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                        isPopular
                          ? 'bg-gradient-to-r from-[#810707] to-red-700 text-white hover:from-red-800 hover:to-red-900 shadow-lg hover:shadow-xl'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      Selecionar Plano
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
