/**
 * Componente de Planos de Billing
 *
 * Exibe os planos disponíveis (Starter, Pro, Enterprise)
 * e permite ao lojista escolher e assinar
 */

import { useState } from 'react';
import { Card, Button, Text, BlockStack, InlineStack, Badge, Banner } from '@shopify/polaris';

export function BillingPlans({ currentPlan = null, onSelectPlan }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  // Definição dos planos (também pode vir de uma API)
  const plans = [
    {
      name: 'starter',
      displayName: 'Starter',
      monthlyPrice: 25,
      imagesIncluded: 100,
      pricePerExtraImage: 0.17,
      features: [
        '100 imagens virtuais/mês',
        'US$ 0.17 por imagem adicional',
        'Widget customizável',
        'Analytics básico',
        'Suporte via email'
      ],
      badge: null
    },
    {
      name: 'pro',
      displayName: 'Pro',
      monthlyPrice: 100,
      imagesIncluded: 500,
      pricePerExtraImage: 0.15,
      features: [
        '500 imagens virtuais/mês',
        'US$ 0.15 por imagem adicional',
        'Widget totalmente customizável',
        'Analytics avançado',
        'Suporte prioritário',
        'Integração API'
      ],
      badge: 'Mais Popular'
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      monthlyPrice: null,
      imagesIncluded: null,
      pricePerExtraImage: null,
      features: [
        'Imagens ilimitadas',
        'Preço customizado',
        'Gerente de conta dedicado',
        'SLA garantido',
        'Suporte 24/7',
        'Onboarding personalizado',
        'White label disponível'
      ],
      badge: 'Sob Consulta'
    }
  ];

  const handleSelectPlan = async (planName) => {
    setError(null);
    setLoading(planName);

    try {
      // Para Enterprise, não chama a API, apenas notifica
      if (planName === 'enterprise') {
        // TODO: Abrir modal de contato ou redirecionar para página de contato
        alert('Para o plano Enterprise, entre em contato conosco em contato@omafit.co');
        setLoading(null);
        return;
      }

      // Chamar callback passado pelo componente pai
      if (onSelectPlan) {
        await onSelectPlan(planName);
      } else {
        // Fallback: chamar API diretamente
        const response = await fetch('/api/billing/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ plan: planName })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao iniciar assinatura');
        }

        // Redirecionar para confirmationUrl
        if (data.confirmationUrl) {
          window.top.location.href = data.confirmationUrl;
        }
      }
    } catch (err) {
      console.error('Erro ao selecionar plano:', err);
      setError(err.message);
      setLoading(null);
    }
  };

  return (
    <BlockStack gap="400">
      {error && (
        <Banner tone="critical" onDismiss={() => setError(null)}>
          <p>{error}</p>
        </Banner>
      )}

      <InlineStack gap="400" align="start" wrap>
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.name;
          const isLoading = loading === plan.name;

          return (
            <Card key={plan.name}>
              <BlockStack gap="400">
                {/* Header */}
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="headingLg" as="h2">
                      {plan.displayName}
                    </Text>
                    {plan.badge && (
                      <Badge tone={plan.name === 'pro' ? 'success' : 'info'}>
                        {plan.badge}
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge tone="success">Plano Atual</Badge>
                    )}
                  </InlineStack>

                  {/* Preço */}
                  {plan.monthlyPrice !== null ? (
                    <BlockStack gap="100">
                      <Text variant="heading2xl" as="p">
                        US$ {plan.monthlyPrice}
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        por mês
                      </Text>
                    </BlockStack>
                  ) : (
                    <BlockStack gap="100">
                      <Text variant="heading2xl" as="p">
                        Sob Consulta
                      </Text>
                      <Text variant="bodyMd" tone="subdued">
                        Preço customizado
                      </Text>
                    </BlockStack>
                  )}
                </BlockStack>

                {/* Features */}
                <BlockStack gap="200">
                  {plan.features.map((feature, index) => (
                    <InlineStack key={index} gap="200" blockAlign="start">
                      <Text>✓</Text>
                      <Text>{feature}</Text>
                    </InlineStack>
                  ))}
                </BlockStack>

                {/* Botão */}
                <Button
                  variant={plan.name === 'pro' ? 'primary' : 'secondary'}
                  fullWidth
                  onClick={() => handleSelectPlan(plan.name)}
                  loading={isLoading}
                  disabled={isCurrent || (loading && !isLoading)}
                >
                  {isCurrent
                    ? 'Plano Atual'
                    : plan.name === 'enterprise'
                    ? 'Fale Conosco'
                    : 'Assinar'}
                </Button>
              </BlockStack>
            </Card>
          );
        })}
      </InlineStack>

      {/* Informações adicionais */}
      <Card>
        <BlockStack gap="200">
          <Text variant="headingMd" as="h3">
            Perguntas Frequentes
          </Text>
          <BlockStack gap="300">
            <BlockStack gap="100">
              <Text variant="bodyMd" fontWeight="semibold">
                Como funciona a cobrança por imagens extras?
              </Text>
              <Text variant="bodyMd" tone="subdued">
                Se você ultrapassar o limite de imagens incluídas no seu plano, cobraremos automaticamente por cada imagem adicional gerada, de acordo com a taxa do seu plano.
              </Text>
            </BlockStack>

            <BlockStack gap="100">
              <Text variant="bodyMd" fontWeight="semibold">
                Posso cancelar a qualquer momento?
              </Text>
              <Text variant="bodyMd" tone="subdued">
                Sim! Você pode cancelar sua assinatura a qualquer momento através das configurações da sua loja Shopify.
              </Text>
            </BlockStack>

            <BlockStack gap="100">
              <Text variant="bodyMd" fontWeight="semibold">
                O trial é gratuito?
              </Text>
              <Text variant="bodyMd" tone="subdued">
                Sim! Os planos Starter e Pro incluem 7 dias de trial gratuito. Você não será cobrado durante este período.
              </Text>
            </BlockStack>
          </BlockStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
