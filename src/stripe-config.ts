export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
}

export const products: Product[] = [
  {
    id: 'prod_free',
    priceId: 'free',
    name: 'On-Demand',
    description: 'Grátis para instalar. 5 acessórios AR. Sessões de try-on sob demanda (US$ 0,18 por sessão).',
    mode: 'subscription',
    price: 0,
    currency: 'USD',
  },
  {
    id: 'prod_growth',
    priceId: 'growth',
    name: 'Growth',
    description: 'US$ 89/mês · 700 sessões de try-on · 20 acessórios AR.',
    mode: 'subscription',
    price: 89,
    currency: 'USD',
  },
  {
    id: 'prod_pro',
    priceId: 'price_PRO_3000_IMAGES',
    name: 'Pro',
    description: 'US$ 300/mês · 3.000 sessões de try-on · 100 acessórios AR. Adicionais a US$ 0,08.',
    mode: 'subscription',
    price: 300,
    currency: 'USD',
  },
  {
    id: 'prod_enterprise',
    priceId: 'enterprise',
    name: 'Enterprise',
    description: 'US$ 600/mês · sessões de try-on ilimitadas · acessórios AR ilimitados.',
    mode: 'subscription',
    price: 600,
    currency: 'USD',
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

export function getProductByPriceId(priceId: string): Product | undefined {
  return products.find((product) => product.priceId === priceId);
}
