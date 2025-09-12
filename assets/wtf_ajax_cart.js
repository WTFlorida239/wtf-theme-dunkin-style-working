/* WTF AJAX Cart Core — production build (vanilla JS)
 * - Resolves product JSON from window.WTF_PRODUCT_JSON or /products/{handle}.js
 * - Maps selected options (e.g., Flavor) to a variant id
 * - Updates price display when selection changes
 * - Submits /cart/add.js via fetch; updates cart count; emits events
 * - Works on product templates and plain pages with forms marked data-wtf-ajax
 */

(function(){
  'use strict';

  var STORAGE_KEY = 'wtf_variant_state_' + location.pathname;

  function $(sel, ctx){ return (ctx||document).querySelector(sel); }
  function $all(sel, ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(sel)); }

  function money(cents){
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents, Shopify.money_format || '${{amount}}');
    }
    return '$' + (cents/100).toFixed(2);
  }

  function readState(){
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch(e){ return {}; }
  }
  function writeState(s){
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s || {})); } catch(e){}
  }

  function getSelectedOptions(){
    var state = readState();
    // read current selection from chips
    $all('.wtf-flavor-chip.is-selected').forEach(function(chip){
      state[chip.dataset.option] = chip.dataset.value;
    });
    return state; // e.g., { Flavor: 'mango', Size: 'Large' }
  }

  function onOptionSelected(detail){
    var state = readState();
    state[detail.option] = detail.value;
    writeState(state);
    // attempt to update hidden id + price
    resolveProduct().then(function(p){
      var variant = pickVariant(p, state);
      if (variant) {
        var idInput = document.querySelector('form[data-wtf-ajax] input[name="id"]');
        if (idInput) idInput.value = variant.id;
        updatePrice(variant);
      }
    }).catch(function(){ /* silent */ });
  }

  function resolveProduct(){
    if (window.WTF_PRODUCT_JSON && window.WTF_PRODUCT_JSON.variants) {
      return Promise.resolve(window.WTF_PRODUCT_JSON);
    }
    if (window.WTF_PRODUCT_HANDLE) {
      return fetch('/products/' + encodeURIComponent(window.WTF_PRODUCT_HANDLE) + '.js', { credentials: 'same-origin' })
        .then(function(r){ 
          if (!r.ok) {
            throw new Error('Product not found: ' + window.WTF_PRODUCT_HANDLE);
          }
          return r.json(); 
        })
        .catch(function(err){
          console.warn('Product fetch failed:', err.message);
          // Return a fallback product structure for custom products
          return createFallbackProduct();
        });
    }
    // Try to sniff product JSON if Liquid embedded it:
    try {
      if (window.__PRODUCT_JSON__) return Promise.resolve(window.__PRODUCT_JSON__);
    } catch(e){}
    return Promise.reject(new Error('No product data available'));
  }

  function createFallbackProduct(){
    // Create a basic product structure for custom drinks
    return {
      id: 'custom-product',
      title: 'Custom Drink',
      handle: window.WTF_PRODUCT_HANDLE || 'custom-drink',
      options: ['Size', 'Flavor'],
      variants: [
        { id: 'custom-medium', option1: 'Medium', option2: '', price: 900, available: true },
        { id: 'custom-large', option1: 'Large', option2: '', price: 1500, available: true },
        { id: 'custom-gallon', option1: 'Gallon', option2: '', price: 10000, available: true }
      ]
    };
  }

  function pickVariant(product, optionState){
    // Build array of option values in Shopify’s order (option1, option2, option3)
    // We match by product.options[i] name → optionState[name]
    var optNames = product.options || []; // e.g., ["Flavor","Size"]
    function matches(v){
      for (var i=0;i<optNames.length;i++){
        var name = optNames[i];
        var want = (optionState[name] || '').trim().toLowerCase();
        if (!want) continue; // allow partial selection
        var have = (v['option' + (i+1)] || '').trim().toLowerCase();
        if (want !== have) return false;
      }
      return true;
    }
    // Prefer first in-stock variant that matches; fallback to any match
    var match = product.variants.find(function(v){ return matches(v) && v.available; }) ||
                product.variants.find(function(v){ return matches(v); });
    return match || null;
  }

  function updatePrice(variant){
    var priceEl = document.querySelector('[data-price]');
    if (!priceEl || !variant) return;
    priceEl.style.opacity = '0.6';
    priceEl.textContent = money(variant.price);
    // tiny feedback
    requestAnimationFrame(function(){ priceEl.style.opacity = '1'; });
  }

  function updateCartCount(){
    return fetch('/cart.js', { credentials: 'same-origin' })
      .then(function(r){ return r.json(); })
      .then(function(cart){
        // Update all cart count elements
        $all('[data-cart-count], .cart-count, #cart-count, #CartCount').forEach(function(el){
          el.textContent = cart.item_count;
        });
        
        // Update cart link text if it exists
        var cartLink = document.querySelector('.header-cart-link__label');
        if (cartLink) {
          cartLink.textContent = cart.item_count > 0 ? 'Cart (' + cart.item_count + ')' : 'Cart';
        }
        
        document.dispatchEvent(new CustomEvent('wtf:cartUpdated', { detail: cart }));
        return cart;
      })
      .catch(function(err){ 
        console.warn('Failed to update cart count:', err);
        return null;
      });
  }

  function attachFormHandler(){
    $all('form[data-wtf-ajax]').forEach(function(form){
      if (form.__wtfBound) return;
      form.__wtfBound = true;

      form.addEventListener('submit', function(e){
        e.preventDefault();

        var fd = new FormData(form);
        var id = fd.get('id');
        var qty = parseInt(fd.get('quantity') || '1', 10);

        function addWith(variantId){
          if (!variantId) { console.warn('No variant id resolved'); return; }
          var payload = { items: [{ id: Number(variantId), quantity: qty }] };
          form.querySelector('button[type="submit"]')?.setAttribute('disabled','disabled');

          fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(payload)
          })
          .then(function(r){ return r.json(); })
          .then(function(_item){
            return updateCartCount();
          })
          .then(function(cart){
            form.querySelector('button[type="submit"]')?.removeAttribute('disabled');
            document.dispatchEvent(new CustomEvent('wtf:itemAdded', { detail: { cart: cart } }));
            // If you have a cart drawer, open it here by listening to wtf:itemAdded
          })
          .catch(function(err){
            form.querySelector('button[type="submit"]')?.removeAttribute('disabled');
            console.error('Add to cart failed', err);
            alert('Could not add to cart. Please try again.');
          });
        }

        if (id) return addWith(id);

        // No id yet → resolve from current options & product JSON
        var selection = getSelectedOptions();
        resolveProduct().then(function(p){
          var v = pickVariant(p, selection);
          addWith(v && v.id);
        }).catch(function(){
          alert('Please select options before adding to cart.');
        });
      });
    });
  }

  function init(){
    // Prime state from any pre-selected chips on load
    var chip = document.querySelector('.wtf-flavor-chip.is-selected');
    if (chip) onOptionSelected({ option: chip.dataset.option, value: chip.dataset.value });

    // Listen for flavor selections
    document.addEventListener('wtf:optionSelectedGlobal', function(e){ onOptionSelected(e.detail); });

    // Resolve product and set initial variant/price if possible
    resolveProduct().then(function(p){
      var v = pickVariant(p, readState());
      if (v) {
        var idInput = document.querySelector('form[data-wtf-ajax] input[name="id"]');
        if (idInput) idInput.value = v.id;
        updatePrice(v);
      }
    }).catch(function(){ /* ignore */ });

    attachFormHandler();
    updateCartCount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();