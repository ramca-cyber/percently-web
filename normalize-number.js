// normalize-number.js
// Turn user-entered numeric strings into JS numbers accepting both "1,234.56" and "1.234,56"
export function normalizeNumberInput(raw) {
  if (raw === null || raw === undefined) return NaN;
  const s = String(raw).trim();
  if (s === '') return NaN;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  // Only treat comma as decimal when both separators exist and comma comes after the dot
  if (lastComma !== -1 && lastDot !== -1 && lastComma > lastDot) {
    const withoutDots = s.replace(/\./g, '');
    const normalized = withoutDots.replace(/,([^,]*)$/, '.$1');
    return Number(normalized);
  } else {
    // treat dot as decimal; remove commas (thousand separators)
    const normalized = s.replace(/,/g, '');
    return Number(normalized);
  }
}