/**
 * Página Principal/Dashboard - /app
 *
 * Dashboard principal que o lojista vê ao clicar em Apps > Omafit
 */

import { useLoaderData, useNavigate } from '@remix-run/react';
import { json } from '@remix-run/node';
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  ProgressBar,
  Banner
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { getShopBilling } from '../utils/shopify-billing.server';
import { getImageUsageInfo } from '../utils/usage-billing.server';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (!session || !session.shop) {
    return json({ error: 'Não autenticado' }, { status: 401 });
  }

  const shopDomain = session.shop;

  try {
    const shopBilling = await getShopBilling(shopDomain);

    let usage = null;
    if (shopBilling && shopBilling.billing_status === 'active') {
      usage = await getImageUsageInfo(shopDomain);
    }

    return json({
      shop: shopDomain,
      currentPlan: shopBilling?.plan || null,
      billingStatus: shopBilling?.billing_status || null,
      imagesIncluded: shopBilling?.images_included || 0,
      imagesUsed: shopBilling?.images_used_month || 0,
      pricePerExtra: shopBilling?.price_per_extra_image || 0,
      currency: shopBilling?.currency || 'USD',
      usage: usage
    });
  } catch (error) {
    console.error('[Dashboard] Erro ao carregar dados:', error);
    return json({
      shop: shopDomain,
      currentPlan: null,
      billingStatus: null,
      imagesIncluded: 0,
      imagesUsed: 0,
      pricePerExtra: 0,
      currency: 'USD',
      usage: null,
      error: error.message
    });
  }
};

export default function DashboardPage() {
  const {
    shop,
    currentPlan,
    billingStatus,
    imagesIncluded,
    imagesUsed,
    pricePerExtra,
    currency,
    usage,
    error
  } = useLoaderData();

  const navigate = useNavigate();

  const getBillingStatusBadge = (status) => {
    if (!status) return { tone: 'critical', label: 'Sem Plano' };

    switch (status) {
      case 'active':
        return { tone: 'success', label: 'Ativo' };
      case 'pending':
        return { tone: 'warning', label: 'Pendente' };
      case 'cancelled':
        return { tone: 'critical', label: 'Cancelado' };
      case 'inactive':
        return { tone: 'critical', label: 'Inativo' };
      case 'manual':
        return { tone: 'info', label: 'Manual (Enterprise)' };
      default:
        return { tone: 'info', label: status };
    }
  };

  const getPlanDisplayName = (plan) => {
    if (!plan) return 'Nenhum';

    const planNames = {
      starter: 'Starter',
      pro: 'Pro',
      enterprise: 'Enterprise'
    };

    return planNames[plan] || plan;
  };

  const statusBadge = getBillingStatusBadge(billingStatus);
  const extraImages = Math.max(0, imagesUsed - imagesIncluded);

  return (
    <Page
      title="Dashboard Omafit"
      subtitle="Bem-vindo ao provador virtual Omafit"
    >
      <Layout>
        {/* Erro banner */}
        {error && (
          <Layout.Section>
            <Banner tone="critical">
              <p>Erro ao carregar dados: {error}</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Info da loja e plano */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Informações da Conta
              </Text>

              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="bodyMd" tone="subdued">
                    Loja
                  </Text>
                  <Text variant="bodyMd" fontWeight="semibold">
                    {shop}
                  </Text>
                </InlineStack>

                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="bodyMd" tone="subdued">
                    Plano Atual
                  </Text>
                  <Text variant="bodyMd" fontWeight="semibold">
                    {getPlanDisplayName(currentPlan)}
                  </Text>
                </InlineStack>

                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="bodyMd" tone="subdued">
                    Status de Billing
                  </Text>
                  <Badge tone={statusBadge.tone}>
                    {statusBadge.label}
                  </Badge>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Uso do mês */}
        {billingStatus === 'active' && usage && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Uso do Mês
                </Text>

                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="bodyLg" fontWeight="semibold">
                      Imagens Geradas
                    </Text>
                    <Text variant="bodyLg" fontWeight="bold">
                      {imagesUsed} / {imagesIncluded}
                    </Text>
                  </InlineStack>

                  <ProgressBar
                    progress={usage.percentage}
                    tone={usage.percentage > 90 ? 'critical' : usage.percentage > 70 ? 'attention' : 'success'}
                  />

                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="bodyMd" tone="subdued">
                      Restantes
                    </Text>
                    <Text variant="bodyMd">
                      {usage.remaining} imagens
                    </Text>
                  </InlineStack>

                  {extraImages > 0 && (
                    <>
                      <InlineStack align="space-between" blockAlign="center">
                        <Text variant="bodyMd" tone="subdued">
                          Imagens Extras
                        </Text>
                        <Text variant="bodyMd" fontWeight="semibold">
                          {extraImages} imagens
                        </Text>
                      </InlineStack>

                      <InlineStack align="space-between" blockAlign="center">
                        <Text variant="bodyMd" tone="subdued">
                          Custo Extra Estimado
                        </Text>
                        <Text variant="bodyMd" fontWeight="semibold">
                          {currency} ${(extraImages * pricePerExtra).toFixed(2)}
                        </Text>
                      </InlineStack>

                      <Banner tone="info">
                        <p>
                          Você está usando {extraImages} {extraImages === 1 ? 'imagem' : 'imagens'} além do limite incluído.
                          Custo adicional: {currency} ${pricePerExtra} por imagem.
                        </p>
                      </Banner>
                    </>
                  )}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Sem plano ativo */}
        {!billingStatus || billingStatus !== 'active' && (
          <Layout.Section>
            <Banner
              tone="warning"
              title="Nenhum plano ativo"
            >
              <p>
                Você ainda não possui um plano ativo. Escolha um plano para começar a usar o Omafit.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {/* Ações rápidas */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Ações Rápidas
              </Text>

              <BlockStack gap="300">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => navigate('/app/plans')}
                >
                  {currentPlan ? 'Gerenciar Planos' : 'Escolher Plano'}
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/app/widget')}
                >
                  Configurar Widget
                </Button>

                <Button
                  fullWidth
                  onClick={() => navigate('/app/usage')}
                >
                  Ver Histórico de Uso
                </Button>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Card informativo */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Sobre o Omafit
              </Text>
              <Text variant="bodyMd" tone="subdued">
                O Omafit é um provador virtual alimentado por IA que permite que seus clientes experimentem suas roupas virtualmente, aumentando a confiança na compra e reduzindo devoluções.
              </Text>
              <InlineStack gap="200">
                <Button
                  url="https://omafit.co"
                  external
                >
                  Saiba Mais
                </Button>
                <Button
                  url="mailto:contato@omafit.co"
                  external
                >
                  Suporte
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
