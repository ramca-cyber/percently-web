// input-validator.js
// Validate numeric inputs only when the user clicks Calculate (per-panel).
// Attaches a capturing submit handler to each form to validate inputs with inputmode="decimal".
import { normalizeNumberInput } from './normalize-number.js';

(function(){
  const forms = Array.from(document.querySelectorAll('form'));
  if (!forms.length) return;

  function setInvalid(el, message) {
    el.classList.add('input-invalid');
    el.setAttribute('aria-invalid', 'true');
    let err = el.nextElementSibling;
    if (!err || !err.classList || !err.classList.contains('input-error')) {
      err = document.createElement('div');
      err.className = 'input-error';
      el.parentNode.insertBefore(err, el.nextSibling);
    }
    err.textContent = message || 'Invalid number';
  }

  function clearInvalid(el) {
    el.classList.remove('input-invalid');
    el.removeAttribute('aria-invalid');
    let err = el.nextElementSibling;
    if (err && err.classList && err.classList.contains('input-error')) err.textContent = '';
  }

  function isValidNumericValue(raw) {
    const s = raw ? String(raw).trim() : '';
    if (s === '') return false;
    const n = normalizeNumberInput(s);
    return !(Number.isNaN(n) || !isFinite(n));
  }

  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      const inputs = Array.from(form.querySelectorAll('input[type="text"][inputmode="decimal"]'));
      if (!inputs.length) return; // nothing to validate here

      let anyInvalid = false;
      inputs.forEach(inp => {
        if (!isValidNumericValue(inp.value)) {
          anyInvalid = true;
          setInvalid(inp, 'Enter a valid number');
        } else {
          clearInvalid(inp);
        }
      });

      if (anyInvalid) {
        try { e.preventDefault(); } catch (err) {}
        try { e.stopImmediatePropagation(); } catch (err) {}
        try { e.stopPropagation(); } catch (err) {}

        // brief toast for feedback
        const existing = document.querySelector('.percently-toast');
        if (!existing) {
          const t = document.createElement('div');
          t.className = 'percently-toast';
          t.textContent = 'Please fix invalid fields before calculating';
          document.body.appendChild(t);
          requestAnimationFrame(() => t.classList.add('show'));
          setTimeout(() => { t.classList.remove('show'); t.addEventListener('transitionend', () => t.remove(), { once: true }); }, 2200);
        }
        return false;
      }

      // all valid: clear any error UI in the form so calculate runs cleanly
      inputs.forEach(inp => clearInvalid(inp));
    }, { capture: true });
  });
})();
