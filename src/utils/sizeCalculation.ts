interface SizeChartEntry {
  size_name: string;
  bust?: number;
  waist?: number;
  hips?: number;
  measurements?: { [key: string]: number };
  measurement_labels?: string[];
  order: number;
}

interface BodyMeasurements {
  [key: string]: number;
}

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

function getMeasurementValue(entry: SizeChartEntry, key: string, index: number): number {
  if (entry.measurements) {
    const measurementKey = `medida${index + 1}`;
    const value = entry.measurements[measurementKey];
    if (value !== undefined && value !== null) return value;

    // Tentar com nome da medida diretamente (em minúsculas)
    const directKey = key.toLowerCase();
    const directValue = entry.measurements[directKey];
    if (directValue !== undefined && directValue !== null) return directValue;

    // Tentar variações em inglês e português
    if (key === 'Busto' || key === 'Peito') {
      return entry.measurements.bust || entry.measurements.chest || entry.measurements.busto || entry.measurements.peito || 0;
    }
    if (key === 'Cintura' || key === 'Waist') {
      return entry.measurements.waist || entry.measurements.cintura || 0;
    }
    if (key === 'Quadril' || key === 'Hip') {
      return entry.measurements.hips || entry.measurements.hip || entry.measurements.quadril || 0;
    }
    if (key === 'Comprimento' || key === 'Length') {
      return entry.measurements.comprimento || entry.measurements.length || 0;
    }
  }

  if ((key === 'Busto' || key === 'Peito') && entry.bust !== undefined) return entry.bust;
  if (key === 'Cintura' && entry.waist !== undefined) return entry.waist;
  if (key === 'Quadril' && entry.hips !== undefined) return entry.hips;

  return 0;
}

export function calculateIdealSize(
  height: number,
  weight: number,
  bodyTypeFactor: number,
  fitFactor: number,
  sizeChart: SizeChartEntry[],
  measurementNames?: string[]
): { size: string; measurements: BodyMeasurements } | null {
  if (!sizeChart || sizeChart.length === 0) {
    return null;
  }

  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  const adjustedBMI = bmi * bodyTypeFactor;
  const finalBMI = adjustedBMI * fitFactor;

  let measurements: string[];

  if (measurementNames && measurementNames.length === 3) {
    measurements = measurementNames;
  } else if (sizeChart[0]?.measurement_labels && sizeChart[0].measurement_labels.length === 3) {
    measurements = sizeChart[0].measurement_labels;
  } else {
    measurements = ['Busto', 'Cintura', 'Quadril'];
  }

  const estimatedMeasurements: BodyMeasurements = {};
  measurements.forEach((name) => {
    estimatedMeasurements[name] = interpolateMeasurement(finalBMI, name);
  });

  let bestMatch: { size: string; difference: number } | null = null;

  for (const entry of sizeChart) {
    let totalDiff = 0;

    measurements.forEach((name, index) => {
      const entryValue = getMeasurementValue(entry, name, index);
      const estimatedValue = estimatedMeasurements[name];
      totalDiff += Math.abs(entryValue - estimatedValue);
    });

    const averageDifference = totalDiff / 3;

    if (!bestMatch || averageDifference < bestMatch.difference) {
      bestMatch = {
        size: entry.size_name,
        difference: averageDifference
      };
    }
  }

  if (!bestMatch) {
    return null;
  }

  return {
    size: bestMatch.size,
    measurements: estimatedMeasurements
  };
}
