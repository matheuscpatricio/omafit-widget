import React, { useEffect } from 'react';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

export function SuccessPage() {
  const { refetch, getActiveProduct } = useSubscription();

  useEffect(() => {
    // Refetch subscription data after successful payment
    const timer = setTimeout(() => {
      refetch();
    }, 2000);

    return () => clearTimeout(timer);
  }, [refetch]);

  const activeProduct = getActiveProduct();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Pagamento Realizado!
        </h1>

        <p className="text-gray-600 mb-6">
          Obrigado pela sua compra. Seu pagamento foi processado com sucesso.
        </p>

        {activeProduct && (
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-purple-800 mb-2">Plano Ativado</h3>
            <p className="text-purple-700">{activeProduct.name}</p>
            <p className="text-sm text-purple-600">{activeProduct.description}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Ir para Dashboard
          </button>

          <button
            onClick={() => window.location.href = '/pricing'}
            className="w-full text-gray-600 py-3 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            Ver Outros Planos
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Você receberá um email de confirmação em breve.
          </p>
        </div>
      </div>
    </div>
  );
}