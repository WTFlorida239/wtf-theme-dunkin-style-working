// assets/wtf-cart.js - Fixed version with proper AJAX cart functionality
(function () {
  'use strict';
  
  const LS_BADGE_KEY = 'wtf_cart_count';
  const cfg = window.WTF_THEME || {};
  const ENABLE_AJAX = cfg.enableAjaxAdds !== false; // default true

  // ---- Helpers -------------------------------------------------------------
  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(opts.headers || {}) 
      },
      ...opts
    });
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  function setBadge(count) {
    // Update all cart count elements
    const elements = document.querySelectorAll('#cart-count, [data-cart-count], .cart-count');
    elements.forEach(el => {
      el.textContent = String(count || 0);
    });
    
    // Update cart link text if it includes count
    const cartLinks = document.querySelectorAll('a[href*="cart"]');
    cartLinks.forEach(link => {
      const text = link.textContent;
      if (text.includes('Cart')) {
        link.textContent = text.replace(/\(\d+\)/, `(${count || 0})`);
      }
    });
    
    // Persist to localStorage
    try { 
      localStorage.setItem(LS_BADGE_KEY, String(count || 0)); 
    } catch (e) {
      console.warn('Could not save cart count to localStorage:', e);
    }
  }

  function getLSBadge() {
    try { 
      return parseInt(localStorage.getItem(LS_BADGE_KEY) || '0', 10) || 0; 
    } catch (e) { 
      return 0; 
    }
  }

  function readFormProps(form) {
    // Reads Shopify-style inputs (properties[Key]) into a flat object
    const fd = new FormData(form);
    const props = {};
    for (const [k, v] of fd.entries()) {
      const m = k.match(/^properties\[(.+?)\]$/i);
      if (m && v.trim()) {
        props[m[1]] = v;
      }
    }
    return props;
  }

  function readButtonProps(button) {
    // Reads data-prop-Size="Large" into { Size: "Large" } etc.
    const out = {};
    for (const { name, value } of button.attributes) {
      if (name.startsWith('data-prop-') && value.trim()) {
        const key = name.replace('data-prop-', '');
        out[key] = value;
      }
    }
    return out;
  }

  function showNotification(message, type = 'success') {
    // Create or update notification
    let notification = document.getElementById('cart-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'cart-notification';
      notification.setAttribute('aria-live', 'polite');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        font-size: 14px;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.opacity = '1';
    
    setTimeout(() => {
      notification.style.opacity = '0';
    }, 3000);
  }

  // ---- Public API ----------------------------------------------------------
  const WTFCart = {
    async get() {
      return fetchJSON('/cart.js');
    },

    async add({ id, quantity = 1, properties = {}, selling_plan = null }) {
      const payload = { 
        id: parseInt(id, 10), 
        quantity: parseInt(quantity, 10) || 1, 
        properties 
      };
      
      if (selling_plan) {
        payload.selling_plan = selling_plan;
      }

      try {
        const line = await fetchJSON('/cart/add.js', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        
        // Refresh cart to get accurate totals/item_count
        const cart = await WTFCart.get();
        
        // Dispatch events
        document.dispatchEvent(new CustomEvent('cart:added', { 
          detail: { line, cart, item: line } 
        }));
        
        document.dispatchEvent(new CustomEvent('wtf:cart:updated', { 
          detail: { cart } 
        }));
        
        await WTFCart.refreshBadge(cart);
        
        showNotification('Added to cart!');
        
        return { line, cart };
      } catch (error) {
        console.error('Cart add failed:', error);
        showNotification('Failed to add to cart. Please try again.', 'error');
        throw error;
      }
    },

    async change({ id, quantity }) {
      try {
        const payload = { 
          id: String(id), 
          quantity: parseInt(quantity, 10) || 0 
        };
        
        const cart = await fetchJSON('/cart/change.js', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        
        document.dispatchEvent(new CustomEvent('cart:changed', { 
          detail: { cart } 
        }));
        
        await WTFCart.refreshBadge(cart);
        
        return cart;
      } catch (error) {
        console.error('Cart change failed:', error);
        showNotification('Failed to update cart. Please try again.', 'error');
        throw error;
      }
    },

    async refreshBadge(cartMaybe) {
      try {
        const cart = cartMaybe || await WTFCart.get();
        const count = cart?.item_count ?? getLSBadge();
        setBadge(count);
        
        document.dispatchEvent(new CustomEvent('cart:refreshed', { 
          detail: cart 
        }));
        
        return count;
      } catch (error) {
        console.warn('Could not refresh cart badge:', error);
        // Fallback to localStorage value
        const count = getLSBadge();
        setBadge(count);
        return count;
      }
    },

    // Enhanced UI binding with better error handling
    bindUI(root = document) {
      // 1) Quick add buttons
      root.addEventListener('click', async (ev) => {
        const btn = ev.target.closest('[data-add-to-cart]');
        if (!btn || !ENABLE_AJAX) return;

        ev.preventDefault();
        
        const variantId = parseInt(btn.getAttribute('data-variant-id') || '0', 10);
        const qty = parseInt(btn.getAttribute('data-qty') || '1', 10);
        const properties = readButtonProps(btn);

        if (!variantId) {
          console.warn('WTF: Missing data-variant-id on quick add button.');
          showNotification('Invalid product selection', 'error');
          return;
        }

        const orig = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Adding…';
        
        try {
          await WTFCart.add({ id: variantId, quantity: qty, properties });
          btn.textContent = 'Added ✓';
          setTimeout(() => {
            btn.textContent = orig;
            btn.disabled = false;
          }, 1500);
        } catch (e) {
          btn.textContent = 'Error';
          setTimeout(() => {
            btn.textContent = orig;
            btn.disabled = false;
          }, 2000);
        }
      });

      // 2) Product forms
      root.addEventListener('submit', async (ev) => {
        const form = ev.target.closest('form[data-product-form]');
        if (!form || !ENABLE_AJAX) return;

        ev.preventDefault();
        
        const idInput = form.querySelector('input[name="id"], select[name="id"]');
        const qtyInput = form.querySelector('input[name="quantity"]');
        const sellingPlanInput = form.querySelector('input[name="selling_plan"]:checked, select[name="selling_plan"]');

        const id = parseInt(idInput?.value || '0', 10);
        const quantity = parseInt(qtyInput?.value || '1', 10);
        const properties = readFormProps(form);
        const selling_plan = sellingPlanInput?.value || null;

        if (!id) {
          showNotification('Please select a product variant', 'error');
          return;
        }

        const submitBtn = form.querySelector('[type="submit"], button:not([type])');
        const orig = submitBtn?.textContent;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Adding…';
        }

        try {
          await WTFCart.add({ id, quantity, properties, selling_plan });
          if (submitBtn) {
            submitBtn.textContent = 'Added ✓';
            setTimeout(() => {
              submitBtn.textContent = orig;
              submitBtn.disabled = false;
            }, 1500);
          }
        } catch (e) {
          if (submitBtn) {
            submitBtn.textContent = 'Error';
            setTimeout(() => {
              submitBtn.textContent = orig;
              submitBtn.disabled = false;
            }, 2000);
          }
        }
      });
    },

    init(opts = {}) {
      if (opts.onChange && typeof opts.onChange === 'function') {
        document.addEventListener('cart:refreshed', opts.onChange);
        document.addEventListener('cart:added', opts.onChange);
        document.addEventListener('cart:changed', opts.onChange);
      }

      // Show cached count immediately for better UX
      const cached = getLSBadge();
      setBadge(cached);

      // Then sync with server
      WTFCart.refreshBadge().catch(() => {
        console.warn('Initial cart sync failed, using cached count');
      });

      // Bind UI interactions
      WTFCart.bindUI(document);
    }
  };

  // Expose globally
  window.WTFCart = WTFCart;

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!window.__wtfCartInited) {
        WTFCart.init();
        window.__wtfCartInited = true;
      }
    });
  } else {
    // DOM already ready
    if (!window.__wtfCartInited) {
      WTFCart.init();
      window.__wtfCartInited = true;
    }
  }
})();

