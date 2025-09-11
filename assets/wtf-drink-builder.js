/* assets/wtf-drink-builder.js
   Shared drink builder (Kratom/Kava/THC) + Shopify AJAX cart via WTF.addToCart
   Expects minimal HTML with data-* hooks (see page examples below).
*/
window.WTF = window.WTF || {};

(function () {
  const money = (n) => '$' + (Math.round(n * 100) / 100).toFixed(2);

  function attachBuilder(root, cfg) {
    const {
      variantId,                // numeric Shopify variant id
      sizes,                    // { "Medium":{price,includedPumps}, "Large":{price,includedPumps}, ... }
      extraPumpPrice,           // number, e.g. 0.5
      gallongMsg = 'Custom – discuss with staff',
      requireStrain = false     // Kratom requires strain, Kava/THC usually do not
    } = cfg;

    if (!variantId) {
      console.warn('Missing variantId for builder root:', root);
    }

    // DOM
    const $price = root.querySelector('[data-live-price]');
    const $add  = root.querySelector('[data-add]');
    const $qty  = root.querySelector('[data-qty]');
    const $comments = root.querySelector('[data-comments]');
    const $extraPumps = root.querySelector('[data-extra-pumps]');
    const $extraCost  = root.querySelector('[data-extra-cost]');
    const $pumpDist   = root.querySelector('[data-pump-dist]');

    // State
    let size = Object.keys(sizes)[0] || 'Medium';
    let strain = null;
    const flavors = new Set();
    let qty = Number($qty?.value || 1);
    let extraPumps = Number($extraPumps?.value || 0);

    // Helpers
    const unitBasePrice = () => (sizes[size]?.price || 0);
    const includedPumps = () => (sizes[size]?.includedPumps || 0);

    function calcUnitPrice() {
      return unitBasePrice() + extraPumps * extraPumpPrice;
    }

    function renderPrice() {
      if (!$price) return;
      const total = calcUnitPrice() * qty;
      $price.textContent = money(total);
      if ($add) $add.textContent = `Add to Cart — ${money(total)}`;
      if ($extraCost) $extraCost.textContent =
        extraPumps > 0 ? `(+${money(extraPumps * extraPumpPrice)})` : '';
    }

    function renderPumpDistribution() {
      if (!$pumpDist) return;
      const fs = Array.from(flavors);
      if (!fs.length) {
        $pumpDist.hidden = true;
        return;
      }
      const inc = includedPumps();
      if (!inc) {
        $pumpDist.innerHTML = `<strong>🎯 Pump Distribution:</strong> ${gallongMsg}`;
        $pumpDist.hidden = false;
        return;
      }
      let html = `<strong>🎯 Pump Distribution</strong><br>`;
      const per = Math.floor(inc / fs.length);
      const rem = inc % fs.length;
      fs.forEach((f, i) => {
        const pumps = per + (i < rem ? 1 : 0);
        html += `• ${f}: ${pumps} pump${pumps !== 1 ? 's' : ''}<br>`;
      });
      $pumpDist.innerHTML = html;
      $pumpDist.hidden = false;
    }

    function autoExtraPumps() {
      // Only charge for pumps beyond the included count
      // Users can also manually tweak using +/-; this only raises the floor.
      const inc = includedPumps();
      const needed = Math.max(0, flavors.size - inc);
      if (needed > extraPumps) {
        extraPumps = needed;
        if ($extraPumps) $extraPumps.value = extraPumps;
      }
    }

    function validate() {
      if (!variantId) {
        alert('This item is not available yet. Please set a Variant ID in theme settings or page metafield.');
        return false;
      }
      if (requireStrain && !strain) {
        alert('Please choose a strain.');
        return false;
      }
      if (!flavors.size) {
        alert('Please choose at least one flavor.');
        return false;
      }
      return true;
    }

    // Wire: sizes
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-size]');
      if (!btn) return;
      root.querySelectorAll('[data-size]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      size = btn.dataset.size;
      autoExtraPumps();
      renderPumpDistribution();
      renderPrice();
    });

    // Default select first size button
    const firstSize = root.querySelector('[data-size]');
    if (firstSize) firstSize.click();

    // Wire: strain
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-strain]');
      if (!btn) return;
      root.querySelectorAll('[data-strain]').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      strain = btn.dataset.strain;
    });

    // Wire: flavors
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-flavor]');
      if (!btn) return;
      const f = btn.dataset.flavor;
      if (btn.classList.contains('selected')) {
        btn.classList.remove('selected');
        flavors.delete(f);
      } else {
        btn.classList.add('selected');
        flavors.add(f);
      }
      autoExtraPumps();
      renderPumpDistribution();
      renderPrice();
    });

    // Qty
    root.addEventListener('click', (e) => {
      const dBtn = e.target.closest('[data-qty-delta]');
      if (!dBtn) return;
      const d = Number(dBtn.dataset.qtyDelta);
      qty = Math.max(1, qty + d);
      if ($qty) $qty.value = qty;
      renderPrice();
    });
    $qty?.addEventListener('input', () => {
      qty = Math.max(1, Number($qty.value) || 1);
      renderPrice();
    });

    // Extra pumps
    root.addEventListener('click', (e) => {
      const pBtn = e.target.closest('[data-extra-delta]');
      if (!pBtn) return;
      const d = Number(pBtn.dataset.extraDelta);
      extraPumps = Math.max(0, extraPumps + d);
      if ($extraPumps) $extraPumps.value = extraPumps;
      renderPrice();
    });
    $extraPumps?.addEventListener('input', () => {
      extraPumps = Math.max(0, Number($extraPumps.value) || 0);
      renderPrice();
    });

    // Add to cart
    $add?.addEventListener('click', async () => {
      if (!validate()) return;
      const props = {
        Size: size,
        Flavors: Array.from(flavors).join(', '),
        'Extra Pumps': String(extraPumps),
        'Pump Distribution': ($pumpDist?.innerText || ''),
      };
      if ($comments?.value?.trim()) props.Comments = $comments.value.trim();
      if (requireStrain && strain) props.Strain = strain;

      // Button state
      const old = $add.textContent;
      $add.disabled = true;
      $add.textContent = 'Adding…';
      try {
        await WTF.addToCart({ id: variantId, quantity: qty, properties: props });
        document.dispatchEvent(new CustomEvent('wtf:toast', { detail: { msg: 'Added to cart!' } }));
      } catch (err) {
        console.error(err);
        alert('Add to cart failed.');
      } finally {
        $add.disabled = false;
        $add.textContent = old;
        renderPrice();
      }
    });

    // Initial render
    renderPumpDistribution();
    renderPrice();
  }

  // Public API
  window.WTFDrinkBuilder = {
    init(selector, config) {
      document.querySelectorAll(selector).forEach((root) => attachBuilder(root, config));
    }
  };
})();