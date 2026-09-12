(function () {
  'use strict';

  var CART_STORAGE_KEY = 'pepticore_cart_items';
  var MIN_ORDER = 100;

  function readCart() {
    try {
      var raw = window.localStorage ? localStorage.getItem(CART_STORAGE_KEY) : '';
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(function (item) {
        return item && item.catId && item.seriesId && item.sku;
      }) : [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(items) {
    try {
      if (window.localStorage) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
  }

  function cartItemKey(item) {
    return item.catId + '|' + item.seriesId + '|' + item.sku;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cartTotal(items) {
    return items.reduce(function (sum, item) { return sum + (Number(item.price) || 0); }, 0);
  }

  function cartMessage(items) {
    var lines = items.map(function (item, i) {
      return (i + 1) + '. ' + item.seriesName + ' — ' + item.sku + ' — ' + item.spec + ' — $' + item.price;
    });
    return 'Hello PeptiCore, I would like to order these products:\n\n' + lines.join('\n');
  }

  function pickWaHref() {
    var accounts = window.WA_ACCOUNTS;
    if (Array.isArray(accounts) && accounts.length) {
      return accounts[Math.floor(Math.random() * accounts.length)].href;
    }
    return window.WA_HREF || 'https://wa.me/';
  }

  function waLink(message) {
    return pickWaHref() + '?text=' + encodeURIComponent(message);
  }

  function addItem(data) {
    var items = readCart();
    var item = {
      catId: data.catId,
      seriesId: data.seriesId,
      categoryName: data.categoryName,
      seriesName: data.seriesName,
      sku: data.sku,
      spec: data.spec,
      price: Number(data.price) || 0
    };
    var key = cartItemKey(item);
    var exists = items.some(function (i) { return cartItemKey(i) === key; });
    if (!exists) {
      items.push(item);
      writeCart(items);
    }
    renderBar();
    return !exists;
  }

  function removeItem(key) {
    var items = readCart().filter(function (item) { return cartItemKey(item) !== key; });
    writeCart(items);
    renderBar();
  }

  function clearItems() {
    writeCart([]);
    renderBar();
  }

  // ------------------------ floating bar UI ------------------------
  var bar, summaryEl, panelEl, panelOpen = false;

  function buildBar() {
    bar = document.createElement('div');
    bar.className = 'pepticore-cart-bar';
    bar.id = 'pepticoreCartBar';
    bar.hidden = true;
    bar.innerHTML =
      '<div class="pepticore-cart-summary" id="pepticoreCartSummary">' +
        '<div class="pepticore-cart-info">' +
          '<span class="pepticore-cart-count" id="pepticoreCartCount">0</span>' +
          '<span class="pepticore-cart-subtotal" id="pepticoreCartSubtotal">$0</span>' +
          '<span class="pepticore-cart-note" id="pepticoreCartNote"></span>' +
        '</div>' +
        '<a class="pepticore-cart-cta is-disabled" id="pepticoreCartCta" href="#" target="_blank" rel="noopener noreferrer">Order via WhatsApp</a>' +
      '</div>' +
      '<div class="pepticore-cart-panel" id="pepticoreCartPanel" hidden></div>';
    document.body.appendChild(bar);
    summaryEl = bar.querySelector('#pepticoreCartSummary');
    panelEl = bar.querySelector('#pepticoreCartPanel');
    summaryEl.addEventListener('click', function (e) {
      if (e.target.closest('#pepticoreCartCta')) return;
      panelOpen = !panelOpen;
      panelEl.hidden = !panelOpen;
    });
    panelEl.addEventListener('click', function (e) {
      var removeBtn = e.target.closest('[data-remove-key]');
      if (removeBtn) {
        e.preventDefault();
        removeItem(removeBtn.getAttribute('data-remove-key'));
        return;
      }
      if (e.target.closest('[data-clear-cart]')) {
        e.preventDefault();
        clearItems();
      }
    });
  }

  function renderBar() {
    if (!bar) buildBar();
    var items = readCart();
    var count = items.length;
    var total = cartTotal(items);

    bar.hidden = count === 0;
    if (!count) return;

    bar.querySelector('#pepticoreCartCount').textContent = String(count);
    bar.querySelector('#pepticoreCartSubtotal').textContent = '$' + total;

    var noteEl = bar.querySelector('#pepticoreCartNote');
    var ctaEl = bar.querySelector('#pepticoreCartCta');
    if (total < MIN_ORDER) {
      noteEl.textContent = 'Add $' + (MIN_ORDER - total) + ' more to reach the $' + MIN_ORDER + ' minimum order';
      ctaEl.className = 'pepticore-cart-cta is-disabled';
      ctaEl.href = '#';
      ctaEl.addEventListener('click', preventIfDisabled);
    } else {
      noteEl.textContent = '';
      ctaEl.className = 'pepticore-cart-cta is-enabled';
      ctaEl.href = waLink(cartMessage(items));
      ctaEl.removeEventListener('click', preventIfDisabled);
    }

    panelEl.innerHTML = items.map(function (item) {
      return '' +
        '<div class="pepticore-cart-row">' +
          '<div>' +
            '<div class="pepticore-cart-row-name">' + esc(item.seriesName) + '</div>' +
            '<div class="pepticore-cart-row-meta">' + esc(item.sku) + ' · ' + esc(item.spec) + ' · $' + esc(item.price) + '</div>' +
          '</div>' +
          '<button type="button" class="pepticore-cart-row-remove" data-remove-key="' + esc(cartItemKey(item)) + '">Remove</button>' +
        '</div>';
    }).join('') + '<button type="button" class="pepticore-cart-clear" data-clear-cart>Clear all</button>';
  }

  function preventIfDisabled(e) { e.preventDefault(); }

  // ------------------------ add-to-cart buttons ------------------------
  function bindButtons() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-add-to-cart]');
      if (!btn) return;
      e.preventDefault();
      var data = {
        catId: btn.getAttribute('data-cat-id'),
        categoryName: btn.getAttribute('data-category-name'),
        seriesId: btn.getAttribute('data-series-id'),
        seriesName: btn.getAttribute('data-series-name'),
        sku: btn.getAttribute('data-sku'),
        spec: btn.getAttribute('data-spec'),
        price: btn.getAttribute('data-price')
      };
      var added = addItem(data);
      var label = btn.querySelector('.cart-btn-label');
      if (label) {
        var original = label.textContent;
        label.textContent = added ? 'Added ✓' : 'Already in cart';
        btn.classList.add('is-added');
        setTimeout(function () {
          label.textContent = original;
          btn.classList.remove('is-added');
        }, 1400);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindButtons();
    renderBar();
  });
})();
