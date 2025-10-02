// main.js — submit-only calculations with structured history
import { normalizeNumberInput } from './normalize-number.js';
import * as calc from './calc.js';

const HISTORY_KEY = 'percently_history_v3';
const MAX_HISTORY = 30;
const INPUTS_KEY = 'percently_inputs_v1'; // session persistence for inputs across panels

let currentMode = 'of'; // 'of', 'inc', 'dec', 'what', 'diff'
let lastComputedEntry = null; // store the previous calculation; history adds this, not the current

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

// --- Syncing strategy ---
const firstGroup = ['of-x', 'inc-x', 'dec-x', 'what-a', 'diff-old'];
const secondGroup = ['of-y', 'inc-y', 'dec-y', 'what-b', 'diff-new'];
let isSyncing = false; // prevent recursive updates

function isInGroup(id, group) {
  return group.indexOf(id) !== -1;
}

function syncInputFrom(changedId, value) {
  if (isSyncing) return;
  isSyncing = true;
  try {
    if (isInGroup(changedId, firstGroup)) {
      firstGroup.forEach(id => {
        const el = $(id);
        if (el && id !== changedId) el.value = value;
      });
    } else if (isInGroup(changedId, secondGroup)) {
      secondGroup.forEach(id => {
        const el = $(id);
        if (el && id !== changedId) el.value = value;
      });
    }
  } finally {
    isSyncing = false;
  }
}

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

// Load inputs from sessionStorage into DOM (does not override URL-loaded values if called before loadFromURL)
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

// showToast: use centralized CSS (style.css) rather than injecting styles
function showToast(msg, duration = 3000) {
  const t = document.createElement('div');
  t.className = 'percently-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  // trigger transition
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    t.addEventListener('transitionend', () => t.remove(), { once: true });
  }, duration);
}

// Small inline SVG for copy/link icon
const LINK_ICON_SVG = `<svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle; margin-left:6px; fill:none; stroke:currentColor; stroke-width:2">` +
  `<rect x="9" y="9" width="10" height="10" rx="2"></rect>` +
  `<path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path>` +
`</svg>`;

// Generic copy-to-clipboard with fallback; returns Promise<boolean>
function copyTextToClipboard(text) {
  return new Promise((resolve) => {
    if (!text) return resolve(false);
    // primary: Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => resolve(true)).catch(() => {
        // fallback to execCommand
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand && document.execCommand('copy');
          ta.remove();
          resolve(!!ok);
        } catch {
          resolve(false);
        }
      });
      return;
    }

    // older fallback
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      resolve(!!ok);
    } catch {
      resolve(false);
    }
  });
}

// Shared inline copy feedback and helper (announces via scoped aria-live)
async function copyAndFlash(el, text, okMsg = 'Copied', failMsg = 'Copy failed', duration = 1400) {
  if (!el || !text) return false;
  const ok = await copyTextToClipboard(text);

  // Clear any previous timeout
  if (el._copyTimeout) { clearTimeout(el._copyTimeout); el._copyTimeout = null; }
  el.classList.remove('copied', 'copy-failed');
  if (ok) el.classList.add('copied'); else el.classList.add('copy-failed');

  // Announce for assistive tech using a hidden aria-live element scoped to the nearest result-container
  const container = el.closest('.result-container');
  if (container) {
    let live = container.querySelector('.copy-sr-live');
    if (!live) {
      live = document.createElement('div');
      live.className = 'sr-only copy-sr-live';
      live.setAttribute('aria-live', 'polite');
      container.appendChild(live);
    }
    live.textContent = ok ? okMsg : failMsg;
  } else {
    // fallback global sr-live
    let sr = document.getElementById('percently-sr-live');
    if (!sr) {
      sr = document.createElement('div');
      sr.id = 'percently-sr-live';
      sr.className = 'sr-only';
      sr.setAttribute('aria-live', 'polite');
      document.body.appendChild(sr);
    }
    sr.textContent = ok ? okMsg : failMsg;
  }

  el._copyTimeout = setTimeout(() => {
    el.classList.remove('copied', 'copy-failed');
    if (container) {
      const live = container.querySelector('.copy-sr-live');
      if (live) live.textContent = '';
    } else {
      const sr = document.getElementById('percently-sr-live');
      if (sr) sr.textContent = '';
    }
    el._copyTimeout = null;
  }, duration);

  return ok;
}

// Make an element a keyboard-accessible copy target that uses copyAndFlash
function makeCopyTarget(el, getText, { okMsg = 'Copied', failMsg = 'Copy failed' } = {}) {
  if (!el) return;
  // If not a native button, make focusable
  if (el.tagName.toLowerCase() !== 'button' && !el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '0');
  }
  if (!el.hasAttribute('role')) el.setAttribute('role', 'button');

  el.addEventListener('click', async (e) => {
    e.preventDefault();
    const text = typeof getText === 'function' ? getText() : getText;
    await copyAndFlash(el, text, okMsg, failMsg);
  });

  el.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const text = typeof getText === 'function' ? getText() : getText;
      await copyAndFlash(el, text, okMsg, failMsg);
    }
  });
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

// Clear result container for a panel (leave action buttons visible)
function clearResult(panelEl) {
  const resultContainer = panelEl.querySelector('.result-container');
  if (resultContainer) {
    resultContainer.style.display = 'none';
    const resultInline = resultContainer.querySelector('.result-inline');
    const resultMsg = resultContainer.querySelector('.result-msg');
    if (resultInline) resultInline.innerHTML = '';
    if (resultMsg) resultMsg.textContent = '';
  }
  // Do NOT hide clear/primary buttons — keep actions visible so user can clear anytime.
  const actions = panelEl.querySelector('.actions-below');
  if (actions) {
    actions.classList.remove('hidden');
    // Ensure all action buttons are visible (primary & secondary)
    Array.from(actions.querySelectorAll('button')).forEach(b => { b.style.display = ''; });
  }
}

// Show result in a panel (always keep action buttons visible)
function showResult(panelEl, htmlNumeric, htmlText, _showSecondary = true) {
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

  // Ensure actions are visible and buttons remain accessible (do not hide Clear)
  const actions = panelEl.querySelector('.actions-below');
  if (actions) {
    actions.classList.remove('hidden');
    Array.from(actions.querySelectorAll('button')).forEach(b => { b.style.display = ''; });
  }
}

// Tab selection (ensure function exists before tab click wiring)
function selectTab(mode, skipUrlUpdate = false) {
  currentMode = mode;
  
  // Update tab aria-selected
  Object.keys(tabs).forEach(m => {
    if (tabs[m]) tabs[m].setAttribute('aria-selected', m === mode ? 'true' : 'false');
    if (panels[m]) panels[m].style.display = m === mode ? 'block' : 'none';
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

// Load from URL (now supports auto=1)
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const auto = params.get('auto') === '1';
  
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

    // ensure groups are synced so switching panels shows same first/second values
    const f0 = $('of-x') ? $('of-x').value : '';
    if (f0) syncInputFrom('of-x', f0);
    const s0 = $('of-y') ? $('of-y').value : '';
    if (s0) syncInputFrom('of-y', s0);

    // If auto=1, compute now and show the result (but do not add to history).
    if (auto) {
      const result = computeNow(mode);
      if (!isNaN(result.r)) {
        // show result (do not add to history)
        showResult(panels[mode], result.htmlNumeric, result.htmlText, false);
        // prime lastComputedEntry so the next manual submit will add this computed result to history
        lastComputedEntry = { mode, params: readInputsFor(mode), text: result.htmlText, value: result.r };
      } else if (result.htmlText) {
        showResult(panels[mode], result.htmlNumeric, result.htmlText, false);
      }
    }
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

function deepEqual(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

function addHistoryEntry(entry) {
  const arr = loadHistory();
  // Deduplicate immediate repeats (if the most recent history entry equals this entry, skip)
  if (arr.length && deepEqual(arr[0], entry)) return;
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
      <div class="history-item" data-idx="${idx}">
        <span class="history-text">${escapeHtml(item.text)}</span>
        <div class="history-actions">
          <button class="bar-btn secondary" data-action="load" data-idx="${idx}" style="padding:0.25rem 0.5rem; font-size:0.75rem;">Load</button>
          <button class="bar-btn primary link-copy" data-action="link" data-idx="${idx}" style="padding:0.25rem 0.5rem; font-size:0.75rem;"><span>Link</span>${LINK_ICON_SVG}</button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Build a permalink URL for a history item (mode + params)
function buildUrlForHistoryItem(item) {
  const params = new URLSearchParams();
  params.set('mode', item.mode);
  const p = item.params || {};
  Object.keys(p).forEach(k => {
    if (p[k]) params.set(k, p[k]);
  });
  // include auto=1 so the link will auto-calc
  params.set('auto', '1');
  return window.location.origin + window.location.pathname + '?' + params.toString();
}

// History click handler (event delegation)
// IMPORTANT: only buttons inside the history list trigger actions now.
// Clicking the row text (history-item) will NOT trigger load — Load works only when its button is clicked.
$('history-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return; // ignore clicks that are not on a button

  const idx = +btn.dataset.idx;
  const arr = loadHistory();
  const item = arr[idx];
  if (!item) return;

  const action = btn.dataset.action;

  if (action === 'link') {
    // Copy a permalink URL that recreates this calculation
    const url = buildUrlForHistoryItem(item);
    try {
      // Use the unified inline feedback helper for consistency
      btn.classList.add('link-copy');
      await copyAndFlash(btn, url, 'Link copied to clipboard', 'Copy failed');
    } catch {
      // fallback to showing the url in a toast if copy somehow fails
      showToast(url, 6000);
    }
  } else if (action === 'load') {
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

    // Ensure groups sync so first/second propagate across panels where applicable
    const f = $('of-x') ? $('of-x').value : '';
    if (f) syncInputFrom('of-x', f);
    const s = $('of-y') ? $('of-y').value : '';
    if (s) syncInputFrom('of-y', s);

    // Clear any visible result in the loaded panel
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
  const tab = tabs[mode];
  if (tab) tab.addEventListener('click', () => selectTab(mode));
});

// Setup forms
Object.keys(panels).forEach(mode => {
  const panel = panels[mode];
  if (!panel) return;
  const form = panel.querySelector('form');
  
  // Ensure both Calculate and Clear buttons are visible at start
  const actionsInit = panel.querySelector('.actions-below');
  if (actionsInit) {
    actionsInit.classList.remove('hidden'); // ensure container not globally hidden
    Array.from(actionsInit.querySelectorAll('button')).forEach(b => { b.style.display = ''; });
  }

  // Submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = computeNow(mode);
    
    if (!isNaN(result.r)) {
      // Show numeric result and explanatory text separately
      showResult(panel, result.htmlNumeric, result.htmlText);
      
      // Add the previous calculation (if present) to history — do NOT add the current one immediately
      if (lastComputedEntry) addHistoryEntry(lastComputedEntry);

      // Update lastComputedEntry so it will be added on the next submission
      const inputs = readInputsFor(mode);
      lastComputedEntry = {
        mode,
        params: inputs,
        text: result.htmlText,
        value: result.r
      };
    } else if (result.htmlText) {
      // Show error (use htmlText as message and htmlNumeric for inline if provided)
      showResult(panel, result.htmlNumeric, result.htmlText);
    }
  });

  // Clear button — clear inputs for ALL panels
  const clearBtn = panel.querySelector('.clear-btn');
  clearBtn.addEventListener('click', () => {
    // Clear inputs in all panels
    Object.values(panels).forEach(p => {
      if (!p) return;
      const inputsAll = p.querySelectorAll('input[type="text"]');
      inputsAll.forEach(inp => { inp.value = ''; });
      // also clear any visible result in each panel
      clearResult(p);
    });
    // Focus first input in currently selected panel
    focusFirstInput();
    // persist cleared state across panels
    saveAllInputs();
    updateURL();
  });

  // Input change handlers - clear result, update URL and persist all inputs.
  // Also sync first/second inputs across panels.
  const inputs = panel.querySelectorAll('input[type="text"]');
  inputs.forEach(inp => {
    inp.addEventListener('input', (ev) => {
      clearResult(panel);
      // Sync semantic groups (by position)
      syncInputFrom(inp.id, inp.value);
      // Persist state and update URL
      saveAllInputs();
      updateURL();
    });

    // Enter key submits
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
      }
    });
  });

  // Wire action buttons inside the result area (Link + Copy Value)
  const rc = panel.querySelector('.result-container');
  if (rc) {
    const inline = rc.querySelector('.result-inline');

    // create or reuse a result-actions container (absolute positioned on the right)
    let rcActions = rc.querySelector('.result-actions');
    if (!rcActions) {
      rcActions = document.createElement('div');
      rcActions.className = 'result-actions';
      rc.appendChild(rcActions);
    }

    // Copy value button (copies only the numeric value shown in the large display) - placed first
    let valueBtn = rc.querySelector('.result-value-btn');
    if (!valueBtn) {
      valueBtn = document.createElement('button');
      valueBtn.type = 'button';
      valueBtn.className = 'bar-btn secondary result-value-btn';
      valueBtn.style.fontSize = '0.85rem';
      valueBtn.title = 'Copy result value';
      valueBtn.setAttribute('aria-label', 'Copy result value');
      valueBtn.innerHTML = `<span>Copy</span>`;
      rcActions.appendChild(valueBtn);
    }

    makeCopyTarget(valueBtn, () => {
      // copy only the visible numeric text (no explanatory text)
      return inline && inline.textContent ? inline.textContent.trim() : '';
    }, { okMsg: 'Value copied to clipboard', failMsg: 'Copy failed' });

    // Link button (permalink for this result) — visible label + icon to the right
    let linkBtn = rc.querySelector('.result-link-btn');
    if (!linkBtn) {
      linkBtn = document.createElement('button');
      linkBtn.type = 'button';
      linkBtn.className = 'bar-btn primary result-link-btn link-copy';
      linkBtn.style.fontSize = '0.85rem';
      linkBtn.title = 'Copy link for this calculation';
      linkBtn.setAttribute('aria-label', 'Copy link for this calculation');
      linkBtn.innerHTML = `<span>Link</span>${LINK_ICON_SVG}`;
      rcActions.appendChild(linkBtn);
    }

    makeCopyTarget(linkBtn, () => {
      const params = new URLSearchParams();
      params.set('mode', mode);
      const inputsNow = readInputsFor(mode);
      Object.keys(inputsNow).forEach(k => { if (inputsNow[k]) params.set(k, inputsNow[k]); });
      params.set('auto', '1');
      return window.location.origin + window.location.pathname + '?' + params.toString();
    }, { okMsg: 'Link copied to clipboard', failMsg: 'Copy failed' });
  }
});

// Initialize: load stored inputs, then allow URL to override, then render history
loadAllInputs();
loadFromURL();
renderHistory();