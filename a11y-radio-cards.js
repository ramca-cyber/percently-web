// a11y-radio-cards.js
// Make the label-styled radio cards keyboard focusable and operable by Enter/Space.
(function () {
  const optionCards = Array.from(document.querySelectorAll('.option-card'));
  optionCards.forEach(card => {
    // ensure focusability
    card.setAttribute('tabindex', '0');

    card.addEventListener('keydown', (e) => {
      const isEnter = e.key === 'Enter';
      const isSpace = e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space';
      if (isEnter || isSpace) {
        e.preventDefault();
        const forId = card.getAttribute('for') || card.htmlFor;
        if (forId) {
          const radio = document.getElementById(forId);
          if (radio && !radio.checked) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            const x = document.getElementById('input-x');
            if (x) x.focus();
          }
        }
      }
    });

    // clicking label already selects radio; add pointer feedback
    card.addEventListener('click', () => {
      const forId = card.getAttribute('for') || card.htmlFor;
      if (forId) {
        const radio = document.getElementById(forId);
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
  });
})();