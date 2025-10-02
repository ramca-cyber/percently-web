// main.js — calculate only on button click, no connector/suffix logic, result message under result
import { normalizeNumberInput } from './normalize-number.js';
import * as calc from './calc.js';
import './a11y-radio-cards.js';

const xInput = document.getElementById('input-x');
const yInput = document.getElementById('input-y');
const resultInline = document.getElementById('result');
const resultMsg = document.getElementById('result-msg');
const calcBtn = document.getElementById('calculate');
const clearBtn = document.getElementById('clear');
const radios = Array.from(document.querySelectorAll('input[name="calc"]'));
const modeTitleEl = document.getElementById('calc-mode-title');
const modeSubEl = document.getElementById('calc-mode-sub');
const labelXText = document.getElementById('label-x-text');
const labelYText = document.getElementById('label-y-text');

// UI configuration per mode including captions
const MODE_UI = {
  'percent-of': {
    title: 'X of Y',
    sub: 'Enter values to compute.',
    captionX: 'Input X',
    captionY: 'Input Y'
  },
  'increase-by': {
    title: 'Increase Y by X',
    sub: 'Add X to Y.',
    captionX: 'Increase (X)',
    captionY: 'Value (Y)'
  },
  'decrease-by': {
    title: 'Decrease Y by X',
    sub: 'Subtract X from Y.',
    captionX: 'Decrease (X)',
    captionY: 'Value (Y)'
  },
  'percent-diff': {
    title: 'Percent difference',
    sub: 'Compare two values.',
    captionX: 'Value A',
    captionY: 'Value B'
  },
  'what-percent': {
    title: 'What percent is X of Y',
    sub: 'Find what percent X is of Y.',
    captionX: 'Part (X)',
    captionY: 'Whole (Y)'
  }
};

// formatting helpers
function isIntegerish(v) { return Math.abs(Math.round(v) - v) < 1e-12; }
function formatNumber(value, { maxDecimals = 2, minDecimals = 0 } = {}) {
  if (!isFinite(value)) return String(value);
  if (isIntegerish(value)) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(value));
  }
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: minDecimals, maximumFractionDigits: maxDecimals }).format(value);
}
function fullPrecisionString(v) {
  if (!isFinite(v)) return String(v);
  return Number(v).toPrecision(12).replace(/(?:\.0+|(?<=\.[0-9]*[1-9])0+)$/, '');
}

// calculate and return {ok,msg,out,display}
function calculate(type, xRaw, yRaw) {
  const x = normalizeNumberInput(xRaw);
  const y = normalizeNumberInput(yRaw);
  if (!(typeof x === 'number' && isFinite(x)) || !(typeof y === 'number' && isFinite(y))) {
    return { ok: false, msg: 'Please enter numeric values for both X and Y.' };
  }

  try {
    switch (type) {
      case 'percent-of': {
        const out = calc.percentOf(x, y);
        const display = formatNumber(out, { maxDecimals: 2 });
        const msg = `${formatNumber(x)}% of ${formatNumber(y)} is ${display}`;
        return { ok: true, out, msg, display };
      }
      case 'increase-by': {
        const out = calc.increaseBy(x, y);
        const display = formatNumber(out, { maxDecimals: 2 });
        const msg = `${formatNumber(y)} increased by ${formatNumber(x)}% is ${display}`;
        return { ok: true, out, msg, display };
      }
      case 'decrease-by': {
        const out = calc.decreaseBy(x, y);
        const display = formatNumber(out, { maxDecimals: 2 });
        const msg = `${formatNumber(y)} decreased by ${formatNumber(x)}% is ${display}`;
        return { ok: true, out, msg, display };
      }
      case 'percent-diff': {
        const out = calc.percentDifference(x, y);
        const display = formatNumber(out, { maxDecimals: 4 });
        const msg = `Percent difference between ${formatNumber(x)} and ${formatNumber(y)} is ${display}%`;
        return { ok: true, out, msg, display: display + '%' };
      }
      case 'what-percent': {
        const out = calc.whatPercent(x, y);
        const display = formatNumber(out, { maxDecimals: 2 });
        const msg = `${formatNumber(x)} is ${display}% of ${formatNumber(y)}`;
        return { ok: true, out, msg, display: display + '%' };
      }
      default:
        return { ok: false, msg: 'Unknown calculation selected.' };
    }
  } catch (err) {
    return { ok: false, msg: err.message || 'Calculation error' };
  }
}

// update UI for selected mode
function refreshUIForMode() {
  const mode = document.querySelector('input[name="calc"]:checked').value;
  const ui = MODE_UI[mode] || MODE_UI['percent-of'];
  modeTitleEl.textContent = ui.title;
  modeSubEl.textContent = ui.sub;
  labelXText.textContent = ui.captionX;
  labelYText.textContent = ui.captionY;
}

// show result only when called explicitly
function showInlineResult(res) {
  if (!res) return;
  if (!res.ok) {
    resultInline.textContent = '—';
    resultInline.title = '';
    resultMsg.textContent = res.msg;
    resultMsg.style.color = 'var(--danger)';
    resultInline.style.color = 'var(--danger)';
    return;
  }

  resultInline.textContent = res.display;
  resultInline.style.color = 'var(--accent)';
  const exact = (typeof res.out === 'number' && isFinite(res.out)) ? fullPrecisionString(res.out) : '';
  resultInline.title = res.msg + (exact ? ` — Exact: ${exact}` : '');
  resultMsg.textContent = res.msg;
  resultMsg.style.color = 'var(--muted)';
}

// Radios update UI only, no auto-calc
radios.forEach(r => r.addEventListener('change', () => { refreshUIForMode(); }));

// Trigger calculation on Enter key
[xInput, yInput].forEach(inp => {
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const type = document.querySelector('input[name="calc"]:checked').value;
      const res = calculate(type, xInput.value.trim(), yInput.value.trim());
      showInlineResult(res);
    }
  });
});

// Calculate button: explicit calculation
calcBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const type = document.querySelector('input[name="calc"]:checked').value;
  const res = calculate(type, xInput.value.trim(), yInput.value.trim());
  showInlineResult(res);
});

// Clear button
clearBtn.addEventListener('click', () => {
  xInput.value = '';
  yInput.value = '';
  resultInline.textContent = '';
  resultInline.removeAttribute('title');
  resultMsg.textContent = '';
  xInput.focus();
});

// initialize UI
refreshUIForMode();
