import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useCheckout } from '../hooks/useCheckout';
import { products } from '../stripe-config';
import { Check, Zap, TrendingUp, Crown, Loader2 } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  tryonLimit: number;
  recommended?: boolean;
}

const plans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 130,
    interval: 'mês',
    tryonLimit: 100,
    features: [
      '100 imagens geradas/mês',
      'Integração Shopify',
      'Dashboard analytics',
      'Suporte por e-mail'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 550,
    interval: 'mês',
    tryonLimit: 500,
    features: [
      '500 imagens geradas/mês',
      'Integração Shopify',
      'Dashboard analytics',
      'Suporte por e-mail'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 975,
    interval: 'mês',
    tryonLimit: 1000,
    features: [
      '1.000 imagens geradas/mês',
      'Tudo do plano Starter',
      'Analytics avançado',
      'Suporte prioritário',
      'API personalizada'
    ],
    recommended: true
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 2400,
    interval: 'mês',
    tryonLimit: 3000,
    features: [
      '3.000 imagens geradas/mês',
      'Tudo do plano Growth',
      'Suporte 24/7',
      'Gerente de conta',
      'Webhooks avançados'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    interval: 'mês',
    tryonLimit: -1,
    features: [
      'Imagens ilimitadas',
      'Tudo do plano Scale',
      'SLA garantido',
      'Infraestrutura dedicada',
      'Desenvolvimento customizado'
    ]
  }
];

export function AccountSettingsPage() {
  const { user } = useAuth();
  const { createCheckoutSession } = useCheckout();
  const [currentPlan, setCurrentPlan] = useState<string>('basic');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  console.log(currentPlan)

  useEffect(() => {
    fetchCurrentPlan();
  }, [user]);

  const fetchCurrentPlan = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_id, status')
        .eq('user_id', user.id)
        .eq('status', 'active')

      console.log(data)

      if (error) throw error;

      if (data) {
        setCurrentPlan(data[0].plan_id);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (planId: string) => {
    if (!user || planId === currentPlan) return;

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    if (planId === 'enterprise') {
      window.location.href = 'mailto:contato@omafit.co?subject=Interesse no Plano Enterprise';
      return;
    }

    setUpgrading(planId);

    try {
      // Map plan to Stripe product
      let priceId: string | undefined;

      if (planId === 'basic') {
        priceId = products.find(p => p.name === 'Basic')?.priceId;
      } else if (planId === 'starter') {
        priceId = products.find(p => p.name === 'Starter')?.priceId;
      } else if (planId === 'growth') {
        priceId = products.find(p => p.name === 'Growth')?.priceId;
      } else if (planId === 'scale') {
        priceId = products.find(p => p.name === 'Scale')?.priceId;
      }

      if (!priceId) {
        throw new Error('Price ID not found for plan');
      }

      await createCheckoutSession({
        priceId,
        mode: 'subscription',
        successUrl: `${window.location.origin}/settings?success=true`,
        cancelUrl: `${window.location.origin}/settings?canceled=true`,
      });
    } catch (error) {
      console.error('Error changing plan:', error);
      alert('Erro ao alterar plano. Tente novamente.');
    } finally {
      setUpgrading(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'basic':
      case 'starter':
        return Zap;
      case 'growth':
        return TrendingUp;
      case 'scale':
      case 'enterprise':
        return Crown;
      default:
        return Zap;
    }
  };

  const getPlanButtonText = (planId: string) => {
    if (planId === currentPlan) return 'Plano Atual';
    if (planId === 'enterprise') return 'Entrar em Contato';

    const currentIndex = plans.findIndex(p => p.id === currentPlan);
    const targetIndex = plans.findIndex(p => p.id === planId);

    if (targetIndex > currentIndex) return 'Fazer Upgrade';
    if (targetIndex < currentIndex) return 'Fazer Downgrade';

    return 'Selecionar Plano';
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
      {/* Header */}
      <div className="bg-gradient-to-r from-[#810707] to-red-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Configurações da Conta</h1>
        <p className="text-red-100">
          Gerencie seu plano e aproveite ao máximo o OmaFit
        </p>
      </div>

      {/* Current Plan Info */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            {React.createElement(getPlanIcon(currentPlan), { className: 'w-6 h-6 text-blue-600' })}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Plano Atual</h3>
            <p className="text-gray-700">
              {plans.find(p => p.id === currentPlan)?.name || 'Basic'}
            </p>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = getPlanIcon(plan.id);
          const isCurrentPlan = plan.id === currentPlan;
          const isUpgrading = upgrading === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl border-2 p-6 transition-all ${
                plan.recommended
                  ? 'border-[#810707] shadow-lg scale-105'
                  : isCurrentPlan
                  ? 'border-green-500 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-[#810707] text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Recomendado
                  </span>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Ativo
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className={`w-8 h-8 ${isCurrentPlan ? 'text-green-600' : 'text-[#810707]'}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  {plan.id === 'enterprise' ? (
                    <span className="text-3xl font-bold text-[#810707]">Custom</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-[#810707]">
                        R$ {plan.price}
                      </span>
                      <span className="text-gray-600">/{plan.interval}</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanChange(plan.id)}
                disabled={isCurrentPlan || isUpgrading}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  isCurrentPlan
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : plan.recommended
                    ? 'bg-[#810707] text-white hover:bg-red-800 shadow-md hover:shadow-lg'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  getPlanButtonText(plan.id)
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Perguntas Frequentes</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Como funciona o upgrade?</h4>
            <p className="text-gray-700 text-sm">
              Ao fazer upgrade, você será redirecionado para o checkout seguro. O novo plano entra em vigor imediatamente após o pagamento.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Posso fazer downgrade?</h4>
            <p className="text-gray-700 text-sm">
              Sim! Você pode fazer downgrade a qualquer momento. O novo plano entrará em vigor no próximo ciclo de cobrança.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">O que acontece se eu exceder o limite de try-ons?</h4>
            <p className="text-gray-700 text-sm">
              Você receberá uma notificação quando atingir 80% do limite. Ao exceder, será necessário fazer upgrade para continuar usando o serviço.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
