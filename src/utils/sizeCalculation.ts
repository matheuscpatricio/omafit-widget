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
    { bmi: 18.5, value: 78 },
    { bmi: 20, value: 82 },
    { bmi: 22, value: 86 },
    { bmi: 24, value: 90 },
    { bmi: 26, value: 94 },
    { bmi: 28, value: 98 },
    { bmi: 30, value: 102 },
    { bmi: 32, value: 106 }
  ],
  'Cintura': [
    { bmi: 18.5, value: 58 },
    { bmi: 20, value: 62 },
    { bmi: 22, value: 66 },
    { bmi: 24, value: 70 },
    { bmi: 26, value: 74 },
    { bmi: 28, value: 78 },
    { bmi: 30, value: 82 },
    { bmi: 32, value: 86 }
  ],
  'Quadril': [
    { bmi: 18.5, value: 84 },
    { bmi: 20, value: 88 },
    { bmi: 22, value: 92 },
    { bmi: 24, value: 96 },
    { bmi: 26, value: 100 },
    { bmi: 28, value: 104 },
    { bmi: 30, value: 108 },
    { bmi: 32, value: 112 }
  ],
  'Comprimento': [
    { bmi: 18.5, value: 65 },
    { bmi: 20, value: 67 },
    { bmi: 22, value: 69 },
    { bmi: 24, value: 71 },
    { bmi: 26, value: 73 },
    { bmi: 28, value: 75 },
    { bmi: 30, value: 77 },
    { bmi: 32, value: 79 }
  ],
  'Tornozelo': [
    { bmi: 18.5, value: 21 },
    { bmi: 20, value: 22 },
    { bmi: 22, value: 23 },
    { bmi: 24, value: 24 },
    { bmi: 26, value: 25 },
    { bmi: 28, value: 26 },
    { bmi: 30, value: 27 },
    { bmi: 32, value: 28 }
  ],
  'Ombro': [
    { bmi: 18.5, value: 38 },
    { bmi: 20, value: 40 },
    { bmi: 22, value: 42 },
    { bmi: 24, value: 44 },
    { bmi: 26, value: 46 },
    { bmi: 28, value: 48 },
    { bmi: 30, value: 50 },
    { bmi: 32, value: 52 }
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
    return entry.measurements[measurementKey] || 0;
  }

  if (key === 'Busto' && entry.bust !== undefined) return entry.bust;
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
