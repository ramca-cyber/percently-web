// main.js — submit-only calculations with structured history
import { normalizeNumberInput } from './normalize-number.js';
import * as calc from './calc.js';
// Inline small SVG icons (kept minimal to avoid external module dependency)
const COPY_ICON = `<svg aria-hidden="true" focusable="false" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="vertical-align:middle"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path></svg>`;
const LINK_ICON = `<svg aria-hidden="true" focusable="false" width="1em" height="1em" viewBox="0 0 24 24" style="vertical-align:middle; margin-left:6px; fill:none; stroke:currentColor; stroke-width:2"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path></svg>`;

const HISTORY_KEY = 'percently_history_v3';
const MAX_HISTORY = 8;
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
  // Intentionally disabled: do not copy input values across panels. Carrying values between
  // panels was confusing for users, so this function is a no-op to keep each panel isolated.
  return;
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

// Centralized icon strings (imported)

// Centralized user-visible messages for copy/link actions
const M = {
  valueCopied: 'Value copied to clipboard',
  linkCopied: 'Link copied to clipboard',
  copyFailed: 'Copy failed'
};

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

  // Also show a centralized toast for successful copies so users see the same
  // feedback as when copying links. Do not block on toast.
  if (ok) {
    try { showToast(okMsg, Math.max(1200, duration)); } catch (e) { /* ignore */ }
  }

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

// Create and wire result controls (idempotent). Ensures `.result-value` and
// `.result-inline-copy` exist and attaches copy behavior once.
function createResultControls(panelEl) {
  if (!panelEl) return;
  const rc = panelEl.querySelector('.result-container');
  if (!rc) return;
  const inline = rc.querySelector('.result-inline');

  // result-value
  let valueEl = inline ? inline.querySelector('.result-value') : rc.querySelector('.result-value');
  if (!valueEl) {
    valueEl = document.createElement('span');
    valueEl.className = 'result-value';
    if (inline) inline.insertBefore(valueEl, inline.firstChild); else rc.appendChild(valueEl);
  }

  // inline copy button
  let inlineCopy = rc.querySelector('.result-inline-copy');
  if (!inlineCopy) {
    inlineCopy = document.createElement('button');
    inlineCopy.type = 'button';
    inlineCopy.className = 'result-inline-copy';
    inlineCopy.title = 'Copy result value';
    inlineCopy.setAttribute('aria-label', 'Copy result value');
    inlineCopy.innerHTML = COPY_ICON;
    if (inline) inline.appendChild(inlineCopy); else rc.appendChild(inlineCopy);
  }

  // Wire copy behavior once per element
  if (!inlineCopy.dataset.copyWired) {
    const panelId = panelEl && panelEl.id ? panelEl.id : '';
    const inferredMode = panelId && panelId.indexOf('panel-') === 0 ? panelId.slice(6) : null;
    makeCopyTarget(inlineCopy, () => {
      if (lastComputedEntry && inferredMode && lastComputedEntry.mode === inferredMode && typeof lastComputedEntry.value !== 'undefined' && !Number.isNaN(lastComputedEntry.value)) {
        if (inferredMode === 'what') return `${formatNumber(lastComputedEntry.value)}%`;
        return `${formatNumber(lastComputedEntry.value)}`;
      }
      const panelMsg = panelEl.querySelector('.result-msg');
      if (panelMsg && panelMsg.textContent && panelMsg.textContent.trim()) return panelMsg.textContent.trim();
      const raw = inline && inline.textContent ? inline.textContent.trim() : '';
      return raw.replace(/^[=\s]+/, '').trim();
    }, { okMsg: M.valueCopied, failMsg: M.copyFailed });
    inlineCopy.dataset.copyWired = '1';
  }

  // Make the whole result container act as a copy target (click anywhere on the blue box)
  // Instead of using makeCopyTarget directly on the container (which would show the
  // copied badge on the container), wire the container to call copyAndFlash using
  // the inline copy button element so the same badge/toast appears as when the
  // user clicks the small copy icon.
  if (!rc.dataset.copyContainerWired) {
    // ensure container can be focused for keyboard copy
    if (!rc.hasAttribute('tabindex')) rc.setAttribute('tabindex', '0');

    const getContainerCopyText = () => {
      const panelId = panelEl && panelEl.id ? panelEl.id : '';
      const inferredMode = panelId && panelId.indexOf('panel-') === 0 ? panelId.slice(6) : null;
      if (lastComputedEntry && inferredMode && lastComputedEntry.mode === inferredMode && typeof lastComputedEntry.value !== 'undefined' && !Number.isNaN(lastComputedEntry.value)) {
        if (inferredMode === 'what') return `${formatNumber(lastComputedEntry.value)}%`;
        return `${formatNumber(lastComputedEntry.value)}`;
      }
      const panelMsg = panelEl.querySelector('.result-msg');
      if (panelMsg && panelMsg.textContent && panelMsg.textContent.trim()) return panelMsg.textContent.trim();
      const inline = rc.querySelector('.result-inline');
      const raw = inline && inline.textContent ? inline.textContent.trim() : '';
      return raw.replace(/^[=\s]+/, '').trim();
    };

    const inlineCopyBtn = rc.querySelector('.result-inline-copy');
    const containerHandler = async (e) => {
      // prevent double-handling if the user actually clicked the small button
      if (e.target && e.target.closest && e.target.closest('.result-inline-copy')) return;
      e.preventDefault();
      const text = getContainerCopyText();
      if (!inlineCopyBtn) {
        // fallback: use global behavior on container itself
        await copyAndFlash(rc, text, M.valueCopied, M.copyFailed);
      } else {
        await copyAndFlash(inlineCopyBtn, text, M.valueCopied, M.copyFailed);
      }
    };

    rc.addEventListener('click', containerHandler);
    rc.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        containerHandler(ev);
      }
    });

    rc.dataset.copyContainerWired = '1';
  }
}

// Clear result container for a panel (leave action buttons visible)
function clearResult(panelEl) {
  const resultContainer = panelEl.querySelector('.result-container');
  if (resultContainer) {
    // animate hiding by removing the visible class and waiting for transition end
    resultContainer.classList.remove('shown');
    resultContainer.classList.remove('copyable');
    const hideAfter = () => { resultContainer.style.display = 'none'; resultContainer.removeEventListener('transitionend', hideAfter); };
    // If no transition is present, hide immediately
    const cs = getComputedStyle(resultContainer);
    if (!cs.transitionDuration || cs.transitionDuration === '0s') {
      resultContainer.style.display = 'none';
    } else {
      resultContainer.addEventListener('transitionend', hideAfter);
    }
    const resultInline = resultContainer.querySelector('.result-inline');
    // result-msg has been moved outside the result container into the panel
    const resultMsg = panelEl.querySelector('.result-msg');
    if (resultInline) {
      const val = resultInline.querySelector('.result-value');
      if (val) val.innerHTML = '';
    }
    if (resultMsg) resultMsg.textContent = '';
    // hide equals row when empty
    const eqRow = resultContainer.closest('.eq-row');
    if (eqRow) eqRow.style.display = 'none';
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
  const msg = panelEl.querySelector('.result-msg');

  // Reveal container with a smooth transition
  rc.style.display = 'block';
  // trigger reflow so transitions apply
  void rc.offsetWidth;
  rc.classList.add('shown');
  // Enable copyable state so clicking anywhere on the blue area copies the value
  rc.classList.add('copyable');
  // ensure equals row is visible
  const eqRow = rc.closest('.eq-row');
  if (eqRow) eqRow.style.display = '';

  // Put only the numeric HTML into the large display
  if (inline) {
    // ensure we only replace the numeric value so existing inline controls (copy) are preserved
    let valueEl = inline.querySelector('.result-value');
    if (!valueEl) {
      valueEl = document.createElement('span');
      valueEl.className = 'result-value';
      // place numeric value before any inline controls
      inline.insertBefore(valueEl, inline.firstChild);
    }
    valueEl.innerHTML = htmlNumeric || '';
    // Styling is handled by CSS; no inline styles required.
  }

  // Ensure the inline copy button exists and is wired for this panel. Some panels
  // could miss the initial wiring if DOM timing differs; creating it here guarantees
  // consistent behavior across all panels.
  (function ensureInlineCopy() {
    if (!rc) return;
    let inlineCopy = rc.querySelector('.result-inline-copy');
    if (inlineCopy) return; // already present
    // Create the copy button and insert it into the inline group (or container)
    inlineCopy = document.createElement('button');
    inlineCopy.type = 'button';
    inlineCopy.className = 'result-inline-copy';
    inlineCopy.title = 'Copy result value';
    inlineCopy.setAttribute('aria-label', 'Copy result value');
    // Use em-based SVG sizing so it scales with the button's font-size
  inlineCopy.innerHTML = COPY_ICON;
    if (inline) inline.appendChild(inlineCopy); else rc.appendChild(inlineCopy);

    // Styling is handled by CSS; SVG set to em units above so it will scale.

    // Derive mode from panel id (panel-<mode>) so the copy text prefers canonical formatting
    const panelId = panelEl && panelEl.id ? panelEl.id : '';
    const inferredMode = panelId && panelId.indexOf('panel-') === 0 ? panelId.slice(6) : null;

    makeCopyTarget(inlineCopy, () => {
      // Prefer canonical formatted value from lastComputedEntry when available
      if (lastComputedEntry && inferredMode && lastComputedEntry.mode === inferredMode && typeof lastComputedEntry.value !== 'undefined' && !Number.isNaN(lastComputedEntry.value)) {
        if (inferredMode === 'what') return `${formatNumber(lastComputedEntry.value)}%`;
        return `${formatNumber(lastComputedEntry.value)}`;
      }
      const panelMsg = panelEl.querySelector('.result-msg');
      if (panelMsg && panelMsg.textContent && panelMsg.textContent.trim()) return panelMsg.textContent.trim();
      const raw = inline && inline.textContent ? inline.textContent.trim() : '';
      return raw.replace(/^[=\s]+/, '').trim();
  }, { okMsg: M.valueCopied, failMsg: M.copyFailed });
  })();

  // Put the explanatory text into the smaller message area (tooltip area)
  if (msg) {
    msg.innerHTML = htmlText || '';
    // link the result container to the message for screen readers
    if (msg.id) rc.setAttribute('aria-describedby', msg.id); else {
      // ensure msg has an id for referencing
      const mid = 'result-msg-' + (panelEl.id || Math.random().toString(36).slice(2,8));
      msg.id = mid;
      rc.setAttribute('aria-describedby', mid);
    }
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

  // Move the global calc link button into the active panel's actions row so it is
  // vertically aligned with Calculate/Clear while staying horizontally at the
  // right edge. Use absolute positioning inside the actions container so the
  // center-aligned Calculate/Clear buttons are not affected by flex auto-margins.
  try {
    const calcLinkBtn = document.getElementById('calc-link');
    if (calcLinkBtn && panels[mode]) {
      const actions = panels[mode].querySelector('.actions-below');
      if (actions) {
        actions.classList.remove('hidden');
        // ensure Calculate/Clear remain visible
        Array.from(actions.querySelectorAll('button')).forEach(b => { b.style.display = ''; });
        // move the button into this actions container (appendChild will move it)
        if (calcLinkBtn.parentNode !== actions) {
          // ensure the actions container can contain an absolutely-positioned child
          actions.style.position = actions.style.position || 'relative';
          // absolutely position the link at the right edge vertically centered
          calcLinkBtn.style.position = 'absolute';
          calcLinkBtn.style.right = '12px';
          calcLinkBtn.style.top = '50%';
          calcLinkBtn.style.transform = 'translateY(-50%)';
          // ensure the icon is present (inject LINK_ICON if missing)
          if (!/\<svg/.test(calcLinkBtn.innerHTML)) {
            try { calcLinkBtn.innerHTML = `<span>Link</span>${LINK_ICON}`; } catch (e) { /* ignore */ }
          }
          actions.appendChild(calcLinkBtn);
        }
      }
    }
  } catch (e) {
    // ignore positioning errors
  }
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
        lastComputedEntry = { mode, params: readInputsFor(mode), paramsNum: (function numericize(obj) {
          const out = {};
          Object.keys(obj || {}).forEach(k => { out[k] = normalizeNumberInput(obj[k] || ''); });
          return out;
        })(readInputsFor(mode)), text: result.htmlText, value: result.r };
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
          <button class="bar-btn primary link-copy" data-action="link" data-idx="${idx}" style="padding:0.25rem 0.5rem; font-size:0.75rem;"><span>Link</span>${LINK_ICON}</button>
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
  await copyAndFlash(btn, url, M.linkCopied, M.copyFailed);
    } catch {
      // fallback to showing the url in a toast if copy somehow fails
      showToast(url, 6000);
    }
  } else if (action === 'load') {
    // Load the selected history item into the UI and show its result (do not add it to history).
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

    // Persist loaded history values so they are retained when switching panels
    saveAllInputs();

    // Ensure groups sync so first/second propagate across panels where applicable
    const f = $('of-x') ? $('of-x').value : '';
    if (f) syncInputFrom('of-x', f);
    const s = $('of-y') ? $('of-y').value : '';
    if (s) syncInputFrom('of-y', s);

    // Compute the result using the hydrated inputs and show it.
    // Do NOT add any history entry here — we're loading a past calculation.
    const result = computeNow(item.mode);
    if (!isNaN(result.r)) {
      // Show the computed result (no history mutation)
      showResult(panels[item.mode], result.htmlNumeric, result.htmlText, false);

      // Prime lastComputedEntry with the loaded item so the next manual submit knows this is the last state
      lastComputedEntry = {
        mode: item.mode,
        params: item.params || {},
        paramsNum: (function numericize(obj) {
          const out = {};
          Object.keys(obj || {}).forEach(k => {
            out[k] = normalizeNumberInput(obj[k] || '');
          });
          return out;
        })(item.params || {}),
        text: result.htmlText,
        value: result.r
      };
    } else if (result.htmlText) {
      // Show error if the stored params produce an invalid result
      showResult(panels[item.mode], result.htmlNumeric, result.htmlText, false);
      // Do not set lastComputedEntry in this case
    }

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

// Utility: numericize a params object (strings -> normalized numbers)
function numericizeParams(params) {
  const out = {};
  Object.keys(params || {}).forEach(k => {
    out[k] = normalizeNumberInput(params[k] || '');
  });
  return out;
}

// Numeric-tolerant equality for params
function numsEqual(a, b) {
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    const va = a[k];
    const vb = b[k];
    // treat NaN==NaN as equal for the purposes of comparing "no numeric value"
    if (Number.isNaN(va) && Number.isNaN(vb)) continue;
    if (Number.isNaN(va) || Number.isNaN(vb)) return false;
    if (Math.abs(va - vb) > 1e-12) return false;
  }
  return true;
}

// Setup forms
Object.keys(panels).forEach(mode => {
  const panel = panels[mode];
  if (!panel) return;
  const form = panel.querySelector('form');
  // Ensure result controls are present and wired for this panel
  createResultControls(panel);
  
  // Ensure both Calculate and Clear buttons are visible at start
  const actionsInit = panel.querySelector('.actions-below');
  if (actionsInit) {
    actionsInit.classList.remove('hidden'); // ensure container not globally hidden
    Array.from(actionsInit.querySelectorAll('button')).forEach(b => { b.style.display = ''; });
  }

  // Submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Read inputs up front so we can compare before computing
    const inputs = readInputsFor(mode);
    const inputsNum = numericizeParams(inputs);

    // Numeric version of lastComputedEntry.params
    let lastParamsNum = null;
    if (lastComputedEntry && lastComputedEntry.paramsNum) {
      lastParamsNum = lastComputedEntry.paramsNum;
    } else if (lastComputedEntry && lastComputedEntry.params) {
      lastParamsNum = numericizeParams(lastComputedEntry.params);
    }

    // Skip recalculation if inputs haven't changed since last compute for the same mode (numeric comparison)
    if (lastComputedEntry && lastComputedEntry.mode === mode && lastParamsNum && numsEqual(inputsNum, lastParamsNum)) {
      return; // do nothing; keep existing visible result
    }

    const result = computeNow(mode);
    
    if (!isNaN(result.r)) {
      // Show numeric result and explanatory text separately
      showResult(panel, result.htmlNumeric, result.htmlText);
      
      // Add the previous calculation (if present) to history — do NOT add the current one immediately
      if (lastComputedEntry) addHistoryEntry(lastComputedEntry);

      // Update lastComputedEntry so it will be added on the next submission
      lastComputedEntry = {
        mode,
        params: inputs,
        paramsNum: inputsNum,
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
  const inputsEls = panel.querySelectorAll('input[type="text"]');
  inputsEls.forEach(inp => {
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

    // create or reuse a result-actions container placed below the result area so it doesn't overlap large numbers
    let rcActions = panel.querySelector('.result-actions-below');
    if (!rcActions) {
      rcActions = document.createElement('div');
      rcActions.className = 'result-actions-below';
      // place it after the result container
      rc.parentNode.insertBefore(rcActions, rc.nextSibling);
    }

    // Add a small inline copy affordance inside the result container itself so users can click the value
    // to copy. We'll create a visually subtle button anchored top-right inside rc.
    let inlineCopy = rc.querySelector('.result-inline-copy');
    if (!inlineCopy) {
      inlineCopy = document.createElement('button');
      inlineCopy.type = 'button';
      inlineCopy.className = 'result-inline-copy';
      inlineCopy.title = 'Copy result value';
      inlineCopy.setAttribute('aria-label', 'Copy result value');
      // small copy icon (inline SVG)
  inlineCopy.innerHTML = COPY_ICON;
  // appearance and positioning are handled by CSS (.result-inline-copy)
  // place the copy button inside the numeric element so it stays aligned to the value
  if (inline) inline.appendChild(inlineCopy); else rc.appendChild(inlineCopy);
    }

    makeCopyTarget(inlineCopy, () => {
      // Prefer canonical formatted value from lastComputedEntry when available
      if (lastComputedEntry && lastComputedEntry.mode === mode && typeof lastComputedEntry.value !== 'undefined' && !Number.isNaN(lastComputedEntry.value)) {
        if (mode === 'what') return `${formatNumber(lastComputedEntry.value)}%`;
        return `${formatNumber(lastComputedEntry.value)}`;
      }
      // Fallback to the visible result message (full formatted value was moved to .result-msg)
      const panelMsg = panel.querySelector('.result-msg');
      if (panelMsg && panelMsg.textContent && panelMsg.textContent.trim()) return panelMsg.textContent.trim();
      const raw = inline && inline.textContent ? inline.textContent.trim() : '';
      return raw.replace(/^[=\s]+/, '').trim();
  }, { okMsg: M.valueCopied, failMsg: M.copyFailed });

    // NOTE: Per-panel Link buttons are handled by a single global link button (#calc-link)
    // to avoid duplicating controls across each panel. The global button is wired below
    // after all panels are initialized. This keeps the layout consistent and places the
    // link control at the right edge of the calculator as requested.
  }
});

// Initialize: load stored inputs, then allow URL to override, then render history
loadAllInputs();
loadFromURL();
renderHistory();
// Ensure every panel has the inline value and copy affordance wired (idempotent).
// (creation/wiring now handled via createResultControls called during panel init)

// Wire the global calculator Link button (copies permalink for the active panel)
const calcLinkBtn = document.getElementById('calc-link');
if (calcLinkBtn) {
  makeCopyTarget(calcLinkBtn, () => {
    const mode = currentMode || 'of';
    const params = new URLSearchParams();
    params.set('mode', mode);

    // Prefer canonical parameters from lastComputedEntry when it matches current mode
    const canonicalParams = (lastComputedEntry && lastComputedEntry.mode === mode && lastComputedEntry.params)
      ? lastComputedEntry.params
      : readInputsFor(mode);

    Object.keys(canonicalParams || {}).forEach(k => {
      if (canonicalParams[k]) params.set(k, canonicalParams[k]);
    });
    params.set('auto', '1');
    return window.location.origin + window.location.pathname + '?' + params.toString();
  }, { okMsg: M.linkCopied, failMsg: M.copyFailed });
}

// Place the calc-link button into the active panel's actions area on init
try {
  const initBtn = document.getElementById('calc-link');
  if (initBtn) {
    const panel = panels[currentMode] || panels['of'];
    if (panel) {
      const actions = panel.querySelector('.actions-below');
      if (actions) {
        initBtn.style.marginLeft = 'auto';
        actions.classList.remove('hidden');
        actions.appendChild(initBtn);
      }
    }
  }
} catch (e) { /* ignore */ }

// --- Theme toggle (light / dark) ---
const THEME_KEY = 'percently_theme_v1';
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('theme-dark'); else root.classList.remove('theme-dark');
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? 'Dark' : 'Light';
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }
}

function initTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
  } catch (e) { applyTheme('light'); }
  const tbtn = document.getElementById('theme-toggle');
  if (tbtn) {
    tbtn.addEventListener('click', () => {
      const cur = document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
      applyTheme(next);
    });
  }
}

initTheme();
