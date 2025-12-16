/**
 * Página de Histórico de Uso - /app/usage
 *
 * Mostra o histórico de uso de imagens e cobranças
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  EmptyState,
  Spinner
} from '@shopify/polaris';

export default function UsagePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shopDomain = searchParams.get('shop') || 'demo-shop.myshopify.com';
  const [loading, setLoading] = useState(true);
  const [usageRecords, setUsageRecords] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUsageRecords();
  }, []);

  const loadUsageRecords = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/shopify_usage_records?shop_domain=eq.${shopDomain}&order=created_at.desc&limit=100`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsageRecords(data);
      } else {
        throw new Error('Failed to load usage records');
      }
    } catch (err) {
      console.error('[Usage] Error loading records:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Page title="Usage History">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400" inlineAlign="center">
                <Spinner size="large" />
                <Text variant="bodyMd">Loading usage records...</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const rows = usageRecords.map((record) => [
    formatDate(record.created_at),
    record.description || '-',
    record.images_count || 0,
    `${record.currency || 'USD'} $${(record.amount || 0).toFixed(2)}`,
    record.billing_month || '-'
  ]);

  return (
    <Page
      title="Usage History"
      subtitle="Track your image generation usage and charges"
      backAction={{ content: 'Dashboard', onAction: () => navigate(`/app?shop=${shopDomain}`) }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            {usageRecords.length === 0 ? (
              <EmptyState
                heading="No usage records yet"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Your usage history will appear here once you start generating images.</p>
              </EmptyState>
            ) : (
              <DataTable
                columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
                headings={['Date', 'Description', 'Images', 'Amount', 'Billing Month']}
                rows={rows}
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
