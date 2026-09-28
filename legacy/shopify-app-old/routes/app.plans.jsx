/**
 * Página de Planos - /app/plans
 *
 * Mostra todos os planos disponíveis e permite trocar de plano
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
  Button,
  Banner,
  Spinner
} from '@shopify/polaris';
import { startBillingSubscription } from './api.billing.start';

export default function PlansPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shopDomain = searchParams.get('shop') || 'demo-shop.myshopify.com';
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const [plansResponse, shopResponse] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/billing_plans?order=monthly_price.asc`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${supabaseUrl}/rest/v1/shopify_shops?shop_domain=eq.${shopDomain}`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData);
      }

      if (shopResponse.ok) {
        const shopData = await shopResponse.json();
        setCurrentPlan(shopData[0]?.plan || null);
      }
    } catch (error) {
      console.error('[Plans] Error loading data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planName) => {
    try {
      setSelectedPlan(planName);
      setError(null);

      const result = await startBillingSubscription(planName, shopDomain);

      if (result.error) {
        setError(result.error);
        setSelectedPlan(null);
        return;
      }

      if (result.confirmationUrl) {
        window.location.href = result.confirmationUrl;
      }
    } catch (error) {
      console.error('[Plans] Error selecting plan:', error);
      setError(error.message);
      setSelectedPlan(null);
    }
  };

  if (loading) {
    return (
      <Page title="Plans">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400" inlineAlign="center">
                <Spinner size="large" />
                <Text variant="bodyMd">Loading plans...</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Choose Your Plan"
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
          <BlockStack gap="400">
            {plans.map((plan) => (
              <Card key={plan.plan_name}>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text variant="headingLg" as="h2">
                          {plan.display_name}
                        </Text>
                        {currentPlan === plan.plan_name && (
                          <Badge tone="success">Current Plan</Badge>
                        )}
                      </InlineStack>

                      <Text variant="bodyLg">
                        {plan.currency} ${plan.monthly_price}/month
                      </Text>

                      <Text variant="bodyMd" tone="subdued">
                        {plan.images_included} images included
                      </Text>

                      <Text variant="bodyMd" tone="subdued">
                        Extra images: {plan.currency} ${plan.price_per_extra_image} each
                      </Text>
                    </BlockStack>

                    <Button
                      variant={currentPlan === plan.plan_name ? 'secondary' : 'primary'}
                      onClick={() => handleSelectPlan(plan.plan_name)}
                      loading={selectedPlan === plan.plan_name}
                      disabled={currentPlan === plan.plan_name || selectedPlan !== null}
                    >
                      {currentPlan === plan.plan_name ? 'Current Plan' : 'Select Plan'}
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            ))}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
