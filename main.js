// Percently - input wiring and calculation logic (unchanged behavior)
(function () {
  const form = document.getElementById('calc-form');
  const xInput = document.getElementById('input-x');
  const yInput = document.getElementById('input-y');
  const resultEl = document.getElementById('result');
  const clearBtn = document.getElementById('clear');
  const radios = Array.from(document.querySelectorAll('input[name="calc"]'));

  function getSelected() {
    return document.querySelector('input[name="calc"]:checked').value;
  }

  function formatNumber(v, decimals = 2) {
    if (!isFinite(v)) return String(v);
    if (Math.abs(Math.round(v) - v) < 1e-12) return String(Math.round(v));
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals });
  }

  function showResult(text, isError) {
    resultEl.textContent = text;
    resultEl.style.color = isError ? 'var(--danger)' : 'var(--accent)';
  }

  function validateVal(v) {
    return !(v === '' || v === null || Number.isNaN(Number(v)));
  }

  function calculate(type, xRaw, yRaw) {
    const x = Number(xRaw);
    const y = Number(yRaw);

    if (!validateVal(xRaw) || !validateVal(yRaw)) {
      return { ok: false, msg: 'Please enter valid numbers for X and Y.' };
    }

    switch (type) {
      case 'percent-of': {
        const out = (x / 100) * y;
        return { ok: true, msg: `${formatNumber(x)}% of ${formatNumber(y)} is ${formatNumber(out)}` };
      }
      case 'increase-by': {
        const out = y + (x / 100) * y;
        return { ok: true, msg: `${formatNumber(y)} increased by ${formatNumber(x)}% is ${formatNumber(out)}` };
      }
      case 'decrease-by': {
        const out = y - (x / 100) * y;
        return { ok: true, msg: `${formatNumber(y)} decreased by ${formatNumber(x)}% is ${formatNumber(out)}` };
      }
      case 'percent-diff': {
        if (x === 0 && y === 0) return { ok: true, msg: 'Both values are zero; percent difference is 0%.' };
        const denom = (Math.abs(x) + Math.abs(y)) / 2;
        if (denom === 0) return { ok: false, msg: 'Percent difference is undefined when both |X| + |Y| equals zero.' };
        const out = (Math.abs(x - y) / denom) * 100;
        return { ok: true, msg: `Percent difference between ${formatNumber(x)} and ${formatNumber(y)} is ${formatNumber(out, 4)}%` };
      }
      case 'what-percent': {
        if (y === 0) return { ok: false, msg: 'Cannot divide by zero.' };
        const out = (x / y) * 100;
        return { ok: true, msg: `${formatNumber(x)} is ${formatNumber(out)}% of ${formatNumber(y)}` };
      }
      default:
        return { ok: false, msg: 'Unknown calculation selected.' };
    }
  }

  function refreshLabels() {
    const type = getSelected();
    const labelX = document.querySelector('label[for="input-x"]');
    const labelY = document.querySelector('label[for="input-y"]');

    switch (type) {
      case 'percent-of':
        labelX.textContent = 'X (percent)';
        labelY.textContent = 'Y (value)';
        xInput.placeholder = 'e.g. 15';
        yInput.placeholder = 'e.g. 200';
        break;
      case 'increase-by':
      case 'decrease-by':
        labelX.textContent = 'X (percent)';
        labelY.textContent = 'Y (original value)';
        xInput.placeholder = 'e.g. 10';
        yInput.placeholder = 'e.g. 250';
        break;
      case 'percent-diff':
        labelX.textContent = 'X (value)';
        labelY.textContent = 'Y (value)';
        xInput.placeholder = 'e.g. 120';
        yInput.placeholder = 'e.g. 100';
        break;
      case 'what-percent':
        labelX.textContent = 'X (part)';
        labelY.textContent = 'Y (whole)';
        xInput.placeholder = 'e.g. 25';
        yInput.placeholder = 'e.g. 200';
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

  refreshLabels();
})();