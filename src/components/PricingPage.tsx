import React, { useEffect } from 'react';
import { Check, Zap } from 'lucide-react';
import { products } from '../stripe-config';
import { useCheckout } from '../hooks/useCheckout';
import { useSubscription } from '../hooks/useSubscription';

export function PricingPage() {
  const { createCheckoutSession, loading: checkoutLoading, error: checkoutError } = useCheckout();
  const { subscription, isActive, isPending } = useSubscription();

  const handleSubscribe = async (priceId: string, mode: 'payment' | 'subscription') => {
    try {
      await createCheckoutSession({
        priceId,
        mode,
        successUrl: `${window.location.origin}/success`,
        cancelUrl: `${window.location.origin}/pricing`,
      });
    } catch (error: any) {
      console.error('Error in handleSubscribe:', error);
      alert(`Erro ao processar assinatura: ${error.message}`);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'BRL',
    }).format(price);
  };

  useEffect(() => {
    const pendingPriceId = localStorage.getItem('pending_subscription_priceId');
    if (pendingPriceId) {
      localStorage.removeItem('pending_subscription_priceId');
      handleSubscribe(pendingPriceId, 'subscription');
    }
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Escolha seu Plano</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Transforme sua loja com nossa tecnologia de assistente inteligente
        </p>
      </div>

      {checkoutError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-700 text-sm">{checkoutError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {products.map((product) => {
          const isCurrentPlan = subscription?.price_id === product.priceId;
          const userIsActive = isActive();
          const userIsPending = isPending();

          return (
            <div
              key={product.id}
              className={`bg-white rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl ${
                isCurrentPlan ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
              }`}
            >
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h3>
                  <p className="text-gray-600 mb-4">{product.description}</p>
                  <div className="text-4xl font-bold text-gray-800">
                    {formatPrice(product.price, product.currency)}
                    {product.mode === 'subscription' && (
                      <span className="text-lg font-normal text-gray-600">/mês</span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">Assistente inteligente</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">Integração fácil</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">Suporte técnico</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700">Análises detalhadas</span>
                  </div>
                </div>

                <button
                  onClick={() => handleSubscribe(product.priceId, product.mode)}
                  disabled={checkoutLoading || isCurrentPlan}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-700 hover:to-cyan-700 hover:shadow-lg'
                  } ${checkoutLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {checkoutLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processando...
                    </div>
                  ) : isCurrentPlan ? (
                    userIsActive ? 'Plano Atual' : userIsPending ? 'Aguardando Pagamento' : 'Plano Selecionado'
                  ) : (
                    `Assinar ${product.name}`
                  )}
                </button>

                {isCurrentPlan && userIsActive && (
                  <p className="text-center text-sm text-green-600 mt-2">
                    ✓ Assinatura ativa
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}