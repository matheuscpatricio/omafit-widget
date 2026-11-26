import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { widgetTranslations, type WidgetTranslationKey } from '../locales/widget-translations';
import { ShopperEmailOptInPrompt } from './ShopperEmailOptInPrompt';

function t(key: WidgetTranslationKey): string {
  return widgetTranslations.pt[key as keyof typeof widgetTranslations.pt] ?? key;
}

describe('shopper email opt-in', () => {
  it('asks for an email and marketing consent', () => {
    const html = renderToStaticMarkup(
      createElement(ShopperEmailOptInPrompt, {
        primaryColor: '#111111',
        t,
        email: '',
        consentChecked: false,
      })
    );

    expect(html).toContain('type="email"');
    expect(html).toContain('Receber novidades por e-mail');
    expect(html).toContain('Aceito receber e-mails da loja');
    expect(html).not.toContain('type="tel"');
    expect(html).not.toContain('WhatsApp');
  });

  it('offers a way to stop emails after the opt-in is active', () => {
    const html = renderToStaticMarkup(
      createElement(ShopperEmailOptInPrompt, {
        mode: 'manage',
        primaryColor: '#111111',
        t,
      })
    );

    expect(html).toContain('Deixar de receber e-mails');
    expect(html).not.toContain('type="email"');
  });
});
