function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type BodyLengthCollectionType = 'upper' | 'lower' | 'full';

/**
 * Comprimento corporal de referência para comparar com a tabela (campo Comprimento).
 * - upper: tronco / costas (não altura total)
 * - lower: comprimento de perna
 * - full: altura útil (sem cabeça)
 */
export function resolveBodyLengthReference(options: {
  heightCm: number;
  gender?: string;
  collectionType: BodyLengthCollectionType;
  legLengthCm?: number;
  torsoLengthCm?: number;
}): { valueCm: number; source: string } {
  const height = options.heightCm;
  const gender = options.gender || 'male';
  const headLength = height * 0.13;
  const expectedLeg = height * (gender === 'female' ? 0.49 : 0.47);
  const expectedTrunk = Math.max(height - expectedLeg - headLength, height * 0.3);

  const legPlausible = (leg?: number) =>
    typeof leg === 'number' && Number.isFinite(leg) && leg >= height * 0.38 && leg <= height * 0.56;

  if (options.collectionType === 'lower') {
    if (legPlausible(options.legLengthCm)) {
      return { valueCm: Math.round(options.legLengthCm!), source: 'perna (foto)' };
    }
    return { valueCm: Math.round(expectedLeg), source: 'perna (estimativa por altura)' };
  }

  if (options.collectionType === 'full') {
    return { valueCm: Math.round(height - headLength), source: 'altura − cabeça' };
  }

  // upper — tronco para peças superiores
  const torso = options.torsoLengthCm;
  if (typeof torso === 'number' && torso >= height * 0.2 && torso <= height * 0.42) {
    const fromTorso = clamp(torso * 1.22, height * 0.32, height * 0.48);
    return { valueCm: Math.round(fromTorso), source: 'tronco ombro→quadril (foto)' };
  }

  if (legPlausible(options.legLengthCm)) {
    const fromLeg = Math.max(height - options.legLengthCm! - headLength, height * 0.3);
    return { valueCm: Math.round(fromLeg), source: 'altura − perna − cabeça' };
  }

  return { valueCm: Math.round(expectedTrunk), source: 'tronco (estimativa por altura)' };
}
