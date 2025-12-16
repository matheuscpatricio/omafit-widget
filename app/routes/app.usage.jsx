/**
 * Página de Histórico de Uso - /app/usage
 *
 * Mostra o histórico de uso de imagens e cobranças
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
  DataTable,
  Banner,
  EmptyState
} from '@shopify/polaris';
import { authenticate } from '../shopify.server';
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

    const { data: usageRecords } = await supabase
      .from('shopify_usage_records')
      .select('created_at, description, images_count, amount, currency, billing_month')
      .eq('shop_domain', shopDomain)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: tryonSessions } = await supabase
      .from('tryon_sessions')
      .select('created_at, status')
      .eq('shop_domain', shopDomain)
      .order('created_at', { ascending: false })
      .limit(50);

    const dailyUsage = {};
    if (tryonSessions) {
      tryonSessions.forEach(session => {
        const date = new Date(session.created_at).toISOString().split('T')[0];
        if (!dailyUsage[date]) {
          dailyUsage[date] = { date, count: 0, completed: 0 };
        }
        dailyUsage[date].count++;
        if (session.status === 'completed') {
          dailyUsage[date].completed++;
        }
      });
    }

    const dailyUsageArray = Object.values(dailyUsage)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    const { data: shopBilling } = await supabase
      .from('shopify_shops')
      .select('images_used_month, images_included, plan, billing_cycle_start, billing_cycle_end')
      .eq('shop_domain', shopDomain)
      .maybeSingle();

    return {
      shop: shopDomain,
      usageRecords: (usageRecords || []).map(r => ({
        created_at: r.created_at,
        description: r.description,
        images_count: r.images_count,
        amount: r.amount,
        currency: r.currency,
        billing_month: r.billing_month
      })),
      dailyUsage: dailyUsageArray,
      shopBilling: shopBilling ? {
        images_used_month: shopBilling.images_used_month,
        images_included: shopBilling.images_included,
        plan: shopBilling.plan,
        billing_cycle_start: shopBilling.billing_cycle_start,
        billing_cycle_end: shopBilling.billing_cycle_end
      } : null,
      totalSessions: tryonSessions?.length || 0
    };
  } catch (error) {
    console.error('[Usage History] Erro ao carregar dados:', error);
    return {
      shop: shopDomain,
      usageRecords: [],
      dailyUsage: [],
      shopBilling: null,
      totalSessions: 0,
      error: error.message
    };
  }
};

export default function UsageHistoryPage() {
  const { shop, usageRecords, dailyUsage, shopBilling, totalSessions, error } = useLoaderData();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const dailyUsageRows = dailyUsage.map(day => [
    formatDate(day.date),
    day.count.toString(),
    day.completed.toString(),
    `${Math.round((day.completed / day.count) * 100)}%`
  ]);

  const usageRecordsRows = usageRecords.map(record => [
    formatDateTime(record.created_at),
    record.description || 'Imagens extras',
    record.images_count.toString(),
    formatCurrency(record.amount, record.currency),
    record.billing_month
  ]);

  const currentPeriodStart = shopBilling?.billing_cycle_start
    ? formatDate(shopBilling.billing_cycle_start)
    : 'N/A';
  const currentPeriodEnd = shopBilling?.billing_cycle_end
    ? formatDate(shopBilling.billing_cycle_end)
    : 'N/A';

  return (
    <Page
      title="Histórico de Uso"
      subtitle="Acompanhe o uso de imagens e cobranças"
      backAction={{ content: 'Dashboard', url: '/app' }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical">
              <p>Erro ao carregar histórico: {error}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Resumo do Período Atual
              </Text>

              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="bodyMd" tone="subdued">
                    Período
                  </Text>
                  <Text variant="bodyMd" fontWeight="semibold">
                    {currentPeriodStart} - {currentPeriodEnd}
                  </Text>
                </InlineStack>

                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="bodyMd" tone="subdued">
                    Plano
                  </Text>
                  <Badge>
                    {shopBilling?.plan?.toUpperCase() || 'N/A'}
                  </Badge>
                </InlineStack>

                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="bodyMd" tone="subdued">
                    Imagens Usadas
                  </Text>
                  <Text variant="bodyMd" fontWeight="semibold">
                    {shopBilling?.images_used_month || 0} / {shopBilling?.images_included || 0}
                  </Text>
                </InlineStack>

                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="bodyMd" tone="subdued">
                    Total de Sessões
                  </Text>
                  <Text variant="bodyMd" fontWeight="semibold">
                    {totalSessions}
                  </Text>
                </InlineStack>

                {shopBilling && shopBilling.images_used_month > shopBilling.images_included && (
                  <Banner tone="info">
                    <p>
                      Você ultrapassou o limite incluído no seu plano.
                      Total de imagens extras: {shopBilling.images_used_month - shopBilling.images_included}
                    </p>
                  </Banner>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Uso Diário de Imagens
              </Text>

              {dailyUsage.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'numeric', 'numeric', 'numeric']}
                  headings={[
                    'Data',
                    'Total de Sessões',
                    'Completadas',
                    'Taxa de Sucesso'
                  ]}
                  rows={dailyUsageRows}
                />
              ) : (
                <EmptyState
                  heading="Nenhum uso registrado"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Ainda não há registros de uso de imagens para exibir.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Histórico de Cobranças
              </Text>

              {usageRecords.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'numeric', 'text']}
                  headings={[
                    'Data',
                    'Descrição',
                    'Imagens',
                    'Valor',
                    'Mês de Billing'
                  ]}
                  rows={usageRecordsRows}
                />
              ) : (
                <EmptyState
                  heading="Nenhuma cobrança registrada"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Ainda não há cobranças de imagens extras para exibir.</p>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Sobre o Uso e Cobranças
              </Text>

              <BlockStack gap="300">
                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">
                    Como são contabilizadas as imagens?
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Cada vez que um cliente gera uma imagem virtual usando o provador, isso é contabilizado no seu uso mensal. O contador é resetado no início de cada ciclo de billing.
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">
                    Quando ocorrem as cobranças por imagens extras?
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Quando você ultrapassa o limite de imagens incluídas no seu plano, cada imagem adicional é cobrada automaticamente de acordo com a taxa do seu plano. A cobrança é processada através do sistema de billing da Shopify.
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">
                    Como visualizar minhas faturas?
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Todas as cobranças do Omafit aparecem na sua fatura da Shopify. Você pode visualizá-las em Configurações → Cobrança na sua admin da Shopify.
                  </Text>
                </BlockStack>

                <BlockStack gap="100">
                  <Text variant="bodyMd" fontWeight="semibold">
                    O que é uma sessão?
                  </Text>
                  <Text variant="bodyMd" tone="subdued">
                    Uma sessão representa cada vez que um cliente abre o provador virtual. Uma sessão pode ou não resultar em uma imagem gerada, dependendo se o cliente completou o processo.
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
