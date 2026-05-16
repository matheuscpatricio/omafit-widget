/** CSS de fonte para o iframe do provador (stack da loja ou Google Fonts para nome único). */
export function buildWidgetFontStyleBlock(fontFamily: string): string {
  const raw = String(fontFamily || '').trim();
  if (!raw || raw === 'inherit') {
    return `* { font-family: inherit !important; }`;
  }
  if (raw.includes(',')) {
    return `* { font-family: ${raw} !important; }`;
  }
  const escaped = raw.replace(/'/g, "\\'");
  const googleName = raw.replace(/ /g, '+');
  return `
    @import url('https://fonts.googleapis.com/css2?family=${googleName}:wght@300;400;500;600;700&display=swap');
    * { font-family: '${escaped}', sans-serif !important; }
  `;
}
