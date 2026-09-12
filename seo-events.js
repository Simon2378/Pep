(function () {
  'use strict';

  if (window.location.protocol === 'file:') return;

  var VISITOR_KEY = 'pepticore_visitor_id';
  var SESSION_KEY = 'pepticore_session_id';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

  function randomId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return prefix + '_' + window.crypto.randomUUID();
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function stored(storage, key, prefix) {
    try {
      var value = storage.getItem(key);
      if (!value) {
        value = randomId(prefix);
        storage.setItem(key, value);
      }
      return value;
    } catch (error) {
      return randomId(prefix);
    }
  }

  function send(type, entityType, entityId, label, metadata) {
    var body = JSON.stringify({
      visitorId: stored(window.localStorage, VISITOR_KEY, 'v'),
      sessionId: stored(window.sessionStorage, SESSION_KEY, 's'),
      path: safePath(window.location),
      referrer: safeReferrer(document.referrer),
      events: [{
        type: type,
        entityType: entityType || '',
        entityId: entityId || '',
        label: label || '',
        value: '',
        durationMs: 0,
        metadata: metadata || {}
      }]
    });

    if (navigator.sendBeacon) {
      try {
        if (navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))) return;
      } catch (error) {}
    }

    fetch('/api/track', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: body,
      keepalive: true
    }).catch(function () {});
  }

  function safePath(location) {
    return location && location.pathname ? location.pathname : '/';
  }

  function safeReferrer(raw) {
    if (!raw) return '';
    try {
      var referrer = new URL(raw, window.location.origin);
      return referrer.origin + referrer.pathname;
    } catch (error) {
      return '';
    }
  }

  function campaignMetadata() {
    var metadata = {};
    try {
      var query = new URLSearchParams(window.location.search);
      UTM_KEYS.forEach(function (key) {
        var value = query.get(key);
        if (value) metadata[key] = value.slice(0, 120);
      });
    } catch (error) {}
    return metadata;
  }

  function metadataFromLink(link) {
    var destination = '';
    var metadata = campaignMetadata();
    try {
      destination = safePath(new URL(link.getAttribute('href') || '', window.location.origin));
    } catch (error) {}
    metadata.destination = destination;
    metadata.pageType = document.body.dataset.seoKind || 'content';
    return metadata;
  }

  window.pepticoreSeoTrack = function (type, entityType, entityId, label, metadata) {
    send(type, entityType, entityId, label, Object.assign({}, campaignMetadata(), metadata || {}));
  };

  function boot() {
    var body = document.body;
    var kind = body.dataset.seoKind || 'content';
    var entityId = body.dataset.seoId || window.location.pathname;
    var label = body.dataset.seoLabel || document.title;

    var pageMetadata = campaignMetadata();
    pageMetadata.pageType = kind;
    send('page_view', 'route', entityId, label, pageMetadata);
    if (kind === 'product' || kind === 'sku') send('product_view', kind, entityId, label, pageMetadata);
    if (kind === 'guide') send('guide_view', 'guide', entityId, label, pageMetadata);

    document.addEventListener('click', function (event) {
      var link = event.target.closest('[data-track-event]');
      if (!link) return;
      send(
        link.dataset.trackEvent,
        link.dataset.trackEntityType || kind,
        link.dataset.trackEntityId || entityId,
        link.dataset.trackLabel || link.textContent.trim(),
        metadataFromLink(link)
      );
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}());
