// main.js — wires UI, imports normalization + calc functions, updates UI
import { normalizeNumberInput } from './normalize-number.js';
import * as calc from './calc.js';
import './a11y-radio-cards.js';

const form = document.getElementById('calc-form');
const xInput = document.getElementById('input-x');
const yInput = document.getElementById('input-y');
const resultEl = document.getElementById('result');
const clearBtn = document.getElementById('clear');
const radios = Array.from(document.querySelectorAll('input[name="calc"]'));
const helpX = document.getElementById('help-x');
const helpY = document.getElementById('help-y');

function getSelected() {
  return document.querySelector('input[name="calc"]:checked').value;
}

function formatNumber(v, decimals = 2) {
  if (!isFinite(v)) return String(v);
  if (Math.abs(Math.round(v) - v) < 1e-12) return String(Math.round(v));
  return Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals });
}

function showResult(text, isError = false) {
  resultEl.textContent = text;
  resultEl.style.color = isError ? 'var(--danger)' : 'var(--accent)';
}

function validateVal(n) {
  return typeof n === 'number' && !Number.isNaN(n) && Number.isFinite(n);
}

function calculate(type, xRaw, yRaw) {
  const x = normalizeNumberInput(xRaw);
  const y = normalizeNumberInput(yRaw);

  if (!validateVal(x) || !validateVal(y)) {
    return { ok: false, msg: 'Please enter numeric values for both X and Y.' };
  }

  try {
    switch (type) {
      case 'percent-of': {
        const out = calc.percentOf(x, y);
        return { ok: true, msg: `${formatNumber(x)}% of ${formatNumber(y)} is ${formatNumber(out)}` };
      }
      case 'increase-by': {
        const out = calc.increaseBy(x, y);
        return { ok: true, msg: `${formatNumber(y)} increased by ${formatNumber(x)}% is ${formatNumber(out)}` };
      }
      case 'decrease-by': {
        const out = calc.decreaseBy(x, y);
        return { ok: true, msg: `${formatNumber(y)} decreased by ${formatNumber(x)}% is ${formatNumber(out)}` };
      }
      case 'percent-diff': {
        const out = calc.percentDifference(x, y);
        return { ok: true, msg: `Percent difference between ${formatNumber(x)} and ${formatNumber(y)} is ${formatNumber(out, 4)}%` };
      }
      case 'what-percent': {
        const out = calc.whatPercent(x, y);
        return { ok: true, msg: `${formatNumber(x)} is ${formatNumber(out)}% of ${formatNumber(y)}` };
      }
      default:
        return { ok: false, msg: 'Unknown calculation selected.' };
    }
  } catch (err) {
    return { ok: false, msg: err.message || 'Calculation error' };
  }
}

function refreshLabels() {
  const type = getSelected();
  const labelX = document.getElementById('label-x');
  const labelY = document.getElementById('label-y');

  helpX.textContent = '';
  helpY.textContent = '';

  switch (type) {
    case 'percent-of':
      labelX.textContent = 'X (percent)';
      labelY.textContent = 'Y (value)';
      xInput.placeholder = 'e.g. 15';
      yInput.placeholder = 'e.g. 200';
      helpX.textContent = 'Enter percent (e.g. 15)';
      helpY.textContent = 'Enter value to apply percent to';
      break;
    case 'increase-by':
      labelX.textContent = 'X (percent)';
      labelY.textContent = 'Y (original value)';
      xInput.placeholder = 'e.g. 10';
      yInput.placeholder = 'e.g. 250';
      helpX.textContent = 'Enter percent to increase by';
      helpY.textContent = 'Original value';
      break;
    case 'decrease-by':
      labelX.textContent = 'X (percent)';
      labelY.textContent = 'Y (original value)';
      xInput.placeholder = 'e.g. 10';
      yInput.placeholder = 'e.g. 250';
      helpX.textContent = 'Enter percent to decrease by';
      helpY.textContent = 'Original value';
      break;
    case 'percent-diff':
      labelX.textContent = 'X (value)';
      labelY.textContent = 'Y (value)';
      xInput.placeholder = 'e.g. 120';
      yInput.placeholder = 'e.g. 100';
      helpX.textContent = 'First value';
      helpY.textContent = 'Second value';
      break;
    case 'what-percent':
      labelX.textContent = 'X (part)';
      labelY.textContent = 'Y (whole)';
      xInput.placeholder = 'e.g. 25';
      yInput.placeholder = 'e.g. 200';
      helpX.textContent = 'Part value';
      helpY.textContent = 'Whole value';
      break;
    default:
      labelX.textContent = 'X';
      labelY.textContent = 'Y';
  }
}

radios.forEach(r => r.addEventListener('change', () => {
  refreshLabels();
  xInput.focus();
}));

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const type = getSelected();
  const xVal = xInput.value.trim();
  const yVal = yInput.value.trim();
  const res = calculate(type, xVal, yVal);
  showResult(res.msg, !res.ok);
});

clearBtn.addEventListener('click', () => {
  xInput.value = '';
  yInput.value = '';
  resultEl.textContent = '';
  xInput.focus();
});

[xInput, yInput].forEach(inp => {
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.requestSubmit();
    }
  });
});

// initialize
refreshLabels();