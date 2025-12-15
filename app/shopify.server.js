/**
 * Shopify App Bridge Server
 *
 * Este arquivo configura a autenticação com o Shopify Admin
 * Normalmente gerado automaticamente pelo Shopify CLI
 */

import '@shopify/shopify-app-remix/adapters/node';
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from '@shopify/shopify-app-remix/server';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-10';

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
  apiVersion: ApiVersion.October24,
  scopes: process.env.SCOPES?.split(',') || [],
  appUrl: process.env.SHOPIFY_APP_URL || '',
  authPathPrefix: '/auth',
  sessionStorage: null, // Configurar storage apropriado
  distribution: AppDistribution.AppStore,
  restResources,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN && {
    customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN],
  }),
});

export default shopify;
export const apiVersion = ApiVersion.October24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
