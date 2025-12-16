/**
 * Página de Billing - /app/billing
 *
 * Exibe os planos disponíveis e o uso atual de imagens
 */

import { useLoaderData, useNavigate } from '@remix-run/react';
import { Page, Layout, BlockStack } from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import { BillingPlans } from '../components/BillingPlans';
import { UsageIndicator } from '../components/UsageIndicator';
import { getShopBilling } from '../utils/shopify-billing.server';
import { getImageUsageInfo } from '../utils/usage-billing.server';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (!session || !session.shop) {
    return { error: 'Não autenticado' };
  }

  const shopDomain = session.shop;

  try {
    const shopBilling = await getShopBilling(shopDomain);

    let usage = null;
    if (shopBilling && shopBilling.billing_status === 'active') {
      usage = await getImageUsageInfo(shopDomain);
    }

    return {
      shop: shopDomain,
      currentPlan: shopBilling?.plan || null,
      billingStatus: shopBilling?.billing_status || null,
      usage: usage ? {
        used: usage.used || 0,
        included: usage.included || 0,
        remaining: usage.remaining || 0,
        percentage: usage.percentage || 0
      } : null
    };
  } catch (error) {
    console.error('Erro ao carregar dados de billing:', error);
    return {
      shop: shopDomain,
      currentPlan: null,
      billingStatus: null,
      usage: null,
      error: error.message
    };
  }
};

export default function BillingPage() {
  const { shop, currentPlan, billingStatus, usage, error } = useLoaderData();
  const navigate = useNavigate();

  const handleSelectPlan = async (planName) => {
    try {
      // Chamar API para iniciar billing
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

      // Redirecionar para confirmationUrl da Shopify
      if (data.confirmationUrl) {
        // Usar window.top para sair do iframe do Shopify Admin
        window.top.location.href = data.confirmationUrl;
      }
    } catch (err) {
      console.error('Erro ao selecionar plano:', err);
      alert(`Erro: ${err.message}`);
    }
  };

  return (
    <Page
      title="Planos e Billing"
      subtitle="Gerencie sua assinatura e uso de imagens"
    >
      <Layout>
        {/* Uso atual (se houver plano ativo) */}
        {usage && (
          <Layout.Section>
            <UsageIndicator usage={usage} />
          </Layout.Section>
        )}

        {/* Planos disponíveis */}
        <Layout.Section>
          <BlockStack gap="400">
            <BillingPlans
              currentPlan={currentPlan}
              onSelectPlan={handleSelectPlan}
            />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
