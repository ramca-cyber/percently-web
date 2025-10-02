// main.js — submit-only calculations with structured history
import { normalizeNumberInput } from './normalize-number.js';
import * as calc from './calc.js';

const HISTORY_KEY = 'percently_history_v3';
const MAX_HISTORY = 30;
const INPUTS_KEY = 'percently_inputs_v1'; // session persistence for inputs across panels

let currentMode = 'of'; // 'of', 'inc', 'dec', 'what', 'diff'

// Tab buttons and panels
const tabs = {
  of: document.getElementById('tab-of'),
  inc: document.getElementById('tab-inc'),
  dec: document.getElementById('tab-dec'),
  what: document.getElementById('tab-what'),
  diff: document.getElementById('tab-diff')
};

const panels = {
  of: document.getElementById('panel-of'),
  inc: document.getElementById('panel-inc'),
  dec: document.getElementById('panel-dec'),
  what: document.getElementById('panel-what'),
  diff: document.getElementById('panel-diff')
};

// Formatting helpers
function isIntegerish(v) { return Math.abs(Math.round(v) - v) < 1e-12; }
function formatNumber(value, { maxDecimals = 2, minDecimals = 0 } = {}) {
  if (!isFinite(value)) return String(value);
  if (isIntegerish(value)) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(value));
  }
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: minDecimals, maximumFractionDigits: maxDecimals }).format(value);
}

// Read inputs for a specific mode
function readInputsFor(mode) {
  if (mode === 'of') {
    const xEl = $('of-x');
    const yEl = $('of-y');
    return { x: xEl ? xEl.value.trim() : '', y: yEl ? yEl.value.trim() : '' };
  } else if (mode === 'inc') {
    const xEl = $('inc-x');
    const yEl = $('inc-y');
    return { x: xEl ? xEl.value.trim() : '', y: yEl ? yEl.value.trim() : '' };
  } else if (mode === 'dec') {
    const xEl = $('dec-x');
    const yEl = $('dec-y');
    return { x: xEl ? xEl.value.trim() : '', y: yEl ? yEl.value.trim() : '' };
  } else if (mode === 'what') {
    const aEl = $('what-a');
    const bEl = $('what-b');
    return { a: aEl ? aEl.value.trim() : '', b: bEl ? bEl.value.trim() : '' };
  } else if (mode === 'diff') {
    const oldEl = $('diff-old');
    const newEl = $('diff-new');
    return { old: oldEl ? oldEl.value.trim() : '', new: newEl ? newEl.value.trim() : '' };
  }
  return {};
}

// Helper to get element by id
function $(id) { return document.getElementById(id); }

// Persist all panels' inputs to sessionStorage
function saveAllInputs() {
  try {
    const data = {
      of: readInputsFor('of'),
      inc: readInputsFor('inc'),
      dec: readInputsFor('dec'),
      what: readInputsFor('what'),
      diff: readInputsFor('diff')
    };
    sessionStorage.setItem(INPUTS_KEY, JSON.stringify(data));
  } catch (err) {
    // fail silently on storage errors
  }
}

// Load inputs from sessionStorage into DOM (does not override URL-loaded values if called after loadFromURL)
function loadAllInputs() {
  try {
    const raw = sessionStorage.getItem(INPUTS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data) return;

    if (data.of) {
      if (typeof data.of.x === 'string' && $('of-x')) $('of-x').value = data.of.x;
      if (typeof data.of.y === 'string' && $('of-y')) $('of-y').value = data.of.y;
    }
    if (data.inc) {
      if (typeof data.inc.x === 'string' && $('inc-x')) $('inc-x').value = data.inc.x;
      if (typeof data.inc.y === 'string' && $('inc-y')) $('inc-y').value = data.inc.y;
    }
    if (data.dec) {
      if (typeof data.dec.x === 'string' && $('dec-x')) $('dec-x').value = data.dec.x;
      if (typeof data.dec.y === 'string' && $('dec-y')) $('dec-y').value = data.dec.y;
    }
    if (data.what) {
      if (typeof data.what.a === 'string' && $('what-a')) $('what-a').value = data.what.a;
      if (typeof data.what.b === 'string' && $('what-b')) $('what-b').value = data.what.b;
    }
    if (data.diff) {
      if (typeof data.diff.old === 'string' && $('diff-old')) $('diff-old').value = data.diff.old;
      if (typeof data.diff.new === 'string' && $('diff-new')) $('diff-new').value = data.diff.new;
    }
  } catch (err) {
    // ignore parse errors
  }
}

// Compute result for current mode
function computeNow(mode) {
  let r = NaN, htmlNumeric = '', htmlText = '', text = '';
  const N = (n) => formatNumber(n, { maxDecimals: 2 });
  const N4 = (n) => formatNumber(n, { maxDecimals: 4 });
  const num = (s) => normalizeNumberInput(s);

  if (mode === 'of') {
    const x = num($('of-x').value);
    const y = num($('of-y').value);
    if (!isNaN(x) && !isNaN(y)) {
      r = calc.percentOf(x, y);
      // Numeric value (big display)
      htmlNumeric = `<strong>${N(r)}</strong>`;
      // Explanatory text for tooltip / result-msg
      htmlText = `${N(x)}% of ${N(y)} = ${N(r)}`;
      text = `${x}% of ${y} = ${r}`;
    }
  } else if (mode === 'inc') {
    const x = num($('inc-x').value);
    const y = num($('inc-y').value);
    if (!isNaN(x) && !isNaN(y)) {
      r = calc.increaseBy(x, y);
      htmlNumeric = `<strong>${N(r)}</strong>`;
      htmlText = `${N(y)} increased by ${N(x)}% = ${N(r)}`;
      text = `${y} increased by ${x}% = ${r}`;
    }
  } else if (mode === 'dec') {
    const x = num($('dec-x').value);
    const y = num($('dec-y').value);
    if (!isNaN(x) && !isNaN(y)) {
      r = calc.decreaseBy(x, y);
      htmlNumeric = `<strong>${N(r)}</strong>`;
      htmlText = `${N(y)} decreased by ${N(x)}% = ${N(r)}`;
      text = `${y} decreased by ${x}% = ${r}`;
    }
  } else if (mode === 'what') {
    const a = num($('what-a').value);
    const b = num($('what-b').value);
    if (!isNaN(a) && !isNaN(b)) {
      try {
        r = calc.whatPercent(a, b);
        htmlNumeric = `<strong>${N(r)}%</strong>`;
        htmlText = `${N(a)} is ${N(r)}% of ${N(b)}`;
        text = `${a} is ${r}% of ${b}`;
      } catch (err) {
        htmlNumeric = `<span style="color:var(--danger);">${err.message}</span>`;
        htmlText = err.message;
        text = err.message;
      }
    }
  } else if (mode === 'diff') {
    const oldVal = num($('diff-old').value);
    const newVal = num($('diff-new').value);
    if (!isNaN(oldVal) && !isNaN(newVal)) {
      if (oldVal === 0) {
        htmlNumeric = `<span style="color:var(--danger);">Cannot calculate</span>`;
        htmlText = 'Cannot calculate: Old value is zero';
        text = 'Cannot calculate: Old value is zero';
      } else {
        r = ((newVal - oldVal) / oldVal) * 100;
        const lbl = r > 0 ? 'increase' : (r < 0 ? 'decrease' : 'no change');
        htmlNumeric = `<strong>${N4(r)}%</strong>`;
        htmlText = `${N(oldVal)} → ${N(newVal)} = ${N4(r)}% ${lbl}`;
        text = `${oldVal} → ${newVal} = ${r}% ${lbl}`;
      }
    }
  }

  return { r, htmlNumeric, htmlText, text };
}

// Clear result container for a panel
function clearResult(panelEl) {
  const resultContainer = panelEl.querySelector('.result-container');
  if (resultContainer) {
    resultContainer.style.display = 'none';
    const resultInline = resultContainer.querySelector('.result-inline');
    const resultMsg = resultContainer.querySelector('.result-msg');
    if (resultInline) resultInline.innerHTML = '';
    if (resultMsg) resultMsg.textContent = '';
  }
}

// Show result in a panel
function showResult(panelEl, htmlNumeric, htmlText) {
  const rc = panelEl.querySelector('.result-container');
  if (!rc) return;
  const inline = rc.querySelector('.result-inline');
  const msg = rc.querySelector('.result-msg');

  // Reveal container
  rc.style.display = 'block';

  // Put only the numeric HTML into the large display
  if (inline) {
    inline.innerHTML = htmlNumeric || '';
  }

  // Put the explanatory text into the smaller message area (tooltip area)
  if (msg) {
    msg.innerHTML = htmlText || '';
  }

  // aria-live areas on the DOM will announce as appropriate
}

// Tab selection
function selectTab(mode, skipUrlUpdate = false) {
  currentMode = mode;
  
  // Update tab aria-selected
  Object.keys(tabs).forEach(m => {
    tabs[m].setAttribute('aria-selected', m === mode ? 'true' : 'false');
    panels[m].style.display = m === mode ? 'block' : 'none';
  });

  // Update URL
  if (!skipUrlUpdate) {
    updateURL();
  }

  // Focus first input
  focusFirstInput();
}

// Focus first input in current panel
function focusFirstInput() {
  const panel = panels[currentMode];
  const firstInput = panel.querySelector('input[type="text"]');
  if (firstInput) firstInput.focus();
}

// Update URL with current mode and inputs
function updateURL() {
  const params = new URLSearchParams();
  params.set('mode', currentMode);
  
  const inputs = readInputsFor(currentMode);
  Object.keys(inputs).forEach(key => {
    if (inputs[key]) params.set(key, inputs[key]);
  });

  const newUrl = window.location.pathname + '?' + params.toString();
  window.history.replaceState({}, '', newUrl);
}

// Load from URL
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  
  if (mode && panels[mode]) {
    selectTab(mode, true);
    
    // Hydrate inputs but don't compute (URL overrides stored values)
    if (mode === 'of') {
      if (params.has('x')) $('of-x').value = params.get('x');
      if (params.has('y')) $('of-y').value = params.get('y');
    } else if (mode === 'inc') {
      if (params.has('x')) $('inc-x').value = params.get('x');
      if (params.has('y')) $('inc-y').value = params.get('y');
    } else if (mode === 'dec') {
      if (params.has('x')) $('dec-x').value = params.get('x');
      if (params.has('y')) $('dec-y').value = params.get('y');
    } else if (mode === 'what') {
      if (params.has('a')) $('what-a').value = params.get('a');
      if (params.has('b')) $('what-b').value = params.get('b');
    } else if (mode === 'diff') {
      if (params.has('old')) $('diff-old').value = params.get('old');
      if (params.has('new')) $('diff-new').value = params.get('new');
    }

    // persist the URL-provided values into session storage
    saveAllInputs();
  }
}

// History management
function loadHistory() {
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveHistory(arr) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, MAX_HISTORY)));
}

function addHistoryEntry(entry) {
  const arr = loadHistory();
  // Deduplicate immediate repeats
  if (arr.length && JSON.stringify(arr[0]) === JSON.stringify(entry)) return;
  arr.unshift(entry);
  saveHistory(arr);
  renderHistory();
}

function renderHistory() {
  const list = $('history-list');
  const arr = loadHistory();
  
  if (arr.length === 0) {
    list.innerHTML = '<p style="color:var(--muted); text-align:center;">No history yet.</p>';
    return;
  }

  list.innerHTML = arr.map((item, idx) => {
    return `
      <div style="display:flex; gap:0.5rem; align-items:center; padding:0.5rem; background:var(--bg-secondary, #f5f5f5); border-radius:0.25rem;">
        <span style="flex:1; font-size:0.875rem;">${escapeHtml(item.text)}</span>
        <button class="bar-btn secondary" data-action="load" data-idx="${idx}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">Load</button>
        <button class="bar-btn primary" data-action="copy" data-idx="${idx}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">Copy</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// History click handler (event delegation)
$('history-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  
  const idx = +btn.dataset.idx;
  const arr = loadHistory();
  const item = arr[idx];
  if (!item) return;

  if (btn.dataset.action === 'copy') {
    try {
      await navigator.clipboard.writeText(item.text);
    } catch {
      alert(item.text);
    }
  } else if (btn.dataset.action === 'load') {
    selectTab(item.mode, false);
    
    // Hydrate inputs based on mode
    if (item.mode === 'of') {
      $('of-x').value = item.params.x || '';
      $('of-y').value = item.params.y || '';
    } else if (item.mode === 'inc') {
      $('inc-x').value = item.params.x || '';
      $('inc-y').value = item.params.y || '';
    } else if (item.mode === 'dec') {
      $('dec-x').value = item.params.x || '';
      $('dec-y').value = item.params.y || '';
    } else if (item.mode === 'what') {
      $('what-a').value = item.params.a || '';
      $('what-b').value = item.params.b || '';
    } else if (item.mode === 'diff') {
      $('diff-old').value = item.params.old || '';
      $('diff-new').value = item.params.new || '';
    }
    
    // persist loaded history values so they are retained when switching panels
    saveAllInputs();

    clearResult(panels[item.mode]);
    focusFirstInput();
  }
});

// Clear history button
$('clear-history').addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

// Setup tab buttons
Object.keys(tabs).forEach(mode => {
  tabs[mode].addEventListener('click', () => selectTab(mode));
});

// Setup forms
Object.keys(panels).forEach(mode => {
  const panel = panels[mode];
  const form = panel.querySelector('form');
  
  // Submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = computeNow(mode);
    
    if (!isNaN(result.r)) {
      // Show numeric result and explanatory text separately
      showResult(panel, result.htmlNumeric, result.htmlText);
      
      // Add to history
      const inputs = readInputsFor(mode);
      const entry = {
        mode,
        params: inputs,
        text: result.text,
        value: result.r
      };
      addHistoryEntry(entry);
    } else if (result.htmlText) {
      // Show error (use htmlText as message and htmlNumeric for inline if provided)
      showResult(panel, result.htmlNumeric, result.htmlText);
    }
  });

  // Clear button
  const clearBtn = panel.querySelector('.clear-btn');
  clearBtn.addEventListener('click', () => {
    const inputs = panel.querySelectorAll('input[type="text"]');
    inputs.forEach(inp => inp.value = '');
    clearResult(panel);
    focusFirstInput();
    // persist cleared state
    saveAllInputs();
    updateURL();
  });

  // Input change handlers - clear result, update URL and persist all inputs
  const inputs = panel.querySelectorAll('input[type="text"]');
  inputs.forEach(inp => {
    inp.addEventListener('input', () => {
      clearResult(panel);
      updateURL();
      saveAllInputs();
    });

    // Enter key submits
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
      }
    });
  });
});

// Initialize: load stored inputs, then allow URL to override, then render history
loadAllInputs();
loadFromURL();
renderHistory();
