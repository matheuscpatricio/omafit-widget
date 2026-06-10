import type { WelcomeLocale } from "./locale-from-country.ts";

export type WelcomeEmailContent = {
  subject: string;
  html: string;
  text: string;
};

const SUPPORT_EMAIL = "contato@omafit.co";
const DOCS_URL = "https://omafit.co";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildWelcomeEmail(
  locale: WelcomeLocale,
  shopName: string,
): WelcomeEmailContent {
  const safeShopName = escapeHtml(shopName);

  const copy = {
    pt: {
      subject: "Bem-vindo ao Omafit — podemos ajudar na implementação?",
      greeting: `Olá, equipe da ${shopName}!`,
      intro:
        "Obrigado por instalar o Omafit na sua loja Shopify. Estamos felizes em ter você conosco.",
      help:
        "Precisa de ajuda para configurar o provador virtual, widget ou integração? Responda este e-mail — nossa equipe orienta você passo a passo.",
      cta: "Visitar o Omafit",
      signOff: "Abraços,\nEquipe Omafit",
    },
    es: {
      subject: "Bienvenido a Omafit — ¿necesitas ayuda con la implementación?",
      greeting: `¡Hola, equipo de ${shopName}!`,
      intro:
        "Gracias por instalar Omafit en tu tienda Shopify. Nos alegra tenerte con nosotros.",
      help:
        "¿Necesitas ayuda para configurar el probador virtual, el widget o la integración? Responde a este correo y te guiaremos paso a paso.",
      cta: "Visitar Omafit",
      signOff: "Saludos,\nEquipo Omafit",
    },
    en: {
      subject: "Welcome to Omafit — need help getting set up?",
      greeting: `Hi ${shopName} team,`,
      intro:
        "Thanks for installing Omafit on your Shopify store. We're excited to have you on board.",
      help:
        "Need help setting up virtual try-on, the widget, or your integration? Reply to this email and our team will walk you through it.",
      cta: "Visit Omafit",
      signOff: "Best,\nThe Omafit team",
    },
  }[locale];

  const text = [
    copy.greeting,
    "",
    copy.intro,
    "",
    copy.help,
    "",
    `${copy.cta}: ${DOCS_URL}`,
    "",
    copy.signOff,
    SUPPORT_EMAIL,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="${locale}">
  <body style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
    <p style="font-size: 18px; font-weight: 600;">${escapeHtml(copy.greeting)}</p>
    <p>${escapeHtml(copy.intro)}</p>
    <p>${escapeHtml(copy.help)}</p>
    <p style="margin: 28px 0;">
      <a href="${DOCS_URL}" style="background: #8b5cf6; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; display: inline-block;">
        ${escapeHtml(copy.cta)}
      </a>
    </p>
    <p style="white-space: pre-line; color: #4b5563;">${escapeHtml(copy.signOff)}</p>
    <p style="color: #6b7280; font-size: 14px;">${SUPPORT_EMAIL}</p>
  </body>
</html>`;

  return {
    subject: copy.subject,
    html,
    text,
  };
}
