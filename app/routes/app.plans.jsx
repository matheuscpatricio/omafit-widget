/**
 * Página de Planos - /app/plans
 *
 * Mostra todos os planos disponíveis e permite trocar de plano
 */

import { useLoaderData } from '@remix-run/react';
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  Banner
} from '@shopify/polaris';
import { useState } from 'react';
import { authenticate } from '../shopify.server';
import { getShopBilling, getPlanDetails } from '../utils/shopify-billing.server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (!session || !session.shop) {
    return { error: 'Não autenticado' };
  }

  const shopDomain = session.shop;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: plans } = await supabase
      .from('billing_plans')
      .select('name, display_name, monthly_price, currency, images_included, price_per_extra_image')
      .eq('active', true)
      .order('monthly_price', { ascending: true, nullsLast: true });

    const shopBilling = await getShopBilling(shopDomain);

    return {
      shop: shopDomain,
      currentPlan: shopBilling?.plan || null,
      billingStatus: shopBilling?.billing_status || null,
      plans: (plans || []).map(p => ({
        name: p.name,
        display_name: p.display_name,
        monthly_price: p.monthly_price,
        currency: p.currency,
        images_included: p.images_included,
        price_per_extra_image: p.price_per_extra_image
      }))
    };
  } catch (error) {
    console.error('[Plans] Erro ao carregar dados:', error);
    return {
      shop: shopDomain,
      currentPlan: null,
      billingStatus: null,
      plans: [],
      error: error.message
    };
  }
};

export default function PlansPage() {
  const { shop, currentPlan, billingStatus, plans, error } = useLoaderData();
  const [loading, setLoading] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSelectPlan = async (planName) => {
    setErrorMessage(null);
    setLoading(planName);

    try {
      if (planName === 'enterprise') {
        window.open('mailto:contato@omafit.co?subject=Interesse no Plano Enterprise', '_blank');
        setLoading(null);
        return;
      }

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

      if (data.confirmationUrl) {
        window.top.location.href = data.confirmationUrl;
      }
    } catch (err) {
      console.error('[Plans] Erro ao selecionar plano:', err);
      setErrorMessage(err.message);
      setLoading(null);
    }
  };

  const getPlanFeatures = (planName) => {
    const features = {
      starter: [
        'Widget customizável',
        'Analytics básico',
        'Suporte via email',
        'Integração com catálogo Shopify'
      ],
      pro: [
        'Widget totalmente customizável',
        'Analytics avançado',
        'Suporte prioritário',
        'Integração API',
        'Relatórios detalhados',
        'Múltiplas configurações de widget'
      ],
      enterprise: [
        'Imagens ilimitadas',
        'Gerente de conta dedicado',
        'SLA garantido',
        'Suporte 24/7',
        'Onboarding personalizado',
        'White label disponível',
        'Desenvolvimento customizado',
        'Prioridade no roadmap'
      ]
    };

    return features[planName] || [];
  };

  return (
    <Page
      title="Planos Omafit"
      subtitle="Escolha o plano ideal para sua loja"
      backAction={{ content: 'Dashboard', url: '/app' }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical">
              <p>Erro ao carregar planos: {error}</p>
            </Banner>
          </Layout.Section>
        )}

        {errorMessage && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setErrorMessage(null)}>
              <p>{errorMessage}</p>
            </Banner>
          </Layout.Section>
        )}

        {currentPlan && (
          <Layout.Section>
            <Banner tone="info">
              <p>
                Seu plano atual: <strong>{currentPlan.toUpperCase()}</strong>
                {billingStatus === 'active' ? ' (Ativo)' : ` (Status: ${billingStatus})`}
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <BlockStack gap="400">
            <InlineStack gap="400" align="start" wrap>
              {plans.map((plan) => {
                const isCurrent = currentPlan === plan.name;
                const isLoading = loading === plan.name;
                const isEnterprise = plan.name === 'enterprise';
                const isPro = plan.name === 'pro';
                const features = getPlanFeatures(plan.name);

                return (
                  <div key={plan.name} style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <Card>
                      <BlockStack gap="400">
                        <BlockStack gap="200">
                          <InlineStack align="space-between" blockAlign="center" wrap>
                            <Text variant="headingLg" as="h2">
                              {plan.display_name}
                            </Text>
                            <InlineStack gap="200">
                              {isPro && (
                                <Badge tone="success">Mais Popular</Badge>
                              )}
                              {isEnterprise && (
                                <Badge tone="info">Sob Consulta</Badge>
                              )}
                              {isCurrent && (
                                <Badge tone="success">Plano Atual</Badge>
                              )}
                            </InlineStack>
                          </InlineStack>

                          {plan.monthly_price !== null ? (
                            <BlockStack gap="100">
                              <InlineStack align="start" blockAlign="end" gap="100">
                                <Text variant="heading2xl" as="p">
                                  {plan.currency} ${plan.monthly_price}
                                </Text>
                                <Text variant="bodyLg" tone="subdued">
                                  /mês
                                </Text>
                              </InlineStack>
                            </BlockStack>
                          ) : (
                            <BlockStack gap="100">
                              <Text variant="heading2xl" as="p">
                                Customizado
                              </Text>
                              <Text variant="bodyMd" tone="subdued">
                                Entre em contato
                              </Text>
                            </BlockStack>
                          )}

                          {plan.images_included && (
                            <BlockStack gap="100">
                              <Text variant="bodyLg" fontWeight="semibold">
                                {plan.images_included} imagens/mês
                              </Text>
                              <Text variant="bodyMd" tone="subdued">
                                {plan.currency} ${plan.price_per_extra_image} por imagem extra
                              </Text>
                            </BlockStack>
                          )}

                          {isEnterprise && (
                            <Text variant="bodyLg" fontWeight="semibold">
                              Imagens ilimitadas
                            </Text>
                          )}
                        </BlockStack>

                        <BlockStack gap="200">
                          <Text variant="headingSm" as="h3">
                            Recursos incluídos:
                          </Text>
                          {features.map((feature, index) => (
                            <InlineStack key={index} gap="200" blockAlign="start">
                              <Text>✓</Text>
                              <Text>{feature}</Text>
                            </InlineStack>
                          ))}
                        </BlockStack>

                        <Button
                          variant={isPro ? 'primary' : 'secondary'}
                          fullWidth
                          onClick={() => handleSelectPlan(plan.name)}
                          loading={isLoading}
                          disabled={isCurrent || (loading && !isLoading)}
                        >
                          {isCurrent
                            ? 'Plano Atual'
                            : isEnterprise
                            ? 'Fale Conosco'
                            : 'Assinar Plano'}
                        </Button>
                      </BlockStack>
                    </Card>
                  </div>
                );
              })}
            </InlineStack>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Perguntas Frequentes
              </Text>

              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">
                    Como funciona a cobrança por imagens extras?
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Se você ultrapassar o limite de imagens incluídas no seu plano, cobraremos automaticamente por cada imagem adicional gerada, de acordo com a taxa do seu plano. A cobrança é feita através do sistema de billing da Shopify.
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">
                    Posso trocar de plano a qualquer momento?
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. O novo plano entrará em vigor imediatamente e a cobrança será ajustada proporcionalmente.
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">
                    Como funciona o limite de cobrança (capped amount)?
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Há um limite de segurança na cobrança por imagens extras para evitar surpresas. Se você atingir esse limite, o sistema pausará a geração de novas imagens até que você aprove um novo limite ou até o próximo ciclo de billing.
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">
                    O que está incluído no plano Enterprise?
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    O plano Enterprise é totalmente customizável para atender às necessidades específicas da sua empresa. Inclui imagens ilimitadas, suporte dedicado, SLA garantido e muito mais. Entre em contato para uma proposta personalizada.
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">
                    Posso cancelar minha assinatura?
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Sim, você pode cancelar sua assinatura a qualquer momento através das configurações de billing da sua loja Shopify. Não há multas ou taxas de cancelamento.
                  </Text>
                </BlockStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
