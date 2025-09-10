// assets/wtf-cart.js
(function () {
  const LS_BADGE_KEY = 'wtf_cart_count';
  const cfg = window.WTF_THEME || {};
  const ENABLE_AJAX = cfg.enableAjaxAdds !== false; // default true

  // ---- Helpers -------------------------------------------------------------
  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(opts.headers || {}) },
      ...opts
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
  }

  function setBadge(count) {
    // Primary badge element
    const el = document.querySelector('#cart-count,[data-cart-count]');
    if (el) el.textContent = String(count || 0);
    // Persist to LS so the badge doesn't flicker between navigations
    try { localStorage.setItem(LS_BADGE_KEY, String(count || 0)); } catch (e) {}
  }

  function getLSBadge() {
    try { return parseInt(localStorage.getItem(LS_BADGE_KEY) || '0', 10) || 0; } catch (e) { return 0; }
  }

  function readFormProps(form) {
    // Reads Shopify-style inputs (properties[Key]) into a flat object.
    const fd = new FormData(form);
    const props = {};
    for (const [k, v] of fd.entries()) {
      const m = k.match(/^properties\[(.+?)\]$/i);
      if (m) props[m[1]] = v;
    }
    return props;
  }

  function readButtonProps(button) {
    // Reads data-prop-Size="Large" into { Size: "Large" } etc.
    const out = {};
    for (const { name, value } of button.attributes) {
      if (name.startsWith('data-prop-')) {
        const key = name.replace('data-prop-', '');
        out[key] = value;
      }
    }
    return out;
  }

  // ---- Public API ----------------------------------------------------------
  const WTFCart = {
    async get() {
      return fetchJSON('/cart.js');
    },

    async add({ id, quantity = 1, properties = {} }) {
      const payload = { id, quantity, properties };
      const line = await fetchJSON('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      // Refresh cart to get accurate totals/item_count
      const cart = await WTFCart.get();
      document.dispatchEvent(new CustomEvent('cart:added', { detail: { line, cart } }));
      await WTFCart.refreshBadge(cart);
      return { line, cart };
    },

    async refreshBadge(cartMaybe) {
      const cart = cartMaybe || (await WTFCart.get().catch(() => null));
      const count = cart?.item_count ?? getLSBadge();
      setBadge(count);
      document.dispatchEvent(new CustomEvent('cart:refreshed', { detail: cart }));
      return count;
    },

    // Binds both quick “data-add-to-cart” buttons and full product forms
    bindUI(root = document) {
      // 1) Buttons (quick add)
      root.addEventListener('click', async (ev) => {
        const btn = ev.target.closest('[data-add-to-cart]');
        if (!btn || !ENABLE_AJAX) return;

        ev.preventDefault();
        const variantId = parseInt(btn.getAttribute('data-variant-id') || '0', 10);
        const qty = parseInt(btn.getAttribute('data-qty') || '1', 10);
        const properties = readButtonProps(btn);

        if (!variantId) {
          console.warn('WTF: Missing data-variant-id on quick add button.');
          return;
        }

        const orig = btn.textContent;
        btn.disabled = true; btn.textContent = 'Adding…';
        try {
          await WTFCart.add({ id: variantId, quantity: qty, properties });
          btn.textContent = 'Added ✔';
          setTimeout(() => (btn.textContent = orig, btn.disabled = false), 900);
        } catch (e) {
          console.error('WTF add failed:', e);
          btn.textContent = 'Error';
          setTimeout(() => (btn.textContent = orig, btn.disabled = false), 1200);
          alert('Could not add to cart. Please try again.');
        }
      });

      // 2) Forms (recommended)
      root.addEventListener('submit', async (ev) => {
        const form = ev.target.closest('form[data-product-form]');
        if (!form || !ENABLE_AJAX) return;

        ev.preventDefault();
        const idInput = form.querySelector('input[name="id"]');
        const qtyInput = form.querySelector('input[name="quantity"]');

        const id = parseInt(idInput?.value || '0', 10);
        const quantity = parseInt(qtyInput?.value || '1', 10);
        const properties = readFormProps(form);

        const submitBtn = form.querySelector('[type="submit"],button');
        const orig = submitBtn?.textContent;

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Adding…'; }

        try {
          await WTFCart.add({ id, quantity, properties });
          if (submitBtn) {
            submitBtn.textContent = 'Added ✔';
            setTimeout(() => { submitBtn.textContent = orig; submitBtn.disabled = false; }, 900);
          }
        } catch (e) {
          console.error('WTF add failed:', e);
          if (submitBtn) {
            submitBtn.textContent = 'Error';
            setTimeout(() => { submitBtn.textContent = orig; submitBtn.disabled = false; }, 1200);
          }
          alert('Could not add to cart. Please check your options and try again.');
        }
      });
    },

    init(opts = {}) {
      if (opts.onChange) {
        document.addEventListener('cart:refreshed', () => opts.onChange());
        document.addEventListener('cart:added', () => opts.onChange());
      }

      // First paint: show cached count, then hydrate from Shopify
      const cached = getLSBadge();
      setBadge(cached);

      // Live sync from /cart.js
      WTFCart.refreshBadge().catch(() => { /* LS fallback already shown */ });

      // Wire UI
      WTFCart.bindUI(document);
    }
  };

  // Expose globally (what theme.liquid expects)
  window.WTFCart = WTFCart;

  // Auto-initialize badge on DOM ready if theme didn’t call init yet
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.__wtfCartInited) {
      WTFCart.init();
      window.__wtfCartInited = true;
    }
  });
})();