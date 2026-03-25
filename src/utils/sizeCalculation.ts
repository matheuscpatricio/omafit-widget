interface SizeChartEntry {
  size_name: string;
  bust?: number;
  waist?: number;
  hips?: number;
  measurements?: { [key: string]: number };
  measurement_labels?: string[];
  order: number;
}

interface RawMeasurements {
  shoulderWidth?: number;
  chestCircumference?: number;
  waistCircumference?: number;
  hipCircumference?: number;
  bodyHeight?: number;
  armLength?: number;
  legLength?: number;
  confidence?: number;
}

interface BodyModel {
  [key: string]: number;
}

interface SizeScore {
  size: string;
  score: number;
  details: {
    [measurement: string]: {
      bodyValue: number;
      garmentValue: number;
      difference: number;
      penalty: number;
    };
  };
}

interface ConfidenceResult {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  percentage: number;
  factors: {
    baseScore: number;
    dominance: number;
    elasticity: number;
  };
}

type ElasticityLevel = 'structured' | 'light' | 'flexible' | 'high';

const ELASTICITY_TOLERANCES: Record<ElasticityLevel, Record<string, number>> = {
  structured: { Peito: 4.0, Busto: 4.0, Cintura: 3.5, Quadril: 4.0, Ombro: 2.5, Comprimento: 3.0, Tornozelo: 2.0 },
  light: { Peito: 5.0, Busto: 5.0, Cintura: 4.5, Quadril: 5.0, Ombro: 3.0, Comprimento: 3.5, Tornozelo: 2.5 },
  flexible: { Peito: 6.0, Busto: 6.0, Cintura: 5.5, Quadril: 6.0, Ombro: 3.5, Comprimento: 4.0, Tornozelo: 3.0 },
  high: { Peito: 8.0, Busto: 8.0, Cintura: 7.0, Quadril: 8.0, Ombro: 4.5, Comprimento: 5.0, Tornozelo: 3.5 }
};

const ASYMMETRY_FACTORS: Record<ElasticityLevel, number> = {
  structured: 2.5,
  light: 2.0,
  flexible: 1.5,
  high: 1.2
};

const DEFAULT_BMI_REFERENCE_TABLE = {
  'Busto': [
    { bmi: 18.5, value: 80 },
    { bmi: 20, value: 84 },
    { bmi: 22, value: 88 },
    { bmi: 24, value: 92 },
    { bmi: 26, value: 96 },
    { bmi: 28, value: 100 },
    { bmi: 30, value: 104 },
    { bmi: 32, value: 108 }
  ],
  'Peito': [
    { bmi: 18.5, value: 85 },
    { bmi: 20, value: 89 },
    { bmi: 22, value: 93 },
    { bmi: 24, value: 97 },
    { bmi: 26, value: 101 },
    { bmi: 28, value: 105 },
    { bmi: 30, value: 109 },
    { bmi: 32, value: 113 }
  ],
  'Cintura': [
    { bmi: 18.5, value: 62 },
    { bmi: 20, value: 66 },
    { bmi: 22, value: 70 },
    { bmi: 24, value: 74 },
    { bmi: 26, value: 78 },
    { bmi: 28, value: 82 },
    { bmi: 30, value: 86 },
    { bmi: 32, value: 90 }
  ],
  'Quadril': [
    { bmi: 18.5, value: 86 },
    { bmi: 20, value: 90 },
    { bmi: 22, value: 94 },
    { bmi: 24, value: 98 },
    { bmi: 26, value: 102 },
    { bmi: 28, value: 106 },
    { bmi: 30, value: 110 },
    { bmi: 32, value: 114 }
  ],
  'Comprimento': [
    { bmi: 18.5, value: 60 },
    { bmi: 20, value: 62 },
    { bmi: 22, value: 64 },
    { bmi: 24, value: 66 },
    { bmi: 26, value: 68 },
    { bmi: 28, value: 70 },
    { bmi: 30, value: 72 },
    { bmi: 32, value: 74 }
  ],
  'Tornozelo': [
    { bmi: 18.5, value: 19 },
    { bmi: 20, value: 20 },
    { bmi: 22, value: 21 },
    { bmi: 24, value: 22 },
    { bmi: 26, value: 23 },
    { bmi: 28, value: 24 },
    { bmi: 30, value: 25 },
    { bmi: 32, value: 26 }
  ],
  'Ombro': [
    { bmi: 18.5, value: 36 },
    { bmi: 20, value: 38 },
    { bmi: 22, value: 40 },
    { bmi: 24, value: 42 },
    { bmi: 26, value: 44 },
    { bmi: 28, value: 46 },
    { bmi: 30, value: 48 },
    { bmi: 32, value: 50 }
  ]
};

function interpolateMeasurement(bmi: number, measurementName: string): number {
  const referenceTable = DEFAULT_BMI_REFERENCE_TABLE[measurementName as keyof typeof DEFAULT_BMI_REFERENCE_TABLE];

  if (!referenceTable) {
    return 0;
  }

  if (bmi <= referenceTable[0].bmi) {
    return referenceTable[0].value;
  }

  const lastEntry = referenceTable[referenceTable.length - 1];
  if (bmi >= lastEntry.bmi) {
    return lastEntry.value;
  }

  for (let i = 0; i < referenceTable.length - 1; i++) {
    const lower = referenceTable[i];
    const upper = referenceTable[i + 1];

    if (bmi >= lower.bmi && bmi <= upper.bmi) {
      const ratio = (bmi - lower.bmi) / (upper.bmi - lower.bmi);
      return lower.value + (upper.value - lower.value) * ratio;
    }
  }

  return referenceTable[0].value;
}

function buildBodyModel(
  height: number,
  weight: number,
  bodyTypeFactor: number,
  rawMeasurements: RawMeasurements | null,
  measurementNames: string[]
): BodyModel {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);

  const bodyModel: BodyModel = {};

  measurementNames.forEach((name) => {
    let measurement = 0;

    if (rawMeasurements && rawMeasurements.confidence && rawMeasurements.confidence > 0.5) {
      const rawKey = name === 'Peito' || name === 'Busto' ? 'chestCircumference' :
                     name === 'Cintura' ? 'waistCircumference' :
                     name === 'Quadril' ? 'hipCircumference' :
                     name === 'Ombro' ? 'shoulderWidth' : null;

      if (rawKey && rawMeasurements[rawKey as keyof RawMeasurements]) {
        measurement = rawMeasurements[rawKey as keyof RawMeasurements] as number;
      } else {
        measurement = interpolateMeasurement(bmi, name);
      }
    } else {
      measurement = interpolateMeasurement(bmi, name);
    }

    bodyModel[name] = measurement * bodyTypeFactor;
  });

  const bmiFactor = Math.max(0.95, Math.min(1.05, 1 + (bmi - 22) * 0.01));
  Object.keys(bodyModel).forEach((key) => {
    bodyModel[key] *= bmiFactor;
  });

  return bodyModel;
}

function normalizeWeights(weights: { [key: string]: number }): { [key: string]: number } {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);

  if (total === 0) return weights;

  const normalized: { [key: string]: number } = {};
  Object.entries(weights).forEach(([key, value]) => {
    normalized[key] = value / total;
  });

  return normalized;
}

/** Medidas com 0 na tabela (ou inválidas) não entram no score; pesos são renormados só entre as ativas. */
function shouldIgnoreGarmentMeasurement(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number') return !Number.isFinite(value) || value === 0;
  const n = Number(String(value).trim().replace(',', '.'));
  return !Number.isFinite(n) || n === 0;
}

function coerceChartNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function getMeasurementValue(entry: SizeChartEntry, key: string, index: number): number {
  let raw: unknown = 0;
  let foundInMeasurementsObject = false;

  if (entry.measurements) {
    const measurementKey = `medida${index + 1}`;
    const value = entry.measurements[measurementKey];
    if (value !== undefined && value !== null) {
      raw = value;
      foundInMeasurementsObject = true;
    } else {
      const directKey = key.toLowerCase();
      const directValue = entry.measurements[directKey];
      if (directValue !== undefined && directValue !== null) {
        raw = directValue;
        foundInMeasurementsObject = true;
      } else if (key === 'Busto' || key === 'Peito') {
        const v =
          entry.measurements.bust ??
          entry.measurements.chest ??
          entry.measurements.busto ??
          entry.measurements.peito;
        if (v !== undefined && v !== null) {
          raw = v;
          foundInMeasurementsObject = true;
        }
      } else if (key === 'Cintura' || key === 'Waist') {
        const v = entry.measurements.waist ?? entry.measurements.cintura;
        if (v !== undefined && v !== null) {
          raw = v;
          foundInMeasurementsObject = true;
        }
      } else if (key === 'Quadril' || key === 'Hip') {
        const v = entry.measurements.hips ?? entry.measurements.hip ?? entry.measurements.quadril;
        if (v !== undefined && v !== null) {
          raw = v;
          foundInMeasurementsObject = true;
        }
      } else if (key === 'Comprimento' || key === 'Length') {
        const v = entry.measurements.comprimento ?? entry.measurements.length;
        if (v !== undefined && v !== null) {
          raw = v;
          foundInMeasurementsObject = true;
        }
      }
    }
  }

  if (!foundInMeasurementsObject) {
    if ((key === 'Busto' || key === 'Peito') && entry.bust !== undefined) raw = entry.bust;
    else if (key === 'Cintura' && entry.waist !== undefined) raw = entry.waist;
    else if (key === 'Quadril' && entry.hips !== undefined) raw = entry.hips;
  }

  return coerceChartNumber(raw);
}

function calculateSizeScores(
  bodyModel: BodyModel,
  fitMultiplier: number,
  sizeChart: SizeChartEntry[],
  measurementNames: string[],
  rawWeights: { [key: string]: number },
  elasticityLevel: ElasticityLevel
): SizeScore[] {
  const scores: SizeScore[] = [];
  const tolerances = ELASTICITY_TOLERANCES[elasticityLevel];
  const asymmetryFactor = ASYMMETRY_FACTORS[elasticityLevel];

  for (const entry of sizeChart) {
    const active: Array<{ name: string; index: number; garmentValue: number }> = [];

    measurementNames.forEach((name, index) => {
      const garmentRaw = getMeasurementValue(entry, name, index);
      if (shouldIgnoreGarmentMeasurement(garmentRaw)) return;
      active.push({
        name,
        index,
        garmentValue: typeof garmentRaw === 'number' ? garmentRaw : coerceChartNumber(garmentRaw),
      });
    });

    if (active.length === 0) {
      scores.push({
        size: entry.size_name,
        score: Number.POSITIVE_INFINITY,
        details: {},
      });
      continue;
    }

    const partialWeights: { [key: string]: number } = {};
    active.forEach(({ name }) => {
      partialWeights[name] = rawWeights[name] ?? 1.0;
    });
    const rowWeights = normalizeWeights(partialWeights);

    let totalScore = 0;
    const details: SizeScore['details'] = {};

    active.forEach(({ name, garmentValue }) => {
      const bodyValue = bodyModel[name] * fitMultiplier;

      let difference = garmentValue - bodyValue;

      if (difference < 0) {
        difference *= asymmetryFactor;
      }

      const tolerance = tolerances[name] || 5.0;
      const normalizedError = Math.abs(difference) / tolerance;
      const weight = rowWeights[name] || 0;
      const penalty = Math.pow(normalizedError, 2) * weight;

      totalScore += penalty;

      details[name] = {
        bodyValue,
        garmentValue,
        difference: garmentValue - bodyValue,
        penalty
      };
    });

    scores.push({
      size: entry.size_name,
      score: totalScore,
      details
    });
  }

  return scores.sort((a, b) => a.score - b.score);
}

function applyBoundaryZone(
  sortedScores: SizeScore[],
  _fitMultiplier: number
): string {
  if (sortedScores.length === 0) return '';
  return sortedScores[0].size;
}

function calculateConfidence(
  bestScore: number,
  secondScore: number,
  elasticityLevel: ElasticityLevel
): ConfidenceResult {
  let baseConfidence = 100;

  if (bestScore < 1.0) {
    baseConfidence = 100;
  } else if (bestScore < 2.0) {
    baseConfidence = 70;
  } else {
    baseConfidence = 40;
  }

  const gap = secondScore - bestScore;
  const relativeGap = gap / Math.max(bestScore, 0.5);

  let dominanceBonus = 0;
  if (relativeGap > 0.5) {
    dominanceBonus = 20;
  } else if (relativeGap > 0.25) {
    dominanceBonus = 10;
  }

  const elasticityBonus: Record<ElasticityLevel, number> = {
    structured: -10,
    light: 0,
    flexible: 5,
    high: 10
  };

  const finalConfidence = Math.min(100, Math.max(0,
    baseConfidence + dominanceBonus + elasticityBonus[elasticityLevel]
  ));

  let level: 'HIGH' | 'MEDIUM' | 'LOW';
  if (finalConfidence >= 80) level = 'HIGH';
  else if (finalConfidence >= 60) level = 'MEDIUM';
  else level = 'LOW';

  return {
    level,
    percentage: finalConfidence,
    factors: {
      baseScore: baseConfidence,
      dominance: dominanceBonus,
      elasticity: elasticityBonus[elasticityLevel]
    }
  };
}

export function calculateIdealSize(
  height: number,
  weight: number,
  bodyTypeFactor: number,
  fitFactor: number,
  sizeChart: SizeChartEntry[],
  measurementNames?: string[],
  measurementWeights?: { [key: string]: number },
  rawMeasurements?: RawMeasurements | null,
  elasticityLevel: ElasticityLevel = 'light'
): {
  size: string;
  measurements: BodyModel;
  confidence?: ConfidenceResult;
  debug?: {
    scores: SizeScore[];
    bodyModel: BodyModel;
  };
} | null {
  if (!sizeChart || sizeChart.length === 0) {
    return null;
  }

  let measurements: string[];

  if (measurementNames && measurementNames.length >= 3) {
    measurements = measurementNames;
  } else if (sizeChart[0]?.measurement_labels && sizeChart[0].measurement_labels.length >= 3) {
    measurements = sizeChart[0].measurement_labels;
  } else {
    measurements = ['Busto', 'Cintura', 'Quadril'];
  }

  const weights = measurementWeights || {};
  measurements.forEach((name) => {
    if (weights[name] === undefined) {
      weights[name] = 1.0;
    }
  });

  const bodyModel = buildBodyModel(
    height,
    weight,
    bodyTypeFactor,
    rawMeasurements || null,
    measurements
  );

  const scores = calculateSizeScores(
    bodyModel,
    fitFactor,
    sizeChart,
    measurements,
    weights,
    elasticityLevel
  );

  if (scores.length === 0) {
    return null;
  }

  const recommendedSize = applyBoundaryZone(scores, fitFactor);

  const confidence = scores.length >= 2
    ? calculateConfidence(scores[0].score, scores[1].score, elasticityLevel)
    : { level: 'HIGH' as const, percentage: 100, factors: { baseScore: 100, dominance: 0, elasticity: 0 } };

  return {
    size: recommendedSize,
    measurements: bodyModel,
    confidence,
    debug: {
      scores,
      bodyModel
    }
  };
}
