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
    name: 'Free',
    description: 'Grátis para instalar. 50 imagens gratuitas (uma vez) + US$ 0,18 por imagem adicional',
    mode: 'subscription',
    price: 0,
    currency: 'USD'
  },
  {
    id: 'prod_pro',
    priceId: 'price_PRO_3000_IMAGES', // TODO: Criar produto $300/mês no Stripe e colar o price_id aqui
    name: 'Pro',
    description: '3.000 imagens/mês. Adicionais a US$ 0,08',
    mode: 'subscription',
    price: 300,
    currency: 'USD'
  }
];

export function getProductById(id: string): Product | undefined {
  return products.find(product => product.id === id);
}

export function getProductByPriceId(priceId: string): Product | undefined {
  return products.find(product => product.priceId === priceId);
}