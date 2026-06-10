import type { WelcomeLocale } from "./locale-from-country.ts";

export type UninstallEmailContent = {
  subject: string;
  html: string;
  text: string;
};

const SUPPORT_EMAIL = "contato@omafit.co";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildUninstallFeedbackEmail(
  locale: WelcomeLocale,
  shopName: string,
): UninstallEmailContent {
  const copy = {
    pt: {
      subject: "Sentimos sua saída — podemos conversar?",
      greeting: `Olá, equipe da ${shopName},`,
      intro:
        "Notamos que você desinstalou o Omafit da sua loja Shopify. Queríamos saber se está tudo bem.",
      ask:
        "Poderia nos contar o motivo? Foi algo na implementação, no produto, no preço ou no suporte? Sua resposta nos ajuda a melhorar.",
      offer:
        "Se quiser, responda este e-mail — adoraríamos conversar e ver juntos se há algo que possamos resolver.",
      signOff: "Obrigado pelo tempo com o Omafit,\nEquipe Omafit",
    },
    es: {
      subject: "Lamentamos tu partida — ¿podemos hablar?",
      greeting: `Hola, equipo de ${shopName},`,
      intro:
        "Notamos que desinstalaste Omafit de tu tienda Shopify. Queríamos saber cómo estás.",
      ask:
        "¿Podrías contarnos el motivo? ¿Fue la implementación, el producto, el precio o el soporte? Tu feedback nos ayuda a mejorar.",
      offer:
        "Si quieres, responde a este correo — nos encantaría conversar y ver si podemos resolver la situación juntos.",
      signOff: "Gracias por haber probado Omafit,\nEquipo Omafit",
    },
    en: {
      subject: "Sorry to see you go — can we talk?",
      greeting: `Hi ${shopName} team,`,
      intro:
        "We noticed you uninstalled Omafit from your Shopify store. We wanted to check in.",
      ask:
        "Would you mind sharing why? Was it setup, the product, pricing, or support? Your feedback helps us improve.",
      offer:
        "If you'd like, reply to this email — we'd love to talk and see if there's anything we can help resolve.",
      signOff: "Thanks for trying Omafit,\nThe Omafit team",
    },
  }[locale];

  const text = [
    copy.greeting,
    "",
    copy.intro,
    "",
    copy.ask,
    "",
    copy.offer,
    "",
    copy.signOff,
    SUPPORT_EMAIL,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="${locale}">
  <body style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
    <p style="font-size: 18px; font-weight: 600;">${escapeHtml(copy.greeting)}</p>
    <p>${escapeHtml(copy.intro)}</p>
    <p>${escapeHtml(copy.ask)}</p>
    <p>${escapeHtml(copy.offer)}</p>
    <p style="white-space: pre-line; color: #4b5563;">${escapeHtml(copy.signOff)}</p>
    <p style="color: #6b7280; font-size: 14px;">${SUPPORT_EMAIL}</p>
  </body>
</html>`;

  return { subject: copy.subject, html, text };
}
