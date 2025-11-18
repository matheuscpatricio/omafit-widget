import React from 'react';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

export function CancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Pagamento Cancelado
        </h1>

        <p className="text-gray-600 mb-8">
          Seu pagamento foi cancelado. Nenhuma cobrança foi realizada.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.href = '/pricing'}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Tentar Novamente
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full text-gray-600 py-3 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Precisa de ajuda? Entre em contato com nosso suporte.
          </p>
        </div>
      </div>
    </div>
  );
}