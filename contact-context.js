(function () {
  'use strict';

  var SALES_ROUTE_STORAGE_KEY = 'pepticore_sales_route';

  function value(params, name, maxLength) {
    return (params.get(name) || '').trim().slice(0, maxLength);
  }

  function safeCatalogPath(raw) {
    return /^\/#\/c\/[a-z0-9-]+\/s\/[a-z0-9-]+$/.test(raw) ? raw : '/';
  }

  function copyFallback(text) {
    var input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }
    input.remove();
    return copied;
  }

  function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () {
        return copyFallback(text);
      });
    }
    return Promise.resolve(copyFallback(text));
  }

  function storedSalesCode() {
    try {
      var raw = window.localStorage && localStorage.getItem(SALES_ROUTE_STORAGE_KEY);
      var route = raw ? JSON.parse(raw) : null;
      if (!route || !route.salesCode || !route.expiresAt) return '';
      if (new Date(route.expiresAt).getTime() <= Date.now()) return '';
      var code = String(route.salesCode).trim().toLowerCase();
      return /^[a-z0-9][a-z0-9-]{0,10}[a-z0-9]$/.test(code) ? code : '';
    } catch (error) {
      return '';
    }
  }

  function safeWhatsappUrl(raw, message) {
    try {
      var url = new URL(String(raw || ''));
      if (url.protocol !== 'https:' || !/^(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)$/.test(url.hostname)) return '';
      url.searchParams.set('text', message);
      return url.toString();
    } catch (error) {
      return '';
    }
  }

  function resolveWhatsappRoute() {
    // A direct Contact visit has no referral attribution. Ask the existing
    // resolver for the configured default instead of sending an empty code.
    var code = storedSalesCode() || 'default';
    return fetch('/api/whatsapp-routing?code=' + encodeURIComponent(code), {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    }).then(function (response) {
      if (!response.ok) throw new Error('route_unavailable');
      return response.json();
    }).then(function (payload) {
      var base = payload && (payload.waUrl || (payload.account && payload.account.href));
      if (!base) throw new Error('route_unavailable');
      return {
        base: base,
        displayName: String(payload.displayName || (payload.account && payload.account.displayName) || 'PeptiCore').trim().slice(0, 80),
        salesCode: String(payload.salesCode || code || 'default').trim().slice(0, 20)
      };
    });
  }

  function inquiryMessage(details, route) {
    return [
      'Hello ' + (route.displayName || 'PeptiCore') + ',',
      '',
      'I would like a research-use catalog quote.',
      details.series ? 'Product series: ' + details.series : '',
      details.sku ? 'SKU: ' + details.sku : '',
      details.specification ? 'Specification: ' + details.specification : '',
      details.price ? 'Starting price reference: $' + details.price + ' USD' : '',
      'Please confirm the final quote and available documentation.',
      'Research use only. Not for human consumption.',
      'Sales route: ' + route.salesCode
    ].filter(Boolean).join('\n');
  }

  function track(type, entityType, entityId, label, metadata) {
    if (typeof window.pepticoreSeoTrack !== 'function') return;
    window.pepticoreSeoTrack(type, entityType, entityId, label, metadata || {});
  }

  function trackContextStart(details) {
    var entityId = details.sku || details.series;
    if (!entityId) return;
    var key = 'pepticore_quote_context_started:' + entityId;
    try {
      if (window.sessionStorage && sessionStorage.getItem(key)) return;
      if (window.sessionStorage) sessionStorage.setItem(key, '1');
    } catch (error) {}
    track('quote_started', 'inquiry', entityId, 'Catalog inquiry context started', { hasSku: !!details.sku });
  }

  function prepareWhatsappLinks(details) {
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-inquiry-whatsapp]'));
    var status = document.querySelector('[data-inquiry-route-status]');
    links.forEach(function (link) {
      link.addEventListener('click', function (event) {
        if (link.getAttribute('aria-disabled') === 'true') event.preventDefault();
      });
    });
    if (!links.length) return;

    resolveWhatsappRoute().then(function (route) {
      var href = safeWhatsappUrl(route.base, inquiryMessage(details, route));
      if (!href) throw new Error('route_unavailable');
      links.forEach(function (link) {
        link.setAttribute('href', href);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.setAttribute('aria-disabled', 'false');
        link.setAttribute('data-track-event', 'whatsapp_redirect');
        link.setAttribute('data-track-entity-type', 'inquiry');
        link.setAttribute('data-track-entity-id', details.sku || details.series || 'catalog-inquiry');
        link.setAttribute('data-track-label', details.sku || details.series || 'Catalog WhatsApp inquiry');
      });
      if (status) status.textContent = 'WhatsApp inquiry is ready. Final quote is confirmed by PeptiCore sales.';
    }).catch(function () {
      links.forEach(function (link) {
        link.setAttribute('aria-disabled', 'true');
      });
      if (status) status.textContent = 'WhatsApp routing is temporarily unavailable. Browse the catalog and try again shortly.';
    });
  }

  function boot() {
    var panel = document.querySelector('[data-inquiry-context]');
    var params = new URLSearchParams(window.location.search);
    var details = {
      series: value(params, 'series', 100),
      sku: value(params, 'sku', 40),
      specification: value(params, 'specification', 80),
      price: value(params, 'price', 20)
    };
    if (!/^\d+(?:\.\d{1,2})?$/.test(details.price)) details.price = '';
    prepareWhatsappLinks(details);
    if (!panel || (!details.series && !details.sku)) return;

    trackContextStart(details);

    Object.keys(details).forEach(function (name) {
      var field = panel.querySelector('[data-inquiry-field="' + name + '"]');
      var output = panel.querySelector('[data-inquiry-value="' + name + '"]');
      if (!field || !output) return;
      if (!details[name]) {
        field.hidden = true;
        return;
      }
      output.textContent = name === 'price' ? '$' + details[name] + ' USD starting price' : details[name];
    });

    var catalogLink = panel.querySelector('[data-inquiry-catalog-link]');
    if (catalogLink) catalogLink.setAttribute('href', safeCatalogPath(value(params, 'catalog_path', 160)));

    var reference = [
      details.series ? 'Product series: ' + details.series : '',
      details.sku ? 'SKU: ' + details.sku : '',
      details.specification ? 'Specification: ' + details.specification : '',
      details.price ? 'Starting price: $' + details.price + ' USD' : '',
      'Research use only.'
    ].filter(Boolean).join('\n');

    var button = panel.querySelector('[data-inquiry-copy]');
    var status = panel.querySelector('[data-inquiry-status]');
    if (button) {
      button.addEventListener('click', function () {
        button.disabled = true;
        copyText(reference).then(function (copied) {
          if (status) status.textContent = copied ? 'Inquiry reference copied.' : 'Copy failed. Select the catalog details above and copy them manually.';
          button.textContent = copied ? 'Copied' : 'Copy inquiry reference';
        }).finally(function () {
          button.disabled = false;
        });
      });
    }

    panel.hidden = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}());
