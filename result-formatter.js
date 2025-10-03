// result-formatter.js
// Observes #result and enforces two-decimal numeric formatting without changing main.js
(function(){
  // Observe every .result-inline independently to avoid cross-panel interference
  const resultEls = Array.from(document.querySelectorAll('.result-inline'));
  if (!resultEls.length) return;

  resultEls.forEach((resultEl) => {
    // idempotent formatter that only writes when the formatted output differs
    function formatAndSet(text) {
      const hasPercent = /%\s*$/.test(text);
      const cleaned = String(text).replace(/[^0-9+\-eE.,%]/g, '').replace(/%/g, '').trim();
      let val = NaN;
      if (cleaned !== '') {
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');
        if (lastComma !== -1 && lastDot !== -1 && lastComma > lastDot) {
          val = Number(cleaned.replace(/\./g,'').replace(/,([^,]*)$/, '.$1'));
        } else {
          val = Number(cleaned.replace(/,/g, ''));
        }
      }

      if (typeof val === 'number' && isFinite(val)) {
          // If number is large, present compact two-decimal notation in the big display and show the full value in the small message
          const abs = Math.abs(val);
          const full = hasPercent ? (val.toFixed(2) + '%') : val.toLocaleString();
          let inlineOut = null;
          if (abs >= 1e9) {
            try {
              inlineOut = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(val);
              if (hasPercent) inlineOut = inlineOut + '%';
            } catch (err) {
              inlineOut = hasPercent ? (val.toFixed(2) + '%') : val.toFixed(2);
            }
          } else {
            inlineOut = hasPercent ? (val.toFixed(2) + '%') : val.toFixed(2);
          }

          // Prefer updating the large .result-value element when present so we have a
          // single visible numeric source (avoids duplicates when main.js also renders
          // an absolutely-positioned big number). Fall back to resultEl (.result-inline)
          // when .result-value is not available.
          const panel = resultEl.closest('.tab-panel') || resultEl.closest('.right-col') || document;
          const valueEl = panel && panel.querySelector ? panel.querySelector('.result-value') : null;
          const targetEl = valueEl || resultEl;

          // Only update when the visible value would change.
          if (String(targetEl.textContent).trim() !== inlineOut) {
            try { if (mo) mo.disconnect(); } catch (err) {}
            // write the compact/two-decimal inline representation into the preferred element
            targetEl.textContent = inlineOut;

            // Also set the panel's .result-msg (if available) to the full formatted string for copy/tooltip
            // BUT do not overwrite the descriptive message that the app (main.js) may have placed
            // (e.g. "11% of 1,122 = 123.42"). Only write the full numeric when the inline display
            // is compacted (we cannot show full there) or when the message area is empty.
            if (panel) {
              const msg = panel.querySelector('.result-msg');
              if (msg) {
                const currently = String(msg.textContent || '').trim();
                const shouldWriteFull = (abs >= 1e9) || currently === '';
                if (shouldWriteFull) msg.textContent = full;
              }
            }

            // Re-observe on next microtask
            Promise.resolve().then(() => { try { if (mo) mo.observe(resultEl, { childList: true, characterData: true, subtree: true }); } catch (err) {} });
          }
        }
    }

    let mo = new MutationObserver((muts) => {
      const current = String(resultEl.textContent || '').trim();
      if (current.length) formatAndSet(current);
    });

    mo.observe(resultEl, { childList: true, characterData: true, subtree: true });

    // initial format pass
    const init = String(resultEl.textContent || '').trim();
    if (init.length) formatAndSet(init);
  });
  // No adaptive font-sizing: inputs and result font sizes are controlled by CSS only.
})();
