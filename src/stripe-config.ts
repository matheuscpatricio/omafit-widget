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
    id: 'prod_100images',
    priceId: 'price_1SL4RkHmxK0nVXtdMMKHgpCD',
    name: 'Basic',
    description: '100 imagens por mês',
    mode: 'subscription',
    price: 130.00,
    currency: 'BRL'
  },
  {
    id: 'prod_500images',
    priceId: 'price_1SL4RkHmxK0nVXtdgkZXUalu',
    name: 'Starter',
    description: '500 imagens por mês',
    mode: 'subscription',
    price: 550.00,
    currency: 'BRL'
  },
  {
    id: 'prod_1000images',
    priceId: 'price_1SL4RkHmxK0nVXtdvywZ4buS',
    name: 'Growth',
    description: '1000 imagens por mês',
    mode: 'subscription',
    price: 975.00,
    currency: 'BRL'
  },
  {
    id: 'prod_3000images',
    priceId: 'price_1SL4RkHmxK0nVXtdaIluRwms',
    name: 'Scale',
    description: '3000 imagens por mês',
    mode: 'subscription',
    price: 2400.00,
    currency: 'BRL'
  }
];

export function getProductById(id: string): Product | undefined {
  return products.find(product => product.id === id);
}

export function getProductByPriceId(priceId: string): Product | undefined {
  return products.find(product => product.priceId === priceId);
}