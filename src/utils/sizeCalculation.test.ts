import { describe, expect, it } from 'vitest';
import { calculateIdealSize } from './sizeCalculation';

const chart = [
  { size_name: 'S', bust: 80, waist: 64, hips: 88, order: 0 },
  { size_name: 'M', bust: 94, waist: 74, hips: 100, order: 1 },
  { size_name: 'L', bust: 108, waist: 88, hips: 114, order: 2 },
];

describe('calculateIdealSize', () => {
  it('returns null when the chart is empty', () => {
    expect(calculateIdealSize(170, 70, 1, 1, [])).toBeNull();
  });

  it('returns the only available size', () => {
    const result = calculateIdealSize(170, 70, 1, 1, [chart[1]]);
    expect(result?.size).toBe('M');
    expect(result?.measurements.Busto).toBeGreaterThan(0);
  });

  it('picks the chart row closest to detected body measurements', () => {
    const result = calculateIdealSize(
      170,
      70,
      1,
      1,
      chart,
      ['Busto', 'Cintura', 'Quadril'],
      undefined,
      {
        chestCircumference: 94,
        waistCircumference: 74,
        hipCircumference: 100,
        confidence: 0.95,
      }
    );
    expect(result?.size).toBe('M');
    expect(result?.confidence?.level).toBeDefined();
  });
});
