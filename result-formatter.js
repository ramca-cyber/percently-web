// result-formatter.js
// Observes #result and enforces two-decimal numeric formatting without changing main.js
(function(){
  const resultEl = document.querySelector('.result-inline');
  if (!resultEl) return;

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
      const out = val.toFixed(2);
      resultEl.textContent = hasPercent ? out + '%' : out;
    }
  }

  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'childList' || m.type === 'characterData') {
        const newText = resultEl.textContent;
        if (newText && newText.length) formatAndSet(newText);
      }
    }
  });
  mo.observe(resultEl, { childList: true, characterData: true, subtree: true });
  // initial format
  if (resultEl.textContent && resultEl.textContent.trim()) formatAndSet(resultEl.textContent.trim());
})();
