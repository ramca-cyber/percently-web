# Percently

A small, responsive percentage calculator web app — X% of Y, increase/decrease, percent difference, and more.

Files included
- index.html, style.css — UI and styles (responsive)
- main.js — UI wiring (ES module)
- calc.js — pure calculation functions (testable)
- normalize-number.js — accepts dot/comma numeric input
- a11y-radio-cards.js — keyboard operability for option cards
- package.json, tests/ — local dev & unit tests
- .github/workflows/ci.yml — CI to run tests and optionally deploy

Quick local run
1. Clone your repo:
   git clone https://github.com/ramca-cyber/percently-web.git
2. Open index.html in a browser (no build required).
   - or to run tests and dev tools below, install Node.

Node & tests (optional)
1. Install Node.js (>=16).
2. Install deps:
   npm ci
3. Run tests:
   npm test

Enable GitHub Pages
- In your repo: Settings → Pages → select branch `main` and folder `/ (root)`. Save.
- Site will be published at: https://ramca-cyber.github.io/percently-web/

License
- MIT