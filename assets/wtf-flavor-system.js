/*!
 * WTF Flavor System (Dunkin-style)
 * - Size chips + multi-flavor selection with pump rules
 * - Real-time price UI (for transparency)
 * - Shopify AJAX add-to-cart using VARIANT ID (no price override)
 *
 * Usage:
 *  - Put a wrapper on each custom drink page, e.g.:
 *      <div id="wtf-builder"
 *           data-variant-id="{{ settings.kratom_tea_variant_id }}"
 *           data-drink="Kratom Tea"
 *           data-extra-pump-price="{{ settings.kratom_extra_pump_price | default: settings.extra_pump_price_default }}"
 *           data-inc-pumps-default="{{ settings.included_pumps_default }}"
 *           ></div>
 *  - Render size chips with `.size-selector[data-size]`
 *  - Render flavor chips with `.flavor-option[data-flavor]`
 *  - Optional: <input id="wtf-notes"> for comments
 *  - Add UI targets with ids: pump-counter, price-display, selected-flavors, cart-count
 */

(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  function money(n) { return `$${Number(n || 0).toFixed(2)}`; }

  // ---- Core class ----------------------------------------------------------
  class WTFFlavorSystem {
    constructor(root) {
      this.root = root;
      this.variantId = Number(root?.dataset?.variantId || 0);
      this.drinkName = root?.dataset?.drink || 'Custom Drink';

      // Pump rules (kept in sync with your pump_calculator.js) 4/4/6 included, max 6/6/10
      this.pumpRules = {
        Small:  { included: 4, max: 6 },
        Medium: { included: 4, max: 6 },
        Large:  { included: 6, max: 10 }
      };

      // Pricing knobs (UI only — Shopify will charge variant price unless you add an add-on item)
      const extraPumpFromSettings = Number(root?.dataset?.extraPumpPrice || 0.5);
      this.extraPumpPrice = isNaN(extraPumpFromSettings) ? 0.5 : extraPumpFromSettings;

      // If you print size base prices into the DOM, the UI can show them:
      this.sizeBasePrices = {
        Small:  Number(root?.dataset?.priceSmall  || 0),
        Medium: Number(root?.dataset?.priceMedium || 0),
        Large:  Number(root?.dataset?.priceLarge  || 0)
      };

      this.size = 'Medium';
      this.selected = [];

      this.bind();
      this.updateAll();
    }

    bind() {
      // Size chips
      $$('.size-selector').forEach(btn => {
        btn.addEventListener('click', () => {
          this.size = btn.dataset.size;
          this.capSelection();
          this.updateAll();
        });
      });

      // Flavor chips
      $$('.flavor-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.dataset.flavor;
          const i = this.selected.indexOf(val);
          if (i > -1) {
            this.selected.splice(i, 1);
          } else {
            const max = this.pumpRules[this.size].max;
            if (this.selected.length >= max) {
              this.toast(`Max ${max} flavors for ${this.size}`, 'warning');
              return;
            }
            this.selected.push(val);
          }
          this.updateAll();
        });
      });

      // Add to cart
      const addBtn = $('#wtf-add-to-cart');
      if (addBtn) {
        addBtn.addEventListener('click', () => this.addToCart());
      }
    }

    capSelection() {
      const max = this.pumpRules[this.size].max;
      if (this.selected.length > max) {
        this.selected = this.selected.slice(0, max);
      }
    }

    compute() {
      const rules = this.pumpRules[this.size];
      const base = this.sizeBasePrices[this.size] || 0;
      const total = this.selected.length;
      const extra = Math.max(0, total - rules.included);
      const extraCost = extra * this.extraPumpPrice;
      const subtotal = base + extraCost;
      return { base, total, included: rules.included, extra, extraCost, subtotal };
    }

    updateAll() {
      // button states
      $$('.size-selector').forEach(b => b.classList.toggle('active', b.dataset.size === this.size));
      const max = this.pumpRules[this.size].max;
      $$('.flavor-option').forEach(b => {
        const sel = this.selected.includes(b.dataset.flavor);
        b.classList.toggle('selected', sel);
        b.disabled = !sel && this.selected.length >= max;
      });

      // pump counter
      const comp = this.compute();
      const pumpEl = $('#pump-counter');
      if (pumpEl) {
        pumpEl.innerHTML = `
          <div class="pump-display">
            <span class="pump-count">${comp.total}</span>
            <span class="pump-label">pumps selected</span>
            <div class="pump-breakdown">${comp.included} included • ${comp.extra} extra</div>
          </div>`;
      }

      // price UI
      const priceEl = $('#price-display');
      if (priceEl) {
        priceEl.innerHTML = `
          <div class="price-breakdown">
            <div class="base-price">Base (${this.size}): ${money(comp.base)}</div>
            ${comp.extra > 0 ? `<div class="extra-cost">${comp.extra} extra × ${money(this.extraPumpPrice)} = ${money(comp.extraCost)}</div>` : ''}
            <div class="final-price">Total: ${money(comp.subtotal)}</div>
          </div>`;
      }

      const selEl = $('#selected-flavors');
      if (selEl) {
        selEl.innerHTML = this.selected.length ? `<div class="selected-list">${this.selected.join(', ')}</div>` : '<div class="no-selection">No flavors selected</div>';
      }
    }

    addToCart() {
      if (!this.variantId) {
        this.toast('Missing variant ID — set it in Theme settings.', 'error');
        return;
      }
      if (this.selected.length === 0) {
        this.toast('Pick at least one flavor.', 'warning');
        return;
      }

      const comp = this.compute();
      const notes = ($('#wtf-notes')?.value || '').trim();

      const properties = {
        'Size': this.size,
        'Flavors': this.selected.join(', '),
        'Pump Count': String(comp.total),
        'Extra Pumps': String(comp.extra),
        'Extra Pump Cost': money(comp.extraCost),
        'Comments': notes
      };

      const addBtn = $('#wtf-add-to-cart');
      if (addBtn) { addBtn.disabled = true; addBtn.setAttribute('aria-busy', 'true'); }

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: this.variantId,       // ✅ VARIANT ID required by Shopify
          quantity: 1,
          properties
          // NOTE: price cannot be overridden here; Shopify uses the variant's price
        })
      })
        .then(r => r.json())
        .then(() => {
          this.toast('Added to cart!', 'success');
          this.bumpCartCount();
        })
        .catch(err => {
          console.error(err);
          this.toast('Add to cart failed. Check variant ID.', 'error');
        })
        .finally(() => {
          if (addBtn) { addBtn.disabled = false; addBtn.removeAttribute('aria-busy'); }
        });
    }

    bumpCartCount() {
      fetch('/cart.js')
        .then(r => r.json())
        .then(cart => {
          const count = $('#cart-count');
          if (count) count.textContent = cart.item_count;
          // Open drawer if your drawer listens to this event:
          document.dispatchEvent(new CustomEvent('wtf:cart:updated', { detail: { cart } }));
        })
        .catch(() => {});
    }

    toast(msg, type = 'info') {
      let host = $('#system-messages');
      if (!host) {
        host = document.createElement('div');
        host.id = 'system-messages';
        host.className = 'system-messages';
        document.body.appendChild(host);
      }
      const el = document.createElement('div');
      el.className = `message message-${type}`;
      el.textContent = msg;
      host.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
  }

  // ---- Auto-init if a builder root exists -------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('wtf-builder');
    if (!root) return;
    window.wtfFlavorSystem = new WTFFlavorSystem(root);
  });
})();
