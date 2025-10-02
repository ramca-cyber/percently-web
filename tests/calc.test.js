import { describe, it, expect } from 'vitest';
import { percentOf, increaseBy, decreaseBy, percentDifference, whatPercent } from '../calc.js';

describe('calc functions', () => {
  it('percentOf works', () => {
    expect(percentOf(15, 200)).toBeCloseTo(30);
  });

  it('increaseBy works', () => {
    expect(increaseBy(10, 200)).toBeCloseTo(220);
  });

  it('decreaseBy works', () => {
    expect(decreaseBy(10, 200)).toBeCloseTo(180);
  });

  it('percentDifference works', () => {
    expect(percentDifference(120, 100)).toBeCloseTo(18.1818, 3);
  });

  it('whatPercent works', () => {
    expect(whatPercent(25, 200)).toBeCloseTo(12.5);
  });
});