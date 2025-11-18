interface SizeChartEntry {
  size_name: string;
  bust: number;
  waist: number;
  hips: number;
  order: number;
}

interface BodyMeasurements {
  bust: number;
  waist: number;
  hips: number;
}

const BMI_REFERENCE_TABLE = [
  { bmi: 18.5, bust: 78, waist: 58, hips: 84 },
  { bmi: 20, bust: 82, waist: 62, hips: 88 },
  { bmi: 22, bust: 86, waist: 66, hips: 92 },
  { bmi: 24, bust: 90, waist: 70, hips: 96 },
  { bmi: 26, bust: 94, waist: 74, hips: 100 },
  { bmi: 28, bust: 98, waist: 78, hips: 104 },
  { bmi: 30, bust: 102, waist: 82, hips: 108 },
  { bmi: 32, bust: 106, waist: 86, hips: 112 }
];

function interpolateMeasurements(bmi: number): BodyMeasurements {
  if (bmi <= BMI_REFERENCE_TABLE[0].bmi) {
    return {
      bust: BMI_REFERENCE_TABLE[0].bust,
      waist: BMI_REFERENCE_TABLE[0].waist,
      hips: BMI_REFERENCE_TABLE[0].hips
    };
  }

  const lastEntry = BMI_REFERENCE_TABLE[BMI_REFERENCE_TABLE.length - 1];
  if (bmi >= lastEntry.bmi) {
    return {
      bust: lastEntry.bust,
      waist: lastEntry.waist,
      hips: lastEntry.hips
    };
  }

  for (let i = 0; i < BMI_REFERENCE_TABLE.length - 1; i++) {
    const lower = BMI_REFERENCE_TABLE[i];
    const upper = BMI_REFERENCE_TABLE[i + 1];

    if (bmi >= lower.bmi && bmi <= upper.bmi) {
      const ratio = (bmi - lower.bmi) / (upper.bmi - lower.bmi);

      return {
        bust: lower.bust + (upper.bust - lower.bust) * ratio,
        waist: lower.waist + (upper.waist - lower.waist) * ratio,
        hips: lower.hips + (upper.hips - lower.hips) * ratio
      };
    }
  }

  return {
    bust: BMI_REFERENCE_TABLE[0].bust,
    waist: BMI_REFERENCE_TABLE[0].waist,
    hips: BMI_REFERENCE_TABLE[0].hips
  };
}

export function calculateIdealSize(
  height: number,
  weight: number,
  bodyTypeFactor: number,
  fitFactor: number,
  sizeChart: SizeChartEntry[]
): { size: string; measurements: BodyMeasurements } | null {
  if (!sizeChart || sizeChart.length === 0) {
    return null;
  }

  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);

  const adjustedBMI = bmi * bodyTypeFactor;

  const finalBMI = adjustedBMI * fitFactor;

  const estimatedMeasurements = interpolateMeasurements(finalBMI);

  let bestMatch: { size: string; difference: number } | null = null;

  for (const entry of sizeChart) {
    const bustDiff = Math.abs(entry.bust - estimatedMeasurements.bust);
    const waistDiff = Math.abs(entry.waist - estimatedMeasurements.waist);
    const hipsDiff = Math.abs(entry.hips - estimatedMeasurements.hips);

    const averageDifference = (bustDiff + waistDiff + hipsDiff) / 3;

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
