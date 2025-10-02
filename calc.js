// calc.js — pure functions for percentage calculations
export function percentOf(x, y) {
  return (Number(x) / 100) * Number(y);
}
export function increaseBy(x, y) {
  return Number(y) + (Number(x) / 100) * Number(y);
}
export function decreaseBy(x, y) {
  return Number(y) - (Number(x) / 100) * Number(y);
}
export function percentDifference(x, y) {
  const a = Number(x), b = Number(y);
  if (a === 0 && b === 0) return 0;
  const denom = (Math.abs(a) + Math.abs(b)) / 2;
  if (denom === 0) throw new Error('Denominator is zero');
  return (Math.abs(a - b) / denom) * 100;
}
export function whatPercent(x, y) {
  if (Number(y) === 0) throw new Error('Divide by zero');
  return (Number(x) / Number(y)) * 100;
}