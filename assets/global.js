/**
 * WTF Theme – global.js
 * Lightweight storefront utilities + Shopify AJAX cart helpers.
 * Safe to load on every page.
 */
(() => {
  const ns = (window.WTF = window.WTF || {});

  /* ----------------------- Utilities ----------------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Event delegation: on('click', '[data-foo]', handler)
  function on(event, selector, handler, root = document) {
    root.addEventListener(event, (e) => {
      const target = e.target.closest(selector);
      if (target && root.contains(target)) handler(e, target);
    });
  }

  // Basic pub/sub
  const bus = (() => {
    const topics = {};
    return {
      on: (t, h) => ((topics[t] = topics[t] || []).push(h), () => (topics[t] = topics[t].filter((x) => x !== h))),
      emit: (t, payload) => (topics[t] || []).forEach((h) => h(payload)),
    };
  })();
  ns.bus = bus;

  // Currency formatter (uses shop currency from Liquid if present)
  const moneyLocale =
    document.documentElement.getAttribute('lang') || 'en-US';
  const moneyFormatter = new Intl.NumberFormat(moneyLocale, {
    style: 'currency',
    currency:
      (window.Shopify && Shopify.currency && Shopify.currency.active) ||
      (window.Shopify && Shopify.currency) ||
      'USD',
    minimumFractionDigits: 2,
  });
  const formatMoney = (centsOrNumber) => {
    const n = typeof centsOrNumber === 'number' ? centsOrNumber : parseFloat(centsOrNumber || 0);
    return moneyFormatter.format(n);
  };
  ns.formatMoney = formatMoney;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Serialize a form to { id, quantity, properties: {..} }
  function formToCartPayload(formEl) {
    const fd = new FormData(formEl);
    // Shopify accepts either application/json or form-encoded.
    // We standardize to object payload for JSON request.
    const payload = {};
    const props = {};
    fd.forEach((val, key) => {
      if (key === 'id') payload.id = val;
      else if (key === 'quantity') payload.quantity = parseInt(val || '1', 10);
      else if (key.startsWith('properties[') && key.endsWith(']')) {
        const k = key.slice('properties['.length, -1);
        props[k] = val;
      } else if (key.startsWith('properties.')) {
        // also support properties.Flavor style
        props[key.replace(/^properties\./, '')] = val;
      }
    });
    if (!payload.quantity) payload.quantity = 1;
    if (Object.keys(props).length) payload.properties = props;
    return payload;
  }

  // Build payload from a button’s data attributes
  function buttonToCartPayload(btn) {
    const id = btn.dataset.variantId || btn.dataset.id;
    const qty = parseInt(btn.dataset.qty || btn.dataset.quantity || '1', 10);
    const props = {};
    // Anything like data-prop-Size="Large" becomes properties.Size = "Large"
    Object.keys(btn.dataset)
      .filter((k) => k.startsWith('prop') || k.startsWith('properties'))
      .forEach((k) => {
        // propSize => Size, propertiesFlavor => Flavor
        const label = k.replace(/^prop/, '').replace(/^properties/, '');
        if (label) props[label.replace(/^[A-Z]/, (m) => m)] = btn.dataset[k];
      });
    return { id, quantity: qty || 1, ...(Object.keys(props).length ? { properties: props } : {}) };
  }

  // Toasts (non-blocking)
  function toast(message, type = 'info') {
    let el = $('#wtf-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wtf-toast';
      el.style.cssText =
        'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#333;color:#fff;padding:10px 14px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:9999;font-size:14px;opacity:0;transition:opacity .2s ease';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.background = type === 'error' ? '#c0392b' : type === 'success' ? '#2e7d32' : '#333';
    el.style.opacity = '1';
    setTimeout(() => (el.style.opacity = '0'), 2000);
  }
  ns.toast = toast;

  /* ----------------------- Cart API ----------------------- */
  const Cart = {
    async get() {
      const res = await fetch('/cart.js', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Cart fetch failed');
      return res.json();
    },
    async add({ id, quantity = 1, properties }) {
      if (!id) throw new Error('Variant ID missing');
      const body = { items: [{ id: Number(id), quantity: Number(quantity) || 1, ...(properties ? { properties } : {}) }] };
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Add to cart failed');
      }
      return res.json(); // returns the added items payload
    },
    async change(lineOrKey, quantity) {
      const body = typeof lineOrKey === 'number'
        ? { line: lineOrKey, quantity }
        : { id: lineOrKey, quantity };
      const res = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Cart change failed');
      return res.json();
    },
    async clear() {
      const res = await fetch('/cart/clear.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('Cart clear failed');
      return res.json();
    },
  };
  ns.Cart = Cart;

  /* --------------------- Cart Count Sync --------------------- */
  async function refreshCartCount({ fallback = false } = {}) {
    try {
      const cart = await Cart.get();
      updateCartCountDisplay(cart.item_count || 0);
      bus.emit('cart:updated', cart);
      return cart;
    } catch (e) {
      console.warn('Cart fetch failed, using fallback count', e);
      if (fallback) {
        // Fallback to localStorage pool used by legacy pages
        const ls = JSON.parse(localStorage.getItem('wtf-cart') || '[]');
        updateCartCountDisplay(ls.length || 0);
      }
    }
  }

  function updateCartCountDisplay(count) {
    const targets = [$('#cart-count'), ...$$('[data-cart-count]')].filter(Boolean);
    targets.forEach((el) => (el.textContent = String(count)));
  }
  ns.refreshCartCount = refreshCartCount;

  /* ------------- Generic “AJAX add to cart” wiring ------------- */
  // 1) Buttons:
  //    <button data-add-to-cart data-variant-id="123" data-qty="1" data-prop-Size="Large">Add</button>
  // 2) Forms (recommended):
  //    <form data-product-form> <input name="id"> <input name="quantity">
  //      <input name="properties[Flavor]" value="Lemon"> ...
  //    </form>
  //    <button type="submit" form="theFormId">Add</button>

  on('click', '[data-add-to-cart]', async (e, btn) => {
    e.preventDefault();
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Adding…';
    try {
      const payload = buttonToCartPayload(btn);
      await Cart.add(payload);
      toast('Added to cart', 'success');
      await refreshCartCount({ fallback: true });
      bus.emit('cart:add:success', payload);
    } catch (err) {
      console.error(err);
      toast('Could not add to cart', 'error');
      bus.emit('cart:add:error', err);
    } finally {
      btn.textContent = original;
      btn.disabled = false;
    }
  });

  on('submit', 'form[data-product-form]', async (e, form) => {
    e.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.dataset.originalText = submit.dataset.originalText || submit.textContent;
      submit.textContent = 'Adding…';
    }
    try {
      const payload = formToCartPayload(form);
      await Cart.add(payload);
      toast('Added to cart', 'success');
      await refreshCartCount({ fallback: true });
      bus.emit('cart:add:success', payload);
      // Optional: reset only quantity and comments
      const qty = form.querySelector('input[name="quantity"]');
      if (qty) qty.value = '1';
    } catch (err) {
      console.error(err);
      toast('Could not add to cart', 'error');
      bus.emit('cart:add:error', err);
    } finally {
      if (submit) {
        submit.textContent = submit.dataset.originalText;
        submit.disabled = false;
      }
    }
  });

  /* --------- Optional: page helpers can read data-* config --------- */
  // If theme.liquid sets pump settings on <body>, expose them.
  const body = document.body;
  ns.config = {
    includedPumps: Number(body.dataset.includedPumps || 2),
    extraPumpPrice: parseFloat(body.dataset.extraPumpPrice || 0.5),
  };

  /* --------------------- Boot & Heartbeat --------------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('WTF Theme ready');
    await refreshCartCount({ fallback: true });
    bus.emit('ready');
  });

  // Keep count fresh when pages/cached sections swap
  document.addEventListener('shopify:section:load', () => refreshCartCount({ fallback: true }));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshCartCount({ fallback: true });
  });
})();