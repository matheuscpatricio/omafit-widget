/**
 * Página de Configuração do Widget - /app/widget
 *
 * Permite ao lojista configurar a aparência e comportamento do widget
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  Button,
  Banner,
  Select,
  Divider,
  Spinner
} from '@shopify/polaris';

export default function WidgetPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shopDomain = searchParams.get('shop') || 'demo-shop.myshopify.com';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [config, setConfig] = useState({
    button_text: 'Try On',
    button_color: '#000000',
    button_text_color: '#FFFFFF',
    button_position: 'below_add_to_cart',
    widget_enabled: true
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/widget_configurations?shop_domain=eq.${shopDomain}`,
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
        if (data && data.length > 0) {
          setConfig(data[0]);
        }
      }
    } catch (err) {
      console.error('[Widget] Error loading config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/widget_configurations`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            shop_domain: shopDomain,
            ...config
          })
        }
      );

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (err) {
      console.error('[Widget] Error saving config:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = useCallback((field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  if (loading) {
    return (
      <Page title="Widget Configuration">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400" inlineAlign="center">
                <Spinner size="large" />
                <Text variant="bodyMd">Loading configuration...</Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Widget Configuration"
      subtitle="Customize your virtual try-on widget"
      backAction={{ content: 'Dashboard', onAction: () => navigate(`/app?shop=${shopDomain}`) }}
    >
      <Layout>
        {success && (
          <Layout.Section>
            <Banner tone="success" onDismiss={() => setSuccess(false)}>
              <p>Configuration saved successfully!</p>
            </Banner>
          </Layout.Section>
        )}

        {error && (
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Button Settings
              </Text>

              <TextField
                label="Button Text"
                value={config.button_text}
                onChange={(value) => handleChange('button_text', value)}
                helpText="Text displayed on the try-on button"
              />

              <TextField
                label="Button Color"
                type="color"
                value={config.button_color}
                onChange={(value) => handleChange('button_color', value)}
                helpText="Background color of the button"
              />

              <TextField
                label="Button Text Color"
                type="color"
                value={config.button_text_color}
                onChange={(value) => handleChange('button_text_color', value)}
                helpText="Color of the text on the button"
              />

              <Select
                label="Button Position"
                options={[
                  { label: 'Below Add to Cart', value: 'below_add_to_cart' },
                  { label: 'Above Add to Cart', value: 'above_add_to_cart' },
                  { label: 'In Product Gallery', value: 'in_gallery' }
                ]}
                value={config.button_position}
                onChange={(value) => handleChange('button_position', value)}
              />

              <Divider />

              <InlineStack align="end">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={saving}
                >
                  Save Configuration
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Widget Installation
              </Text>
              <Text variant="bodyMd" tone="subdued">
                The widget is automatically installed on your store. Make sure you have enabled the app embed in your theme settings.
              </Text>
              <Button url={`https://${shopDomain}/admin/themes/current/editor`} external>
                Open Theme Editor
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
