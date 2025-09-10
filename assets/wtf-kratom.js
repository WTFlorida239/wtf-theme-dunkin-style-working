/* File: assets/wtf-kratom.js
   Purpose: Persist Kratom Tea selections + keep pricing consistent across UI.
   Notes:
   - Relies on existing inputs:
       - size radios:   input[name="size"] with values "Medium" | "Large" | "Gallon"
       - strain radios: input[name="strain-type"] with values "Green" | "Red" | "White" | "Yellow" | "mix"
       - optional selects for mix: select[name="strain-1"], select[name="strain-2"]
       - flavors:        input[name="flavor"] (checkboxes)
       - extra pumps:    #extra-pumps (optional)
       - quantity:       #quantity (optional)
   - Mirrors price into: #product-price-amount and #cart-price
*/

(function () {
  const STORAGE_KEY = 'wtf_kratom_selections_v1';

  // Single source of truth for base prices
  const PRICES = {
    Medium: 9.0,
    Large: 12.0,
    Gallon: 75.0
  };

  // DOM helpers
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  // State
  const state = {
    size: 'Medium',
    strainType: 'Green', // or 'mix'
    strain1: 'Green',
    strain2: 'Red',
    flavors: [],
    extraPumps: 0
  };

  function readUI() {
    const size = $('input[name="size"]:checked');
    if (size) state.size = size.value;

    const strain = $('input[name="strain-type"]:checked');
    if (strain) state.strainType = strain.value;

    const s1 = $('select[name="strain-1"]');
    const s2 = $('select[name="strain-2"]');
    if (s1) state.strain1 = s1.value || state.strain1;
    if (s2) state.strain2 = s2.value || state.strain2;

    state.flavors = $$('#order-form input[name="flavor"]:checked').map((el) => el.value);

    const extra = $('#extra-pumps');
    if (extra) state.extraPumps = Math.max(0, parseInt(extra.value || '0', 10)) || 0;
  }

  function writeUI() {
    // Size
    const sizeRadio = $(`input[name="size"][value="${state.size}"]`);
    if (sizeRadio) sizeRadio.checked = true;

    // Strain type
    const strainRadio = $(`input[name="strain-type"][value="${state.strainType}"]`);
    if (strainRadio) strainRadio.checked = true;

    // Mix selects (if present)
    const s1 = $('select[name="strain-1"]');
    const s2 = $('select[name="strain-2"]');
    if (s1 && state.strain1) s1.value = state.strain1;
    if (s2 && state.strain2) s2.value = state.strain2;

    // Flavors
    $$('#order-form input[name="flavor"]').forEach((el) => {
      el.checked = state.flavors.includes(el.value);
    });

    // Extra pumps
    const extra = $('#extra-pumps');
    if (extra) extra.value = String(state.extraPumps);
  }

  function computePrice() {
    const base = PRICES[state.size] || PRICES.Medium;
    const extra = (state.extraPumps || 0) * 0.5;
    const total = base + extra;
    return Math.max(0, Number(total)).toFixed(2);
  }

  function syncPriceUI() {
    const amount = computePrice();
    const topEl = $('#product-price-amount'); // replaces "Starting at ..."
    const ctaEl = $('#cart-price');
    if (topEl) topEl.textContent = `$${amount}`;
    if (ctaEl) ctaEl.textContent = `$${amount}`;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.assign(state, parsed);
      }
    } catch (_) {}
  }

  function handleVisibilityForMix() {
    const mixWrap = $('#strain-mix-options');
    if (!mixWrap) return;
    if (state.strainType === 'mix') mixWrap.classList.add('active');
    else mixWrap.classList.remove('active');
  }

  function onChange() {
    readUI();
    handleVisibilityForMix();
    syncPriceUI();
    save();
  }

  function attachEvents() {
    // Size
    $$('input[name="size"]').forEach((el) => el.addEventListener('change', onChange));
    // Strain type
    $$('input[name="strain-type"]').forEach((el) => el.addEventListener('change', onChange));
    // Strain selects
    $$('select[name^="strain-"]').forEach((el) => el.addEventListener('change', onChange));
    // Flavors
    $$('input[name="flavor"]').forEach((el) => el.addEventListener('change', onChange));
    // Extra pumps
    const extra = $('#extra-pumps');
    if (extra) extra.addEventListener('input', onChange);
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Restore then write into UI, then compute once
    load();
    writeUI();
    handleVisibilityForMix();
    syncPriceUI();
    attachEvents();

    // Safety: If a stray price element still says "Starting at", correct it.
    const maybeStarter = $('#product-price');
    if (maybeStarter && maybeStarter.textContent.toLowerCase().includes('starting')) {
      maybeStarter.innerHTML = `Price: <span id="product-price-amount">${$('#cart-price') ? $('#cart-price').textContent : '$' + computePrice()}</span>`;
    }
  });
})();