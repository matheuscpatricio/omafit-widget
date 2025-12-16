/**
 * Página de Configuração do Widget - /app/widget
 *
 * Permite ao lojista configurar a aparência e comportamento do widget
 */

import { useLoaderData, useActionData, Form, useNavigation } from '@remix-run/react';
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
  ColorPicker,
  Divider
} from '@shopify/polaris';
import { useState, useCallback } from 'react';
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

    const { data: shopifyShop } = await supabase
      .from('shopify_shops')
      .select('user_id')
      .eq('shop_domain', shopDomain)
      .maybeSingle();

    const userId = shopifyShop?.user_id;

    if (!userId) {
      return {
        shop: shopDomain,
        config: null,
        error: 'Loja não encontrada no banco de dados'
      };
    }

    const { data: widgetConfig } = await supabase
      .from('widget_keys')
      .select('link_text, primary_color, background_color, text_color, overlay_color, store_name, store_logo, font_family')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      shop: shopDomain,
      userId: userId,
      config: widgetConfig || {
        link_text: 'Experimentar virtualmente',
        primary_color: '#810707',
        background_color: '#ffffff',
        text_color: '#810707',
        overlay_color: '#810707CC',
        store_name: '',
        store_logo: '',
        font_family: 'Outfit, sans-serif'
      }
    };
  } catch (error) {
    console.error('[Widget Config] Erro ao carregar configuração:', error);
    return {
      shop: shopDomain,
      config: null,
      error: error.message
    };
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (!session || !session.shop) {
    return json({ error: 'Não autenticado' }, { status: 401 });
  }

  const shopDomain = session.shop;
  const formData = await request.formData();

  const linkText = formData.get('link_text');
  const primaryColor = formData.get('primary_color');
  const backgroundColor = formData.get('background_color');
  const textColor = formData.get('text_color');
  const overlayColor = formData.get('overlay_color');
  const storeName = formData.get('store_name');
  const storeLogo = formData.get('store_logo');
  const fontFamily = formData.get('font_family');

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: shopifyShop, error: shopError } = await supabase
      .from('shopify_shops')
      .select('user_id')
      .eq('shop_domain', shopDomain)
      .maybeSingle();

    if (shopError || !shopifyShop) {
      throw new Error('Loja não encontrada');
    }

    const userId = shopifyShop.user_id;

    const { data: existingWidget, error: checkError } = await supabase
      .from('widget_keys')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (checkError) {
      console.error('[Widget Config] Erro ao verificar widget existente:', checkError);
    }

    if (existingWidget) {
      const { error: updateError } = await supabase
        .from('widget_keys')
        .update({
          link_text: linkText,
          primary_color: primaryColor,
          background_color: backgroundColor,
          text_color: textColor,
          overlay_color: overlayColor,
          store_name: storeName,
          store_logo: storeLogo,
          font_family: fontFamily,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingWidget.id);

      if (updateError) {
        throw new Error('Erro ao atualizar configuração');
      }
    } else {
      const { error: insertError } = await supabase
        .from('widget_keys')
        .insert({
          user_id: userId,
          key: `wgt_${Math.random().toString(36).substring(2, 18)}`,
          name: `Widget ${shopDomain}`,
          status: 'active',
          link_text: linkText,
          primary_color: primaryColor,
          background_color: backgroundColor,
          text_color: textColor,
          overlay_color: overlayColor,
          store_name: storeName,
          store_logo: storeLogo,
          font_family: fontFamily
        });

      if (insertError) {
        throw new Error('Erro ao criar configuração');
      }
    }

    return {
      success: true,
      message: 'Configuração salva com sucesso!'
    };
  } catch (error) {
    console.error('[Widget Config] Erro ao salvar:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default function WidgetConfigPage() {
  const { shop, userId, config, error } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === 'submitting';

  const fontOptions = [
    { label: 'Outfit', value: 'Outfit, sans-serif' },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Open Sans', value: 'Open Sans, sans-serif' },
    { label: 'Montserrat', value: 'Montserrat, sans-serif' },
    { label: 'Playfair Display', value: 'Playfair Display, serif' },
    { label: 'Raleway', value: 'Raleway, sans-serif' }
  ];

  return (
    <Page
      title="Configurar Widget"
      subtitle="Personalize a aparência do provador virtual"
      backAction={{ content: 'Dashboard', url: '/app' }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical">
              <p>Erro: {error}</p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.success && (
          <Layout.Section>
            <Banner tone="success">
              <p>{actionData.message}</p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical">
              <p>Erro ao salvar: {actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}

        {!config && !error && (
          <Layout.Section>
            <Banner tone="warning">
              <p>Nenhuma configuração encontrada. Preencha o formulário abaixo para criar sua configuração.</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Form method="post">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Textos e Marca
                  </Text>

                  <TextField
                    label="Texto do Botão"
                    name="link_text"
                    value={config?.link_text}
                    helpText="Texto que aparece no botão para abrir o provador virtual"
                    autoComplete="off"
                  />

                  <TextField
                    label="Nome da Loja"
                    name="store_name"
                    value={config?.store_name || ''}
                    helpText="Nome da sua loja (opcional)"
                    autoComplete="off"
                  />

                  <TextField
                    label="URL do Logo"
                    name="store_logo"
                    value={config?.store_logo || ''}
                    helpText="URL do logo da sua loja (opcional)"
                    placeholder="https://exemplo.com/logo.png"
                    autoComplete="off"
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Cores
                  </Text>

                  <TextField
                    label="Cor Primária"
                    name="primary_color"
                    value={config?.primary_color}
                    helpText="Cor principal do widget (botões, destaques)"
                    type="color"
                    autoComplete="off"
                  />

                  <TextField
                    label="Cor de Fundo"
                    name="background_color"
                    value={config?.background_color}
                    helpText="Cor de fundo do modal"
                    type="color"
                    autoComplete="off"
                  />

                  <TextField
                    label="Cor do Texto"
                    name="text_color"
                    value={config?.text_color}
                    helpText="Cor dos textos no widget"
                    type="color"
                    autoComplete="off"
                  />

                  <TextField
                    label="Cor do Overlay"
                    name="overlay_color"
                    value={config?.overlay_color}
                    helpText="Cor do fundo escuro atrás do modal (formato: #RRGGBBAA)"
                    placeholder="#000000CC"
                    autoComplete="off"
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Tipografia
                  </Text>

                  <Select
                    label="Fonte"
                    name="font_family"
                    options={fontOptions}
                    value={config?.font_family || 'Outfit, sans-serif'}
                    helpText="Fonte utilizada no widget"
                  />
                </BlockStack>
              </Card>

              <Card>
                <InlineStack align="end">
                  <Button
                    variant="primary"
                    submit
                    loading={isSubmitting}
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Configuração'}
                  </Button>
                </InlineStack>
              </Card>
            </BlockStack>
          </Form>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Prévia das Cores
              </Text>

              <InlineStack gap="400" wrap>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: config?.primary_color || '#810707',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  />
                  <Text variant="bodyMd" tone="subdued">
                    Primária
                  </Text>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: config?.background_color || '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      marginBottom: '8px'
                    }}
                  />
                  <Text variant="bodyMd" tone="subdued">
                    Fundo
                  </Text>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: config?.text_color || '#810707',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  />
                  <Text variant="bodyMd" tone="subdued">
                    Texto
                  </Text>
                </div>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Instalação do Widget
              </Text>

              <Text variant="bodyMd" tone="subdued">
                Para instalar o widget no seu tema Shopify:
              </Text>

              <BlockStack gap="200">
                <InlineStack gap="200" blockAlign="start">
                  <Text fontWeight="semibold">1.</Text>
                  <Text>Acesse <strong>Loja online → Temas → Editar código</strong></Text>
                </InlineStack>

                <InlineStack gap="200" blockAlign="start">
                  <Text fontWeight="semibold">2.</Text>
                  <Text>Abra o arquivo <strong>theme.liquid</strong></Text>
                </InlineStack>

                <InlineStack gap="200" blockAlign="start">
                  <Text fontWeight="semibold">3.</Text>
                  <Text>Adicione o código do widget antes do fechamento da tag <strong>{"</body>"}</strong></Text>
                </InlineStack>

                <InlineStack gap="200" blockAlign="start">
                  <Text fontWeight="semibold">4.</Text>
                  <Text>As configurações serão aplicadas automaticamente</Text>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
