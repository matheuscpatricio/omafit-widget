const VAGUE =
  /^(surpreend[ae]|algo\s+(bonito|legal|incrível|incriv|lindo)|me\s+ajud[ae]|não\s+sei|nao\s+sei|qualquer\s+coisa|o\s+que\s+tiver|impression[ae]|surprise\s+me|help\s+me|anything)\b/i;

const SPECIFIC =
  /\b(caro|barat|mais\s+barat|outra\s+opç|outra\s+opc|não\s+gost|nao\s+gost|formal|casual|natal|presente|jeans|preto|bege|festa|trabalho|casamento|dia\s+dos?\s+pai|dia\s+das?\s+m[ãa]es)\b/i;

export type StylistClarificationResult =
  | { needsClarification: false }
  | {
      needsClarification: true;
      assistantMessage: string;
      chipOptions: Array<{ label: string; message: string }>;
    };

export function evaluateStylistClarification(
  message: string,
  language: 'pt' | 'es' | 'en'
): StylistClarificationResult {
  const m = String(message || '').trim();
  if (!m || m.length > 120) return { needsClarification: false };
  if (SPECIFIC.test(m)) return { needsClarification: false };
  /** Só pergunta formal/casual/presente quando o cliente foi explicitamente vago — não em pedidos curtos mas claros ("quero um look", chips, etc.). */
  if (!VAGUE.test(m)) return { needsClarification: false };

  if (language === 'es') {
    return {
      needsClarification: true,
      assistantMessage:
        'Para acertar el look: ¿buscas algo más formal, casual o un regalo para alguien?',
      chipOptions: [
        { label: 'Formal', message: 'Busco un look más formal para ocasión especial' },
        { label: 'Casual', message: 'Quiero algo casual para el día a día' },
        { label: 'Regalo', message: 'Es para regalar, algo versátil' },
      ],
    };
  }
  if (language === 'en') {
    return {
      needsClarification: true,
      assistantMessage:
        'To nail the look: are you going for formal, casual, or shopping for a gift?',
      chipOptions: [
        { label: 'Formal', message: 'I want a more formal look for a special occasion' },
        { label: 'Casual', message: 'Something casual for everyday wear' },
        { label: 'Gift', message: 'It is a gift — versatile pieces' },
      ],
    };
  }
  return {
    needsClarification: true,
    assistantMessage:
      'Para acertar o look: você quer algo mais formal, casual ou é presente para alguém?',
    chipOptions: [
      { label: 'Formal', message: 'Quero um look mais formal para ocasião especial' },
      { label: 'Casual', message: 'Quero algo casual para o dia a dia' },
      { label: 'Presente', message: 'É para presente, peças versáteis' },
    ],
  };
}
