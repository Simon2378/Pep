(function () {
  'use strict';

  var DATA = window.PEPTICORE_DATA;
  var STORIES = window.PEPTICORE_STORIES || { categories: {}, featured: [] };
  var COAS = window.PEPTICORE_COAS || {};
  var WA_ACCOUNTS = window.WA_ACCOUNTS || [];
  var WA = window.WA_HREF;
  var WA_STORAGE_KEY = 'pepticore_wa_account_id';
  var WA_POOL_STORAGE_KEY = 'pepticore_wa_account_pool';
  var WA_FORCED_SLUG_KEY = 'pepticore_wa_forced_slug';
  var WA_ASSIGNMENT_MODE_KEY = 'pepticore_wa_assignment_mode';
  var SALES_ROUTE_STORAGE_KEY = 'pepticore_sales_route';
  var SALES_ROUTE_TTL_DAYS = 30;
  var CART_STORAGE_KEY = 'pepticore_cart_items';
  var MIN_ORDER = 100;
  function gbpPrice(usd) { return Math.round(Number(usd) * 0.79) + 2; }
  var VISITOR_STORAGE_KEY = 'pepticore_visitor_id';
  var SESSION_STORAGE_KEY = 'pepticore_session_id';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  var trackQueue = [];
  var trackTimer = null;
  var lastTrackedSearch = '';
  var lockedScrollY = 0;
  var overlayTouchY = 0;

  function redirectLegacyCoaAssetRoute() {
    if (!window.location || !window.history) return;
    if (!/^\/assets\/coa\/[^?#]+\.(?:jpe?g|png)$/i.test(window.location.pathname)) return;
    window.history.replaceState(null, '', window.location.origin + '/#/');
  }

  redirectLegacyCoaAssetRoute();

  // totals
  var totalSeries = 0;
  var totalSkus = 0;
  DATA.forEach(function (c) {
    totalSeries += c.series.length;
    c.series.forEach(function (s) { totalSkus += s.skus.length; });
  });

  // ------------------------ DOM refs ------------------------
  var view = document.getElementById('view');
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('backdrop');
  var menuBtn = document.getElementById('menuBtn');
  var closeSideBtn = document.getElementById('closeSide');
  var brandBtn = document.getElementById('brandBtn');
  var navWa = document.getElementById('navWa');
  var footWa = document.getElementById('footWa');
  var openSearch = document.getElementById('openSearch');
  var openCart = document.getElementById('openCart');
  var closeCart = document.getElementById('closeCart');
  var cartOverlay = document.getElementById('cartOverlay');
  var cartBody = document.getElementById('cartBody');
  var cartCount = document.getElementById('cartCount');
  var clearCart = document.getElementById('clearCart');
  var sendCart = document.getElementById('sendCart');
  var cartMinNote = document.getElementById('cartMinNote');
  var coaOverlay = document.getElementById('coaOverlay');
  var coaBody = document.getElementById('coaBody');
  var coaTitle = document.getElementById('coaTitle');
  var coaSub = document.getElementById('coaSub');
  var closeCoa = document.getElementById('closeCoa');
  var closeSearch = document.getElementById('closeSearch');
  var searchOverlay = document.getElementById('searchOverlay');
  var searchInput = document.getElementById('searchInput');
  var searchResults = document.getElementById('searchResults');
  var sideNav = document.getElementById('sideNav');
  var sideSearch = document.getElementById('sideSearch');
  var sideAccount = document.getElementById('sideAccount');
  var catCount = document.getElementById('catCount');
  var seriesCount = document.getElementById('seriesCount');
  var skuCount = document.getElementById('skuCount');
  var footCats = document.getElementById('footCats');
  var motionMedia = null;
  if (window.gsap) document.documentElement.classList.add('has-gsap-motion');
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  // ------------------------ helpers ------------------------
  function hasOpenOverlay() {
    return document.body.dataset.side === 'open'
      || document.body.dataset.search === 'open'
      || document.body.dataset.cart === 'open'
      || document.body.dataset.coa === 'open'
      || document.body.dataset.coaZoom === 'open'
      || document.body.dataset.house === 'open'
      || document.body.dataset.member === 'open';
  }

  function lockPageScroll() {
    if (document.body.dataset.scrollLocked === 'true') return;
    lockedScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    document.documentElement.dataset.scrollLocked = 'true';
    document.documentElement.style.overflow = 'hidden';
    document.body.dataset.scrollLocked = 'true';
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + lockedScrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';
  }

  function unlockPageScroll() {
    if (document.body.dataset.scrollLocked !== 'true') return;
    var y = lockedScrollY;
    delete document.documentElement.dataset.scrollLocked;
    document.documentElement.style.overflow = '';
    delete document.body.dataset.scrollLocked;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    window.scrollTo(0, y);
  }

  function syncPageScrollLock() {
    if (hasOpenOverlay()) lockPageScroll();
    else unlockPageScroll();
  }

  window.PeptidesPrescriptsModalSync = syncPageScrollLock;

  function normalizeOverlayState() {
    [
      ['side', sidebar],
      ['search', searchOverlay],
      ['cart', cartOverlay],
      ['coa', coaOverlay],
      ['house', document.getElementById('houseOverlay')]
    ].forEach(function (entry) {
      var key = entry[0];
      var el = entry[1];
      if (document.body.dataset[key] !== 'open') {
        if (el) el.setAttribute('aria-hidden', 'true');
        return;
      }
      if (!el || el.getAttribute('aria-hidden') === 'true') {
        delete document.body.dataset[key];
      }
    });

    var zoom = document.getElementById('coaZoomOverlay');
    if (document.body.dataset.coaZoom === 'open' && (!zoom || zoom.getAttribute('aria-hidden') === 'true')) {
      delete document.body.dataset.coaZoom;
    } else if (document.body.dataset.coaZoom !== 'open' && zoom) {
      zoom.setAttribute('aria-hidden', 'true');
    }

    if (document.body.dataset.member === 'open') {
      var memberOverlay = document.getElementById('memberOverlay');
      if (!memberOverlay || memberOverlay.getAttribute('aria-hidden') === 'true') {
        delete document.body.dataset.member;
      }
    }

    syncPageScrollLock();
    if (!hasOpenOverlay() && document.body.dataset.scrollLocked !== 'true') {
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }

  window.addEventListener('pageshow', normalizeOverlayState);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') normalizeOverlayState();
  });

  function resetRouteScroll() {
    lockedScrollY = 0;
    if (document.body.dataset.scrollLocked === 'true') document.body.style.top = '0';
    forceRouteScrollTop();
    window.requestAnimationFrame(forceRouteScrollTop);
    [80, 240, 600].forEach(function (delay) {
      window.setTimeout(forceRouteScrollTop, delay);
    });
  }

  function forceRouteScrollTop() {
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (view) view.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function assetPath(src) {
    if (!src) return '';
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|data:|blob:)/i.test(src)) return src;
    return '/' + String(src).replace(/^\/+/, '');
  }

  function runAfterDownload(link, blobUrl) {
    window.setTimeout(function () {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      if (link && link.parentNode) link.remove();
    }, 1200);
  }

  function triggerDownloadUrl(href, downloadName) {
    var a = document.createElement('a');
    a.href = href;
    if (downloadName) a.download = downloadName;
    a.rel = 'noopener';
    a.style.position = 'fixed';
    a.style.left = '-9999px';
    document.body.appendChild(a);
    a.click();
    runAfterDownload(a, /^blob:/i.test(href) ? href : '');
  }

  function fetchAndDownload(href, downloadName) {
    if (!window.fetch || !window.URL || !URL.createObjectURL) {
      triggerDownloadUrl(href, downloadName);
      return;
    }
    fetch(href, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('COA download failed: ' + response.status);
        return response.blob();
      })
      .then(function (blob) {
        triggerDownloadUrl(URL.createObjectURL(blob), downloadName);
      })
      .catch(function () {
        triggerDownloadUrl(href, downloadName);
      });
  }

  function scrollCoaCardIntoView(card) {
    if (!card || !coaBody) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var top = Math.max(0, card.offsetTop - coaBody.offsetTop - 12);
    coaBody.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
  }

  function isScrollBoundary(scroller, deltaY) {
    if (!scroller) return true;
    if (scroller.scrollHeight <= scroller.clientHeight + 1) return true;
    if (deltaY < 0 && scroller.scrollTop <= 0) return true;
    if (deltaY > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1) return true;
    return false;
  }

  function getStoredWaAccountId() {
    try {
      return window.localStorage ? localStorage.getItem(WA_STORAGE_KEY) : null;
    } catch (e) {
      return null;
    }
  }
  function setStoredWaAccountId(id) {
    try {
      if (window.localStorage) localStorage.setItem(WA_STORAGE_KEY, id);
    } catch (e) {}
  }
  function getWaPoolSignature() {
    return WA_ACCOUNTS.map(function (account) {
      return [account.id || '', account.href || ''].join(':');
    }).join('|');
  }
  function getStoredWaPoolSignature() {
    try {
      return window.localStorage ? localStorage.getItem(WA_POOL_STORAGE_KEY) : null;
    } catch (e) {
      return null;
    }
  }
  function setStoredWaPoolSignature(signature) {
    try {
      if (window.localStorage) localStorage.setItem(WA_POOL_STORAGE_KEY, signature);
    } catch (e) {}
  }
  function storageGet(key) {
    try {
      return window.localStorage ? localStorage.getItem(key) : '';
    } catch (e) {
      return '';
    }
  }
  function storageSet(key, value) {
    try {
      if (window.localStorage) localStorage.setItem(key, value);
    } catch (e) {}
  }
  function storageRemove(key) {
    try {
      if (window.localStorage) localStorage.removeItem(key);
    } catch (e) {}
  }
  function sessionGet(key) {
    try {
      return window.sessionStorage ? sessionStorage.getItem(key) : '';
    } catch (e) {
      return '';
    }
  }
  function sessionSet(key, value) {
    try {
      if (window.sessionStorage) sessionStorage.setItem(key, value);
    } catch (e) {}
  }
  function randomId(prefix) {
    var value = '';
    try {
      value = crypto && crypto.randomUUID ? crypto.randomUUID() : '';
    } catch (e) {}
    if (!value) value = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    return prefix + '-' + value;
  }
  function cleanWaSlug(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 80);
  }
  function cleanSalesCode(value) {
    var code = String(value || '').trim().toLowerCase();
    return /^[a-z0-9][a-z0-9-]{0,10}[a-z0-9]$/.test(code) ? code : '';
  }
  function salesRouteFromLocation() {
    var pathMatch = window.location.pathname.match(/^\/r\/([^/?#]+)/);
    return pathMatch ? cleanSalesCode(pathMatch[1]) : '';
  }
  function replaceSalesRoutePath() {
    if (!/^\/r\/[^/?#]+/.test(window.location.pathname) || !window.history || !window.location) return;
    var next = window.location.origin + '/' + (window.location.search || '') + (window.location.hash || '');
    window.history.replaceState(null, '', next);
  }
  function storedSalesRoute() {
    try {
      if (!window.localStorage) return null;
      var parsed = JSON.parse(localStorage.getItem(SALES_ROUTE_STORAGE_KEY) || 'null');
      if (!parsed || !parsed.salesCode || !parsed.expiresAt) return null;
      if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem(SALES_ROUTE_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }
  function rememberSalesRoute(account, sourceCode) {
    if (!account || !account.href) return;
    var code = cleanSalesCode(sourceCode || account.salesCode || account.sales_code || account.slug || account.id);
    if (!code) return;
    var capturedAt = new Date();
    var expiresAt = new Date(capturedAt.getTime() + SALES_ROUTE_TTL_DAYS * 24 * 60 * 60 * 1000);
    storageSet(SALES_ROUTE_STORAGE_KEY, JSON.stringify({
      salesCode: code,
      whatsappAccountId: account.id || account.slug || '',
      capturedAt: capturedAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    }));
    storageRemove(WA_FORCED_SLUG_KEY);
    rememberWaAccount(account, 'sales_route');
  }
  function salesRouteAccount() {
    var route = storedSalesRoute();
    return route && route.salesCode ? findWaAccount(route.salesCode) : null;
  }
  function salesRouteCode() {
    var route = storedSalesRoute();
    return route && route.salesCode ? route.salesCode : 'default';
  }
  function waDisplayName(account) {
    var name = String(account && (account.label || account.displayName || account.display_name || account.name || '') || '').trim();
    if (name) return name;
    var code = cleanSalesCode(account && (account.salesCode || account.sales_code || ''));
    return code || 'PeptidesPrescripts';
  }
  function withWaGreeting(message, account) {
    var text = String(message || '');
    if (!text) return text;
    var greeting = 'Hello ' + waDisplayName(account) + ',';
    if (/^Hello\s+[^,\n]+,/i.test(text)) return text.replace(/^Hello\s+[^,\n]+,/i, greeting);
    return greeting + '\n\n' + text;
  }
  function appendSalesRouteToMessage(message) {
    var text = String(message || '');
    if (!text || /(?:^|\n)Sales route:/i.test(text)) return text;
    return text + '\nSales route: ' + salesRouteCode();
  }
  function forcedWaSlugFromLocation() {
    var fromQuery = '';
    try {
      fromQuery = new URL(window.location.href).searchParams.get('wa') || '';
    } catch (e) {}
    if (fromQuery) return cleanWaSlug(fromQuery);
    var pathMatch = window.location.pathname.match(/^\/w\/([^/?#]+)/);
    if (pathMatch) return cleanWaSlug(pathMatch[1]);
    var hashMatch = window.location.hash.match(/^#\/?w\/([^/?#]+)/);
    if (hashMatch) return cleanWaSlug(hashMatch[1]);
    return '';
  }
  function findWaAccount(id) {
    id = cleanWaSlug(id);
    for (var i = 0; i < WA_ACCOUNTS.length; i++) {
      var account = WA_ACCOUNTS[i] || {};
      if ((cleanWaSlug(account.id) === id ||
        cleanWaSlug(account.salesCode) === id ||
        cleanWaSlug(account.sales_code) === id ||
        cleanWaSlug(account.legacySlug) === id ||
        cleanWaSlug(account.legacy_slug) === id ||
        cleanWaSlug(account.slug) === id) && account.href) return account;
    }
    return null;
  }
  function upsertWaAccount(account) {
    if (!account || !account.href) return null;
    var keys = [account.salesCode, account.sales_code, account.id, account.slug, account.legacySlug, account.legacy_slug];
    var existing = null;
    for (var i = 0; i < keys.length; i++) {
      existing = findWaAccount(keys[i]);
      if (existing) break;
    }
    if (!existing) {
      WA_ACCOUNTS.push(account);
      return account;
    }
    Object.keys(account).forEach(function (key) {
      if (account[key] !== undefined && account[key] !== null && account[key] !== '') existing[key] = account[key];
    });
    return existing;
  }
  function rememberWaAccount(account, mode) {
    if (!account || !account.href) return;
    var id = account.id || account.slug;
    setStoredWaAccountId(id);
    setStoredWaPoolSignature(getWaPoolSignature());
    storageSet(WA_ASSIGNMENT_MODE_KEY, mode || 'random');
    if (mode === 'forced') storageSet(WA_FORCED_SLUG_KEY, cleanWaSlug(account.slug || account.id));
  }
  function forcedWaAccount() {
    var urlSlug = forcedWaSlugFromLocation();
    if (urlSlug) {
      var fromUrl = findWaAccount(urlSlug);
      if (fromUrl) {
        rememberWaAccount(fromUrl, 'forced');
        return fromUrl;
      }
      storageSet(WA_FORCED_SLUG_KEY, urlSlug);
      storageSet(WA_ASSIGNMENT_MODE_KEY, 'forced');
      return null;
    }
    if (salesRouteFromLocation()) return null;
    if (storageGet(WA_ASSIGNMENT_MODE_KEY) !== 'forced') return null;
    var storedSlug = cleanWaSlug(storageGet(WA_FORCED_SLUG_KEY));
    return storedSlug ? findWaAccount(storedSlug) : null;
  }
  function hydrateForcedWaAccount() {
    if (salesRouteFromLocation()) return;
    var urlSlug = forcedWaSlugFromLocation();
    var storedSlug = storageGet(WA_ASSIGNMENT_MODE_KEY) === 'forced' ? storageGet(WA_FORCED_SLUG_KEY) : '';
    var slug = cleanWaSlug(urlSlug || storedSlug);
    if (!slug || findWaAccount(slug) || window.location.protocol === 'file:') return;
    fetch('/api/wa/resolve?slug=' + encodeURIComponent(slug), { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (payload) {
        if (!payload || !payload.account || !payload.account.href) return;
        var account = upsertWaAccount(payload.account);
        rememberWaAccount(account || payload.account, 'forced');
        refreshWhatsappLinks();
      })
      .catch(function () {});
  }
  function hydrateSalesRouteFromLocation() {
    var routeMatch = window.location.pathname.match(/^\/r\/([^/?#]+)/);
    var fromUrl = !!routeMatch;
    var storedRoute = storedSalesRoute();
    var code = fromUrl ? cleanSalesCode(routeMatch[1]) : (storedRoute && storedRoute.salesCode ? cleanSalesCode(storedRoute.salesCode) : '');
    if (!code || window.location.protocol === 'file:') {
      if (fromUrl) replaceSalesRoutePath();
      return;
    }
    if (!fromUrl && findWaAccount(code)) return;
    fetch('/api/whatsapp-routing?code=' + encodeURIComponent(code), { credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (payload) {
        if (payload && payload.valid && payload.account && payload.account.href) {
          var account = upsertWaAccount(payload.account);
          rememberSalesRoute(account || payload.account, payload.salesCode || code);
          refreshWhatsappLinks();
        } else if (fromUrl && storedRoute && cleanSalesCode(storedRoute.salesCode) && cleanSalesCode(storedRoute.salesCode) !== code) {
          return fetch('/api/whatsapp-routing?code=' + encodeURIComponent(cleanSalesCode(storedRoute.salesCode)), { credentials: 'same-origin' })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (storedPayload) {
              if (storedPayload && storedPayload.valid && storedPayload.account && storedPayload.account.href) {
                var storedAccount = upsertWaAccount(storedPayload.account);
                rememberSalesRoute(storedAccount || storedPayload.account, storedPayload.salesCode || storedRoute.salesCode);
                refreshWhatsappLinks();
              }
              if (fromUrl) replaceSalesRoutePath();
            });
        } else if (!fromUrl && window.localStorage) {
          localStorage.removeItem(SALES_ROUTE_STORAGE_KEY);
        }
        if (fromUrl) replaceSalesRoutePath();
      })
      .catch(function () { if (fromUrl) replaceSalesRoutePath(); });
  }
  function assignedWaAccount() {
    var forced = forcedWaAccount();
    if (forced) return forced;
    var sales = salesRouteAccount();
    if (sales) return sales;
    if (!WA_ACCOUNTS.length) return null;
    var poolSignature = getWaPoolSignature();
    var stored = getStoredWaPoolSignature() === poolSignature ? findWaAccount(getStoredWaAccountId()) : null;
    if (stored) return stored;
    var picked = WA_ACCOUNTS[Math.floor(Math.random() * WA_ACCOUNTS.length)];
    rememberWaAccount(picked, 'random');
    return picked;
  }
  function assignedWaBase() {
    var account = assignedWaAccount();
    return account ? account.href : (WA || '');
  }
  function wa(msg) {
    var account = assignedWaAccount();
    var base = account ? account.href : (WA || '');
    if (!base) return '/contact';
    if (!msg) return base;
    return base + (base.indexOf('?') === -1 ? '?' : '&') + 'text=' + encodeURIComponent(appendSalesRouteToMessage(withWaGreeting(msg, account)));
  }
  function refreshWhatsappLinks() {
    document.querySelectorAll('[data-wa-message]').forEach(function (link) {
      var message = link.getAttribute('data-wa-message') || '';
      link.href = wa(message);
    });
    if (footWa) footWa.href = wa('Hello PeptidesPrescripts, I would like a catalog overview.');
    var fab = document.getElementById('fab');
    if (fab) fab.href = wa('Hello PeptidesPrescripts, I would like a catalog overview.');
    var houseWa = document.getElementById('houseWa');
    if (houseWa) houseWa.href = wa('Hello AOSAI, I would like to ask about PeptidesPrescripts products.');
    renderCart();
  }
  function trackingIds() {
    var visitorId = storageGet(VISITOR_STORAGE_KEY);
    if (!visitorId) {
      visitorId = randomId('v');
      storageSet(VISITOR_STORAGE_KEY, visitorId);
    }
    var sessionId = sessionGet(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = randomId('s');
      sessionSet(SESSION_STORAGE_KEY, sessionId);
    }
    return { visitorId: visitorId, sessionId: sessionId };
  }
  function waContext() {
    var account = forcedWaAccount() || salesRouteAccount() || findWaAccount(getStoredWaAccountId()) || null;
    return {
      waAccountId: account ? (account.id || account.slug || '') : '',
      waSlug: account ? cleanWaSlug(account.salesCode || account.sales_code || account.slug || account.id) : cleanWaSlug(storageGet(WA_FORCED_SLUG_KEY) || salesRouteCode()),
      assignmentMode: storageGet(WA_ASSIGNMENT_MODE_KEY) || (account ? 'sticky' : '')
    };
  }
  function trackApiAvailable() {
    return window.location.protocol !== 'file:' && !/^(?:127\.0\.0\.1|localhost):5173$/.test(window.location.host);
  }
  function safeTrackPath(location) {
    return location && location.pathname ? location.pathname : '/';
  }
  function safeTrackReferrer(raw) {
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
  function trackedEventsWithCampaign(events) {
    var campaign = campaignMetadata();
    var pageType = document.body.dataset.page || 'content';
    return events.map(function (event) {
      var next = Object.assign({}, event);
      next.metadata = Object.assign({}, campaign, { pageType: pageType }, event.metadata || {});
      return next;
    });
  }
  function flushTrack(useBeacon) {
    if (!trackQueue.length || !trackApiAvailable()) {
      if (!trackApiAvailable()) trackQueue.length = 0;
      return;
    }
    var ids = trackingIds();
    var context = waContext();
    var payload = {
      visitorId: ids.visitorId,
      sessionId: ids.sessionId,
      path: safeTrackPath(window.location),
      referrer: safeTrackReferrer(document.referrer),
      waAccountId: context.waAccountId,
      waSlug: context.waSlug,
      assignmentMode: context.assignmentMode,
      events: trackedEventsWithCampaign(trackQueue.splice(0, 25))
    };
    var body = JSON.stringify(payload);
    if (useBeacon && navigator.sendBeacon) {
      try {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
        return;
      } catch (e) {}
    }
    fetch('/api/track', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: body,
      keepalive: true
    }).catch(function () {});
  }
  function trackEvent(type, props) {
    props = props || {};
    trackQueue.push({
      type: type,
      entityType: props.entityType || '',
      entityId: props.entityId || '',
      label: props.label || '',
      value: props.value || '',
      durationMs: props.durationMs || 0,
      metadata: props.metadata || {}
    });
    window.clearTimeout(trackTimer);
    trackTimer = window.setTimeout(function () { flushTrack(false); }, 650);
  }
  function analyticsSearchTerm(value) {
    var text = String(value || '').trim().slice(0, 120);
    if (/@/.test(text) || (text.match(/\d/g) || []).length >= 7) return '[redacted]';
    return text;
  }
  window.pepticoreTrack = trackEvent;
  window.addEventListener('pagehide', function () { flushTrack(true); });
  function minPrice(series) {
    var m = Infinity;
    series.skus.forEach(function (s) { if (s.price < m) m = s.price; });
    return m;
  }
  function seriesFirstLetter(name) {
    return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || name.slice(0, 2);
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function productImageUrl(series, width) {
    var responsiveWidth = width === 800 ? 800 : 480;
    return assetPath('assets/products/responsive/' + encodeURIComponent(series.id) + '-' + responsiveWidth + '.webp?v=1');
  }
  function coaList(series) {
    return series && COAS[series.id] ? COAS[series.id] : [];
  }
  function coaButtonHtml(c, s) {
    var coas = coaList(s);
    if (!coas.length) return '';
    var label = coas.length > 1 ? 'View COAs' : 'View COA';
    return ''
      + '<button class="detail-coa-btn" type="button" data-cat="' + esc(c.id) + '" data-series="' + esc(s.id) + '">'
      +   '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3.5h7.5L15 6v10.5H5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M12.5 3.5V6H15M7.5 9h5M7.5 11.5h5M7.5 14h3.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
      +   '<span>' + label + '</span>'
      + '</button>';
  }
  function findCategory(id) {
    for (var i = 0; i < DATA.length; i++) if (DATA[i].id === id) return DATA[i];
    return null;
  }
  function findSeries(catId, seriesId) {
    var c = findCategory(catId);
    if (!c) return null;
    for (var i = 0; i < c.series.length; i++) if (c.series[i].id === seriesId) return c.series[i];
    return null;
  }

  function findSku(series, skuId) {
    if (!series) return null;
    for (var i = 0; i < series.skus.length; i++) {
      if (series.skus[i].sku === skuId) return series.skus[i];
    }
    return null;
  }

  function normalizeTerm(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/β/g, 'beta')
      .replace(/α/g, 'alpha')
      .replace(/[^a-z0-9]+/g, '');
  }

  function searchTokens(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/β/g, ' beta ')
      .replace(/α/g, ' alpha ')
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  function isSubsequence(needle, haystack) {
    var j = 0;
    for (var i = 0; i < haystack.length && j < needle.length; i++) {
      if (haystack[i] === needle[j]) j++;
    }
    return j === needle.length;
  }

  function editDistance(a, b, maxDistance) {
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
    var prev = [];
    for (var i = 0; i <= b.length; i++) prev[i] = i;
    for (var x = 1; x <= a.length; x++) {
      var cur = [x];
      var rowMin = cur[0];
      for (var y = 1; y <= b.length; y++) {
        var cost = a[x - 1] === b[y - 1] ? 0 : 1;
        cur[y] = Math.min(prev[y] + 1, cur[y - 1] + 1, prev[y - 1] + cost);
        if (cur[y] < rowMin) rowMin = cur[y];
      }
      if (rowMin > maxDistance) return maxDistance + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  var SEARCH_ALIASES = {
    'retatrutide': ['reta', 'ret', 'retatrutide', 'rt'],
    'tirzepatide': ['tirz', 'tirzep', 'tirzepatide', 'tr'],
    'semaglutide': ['sema', 'semag', 'semaglutide'],
    'bpc157': ['bpc', 'bpc157', 'bpc-157'],
    'tb500': ['tb', 'tb500', 'tb-500'],
    'ghkcu': ['ghk', 'ghkcu', 'ghk-cu', 'ghk cu'],
    'snap8': ['snap', 'snap8', 'snap-8', 'sanp8', 'acetylhexapeptide8'],
    'nad': ['nad', 'nadplus', 'nad+'],
    'motsc': ['mots', 'motsc', 'mots-c', 'mots c'],
    'pt141': ['pt141', 'pt-141', 'bremelanotide'],
    'cjcipa': ['cjc ipa', 'cjc ipamorelin', 'cjc1295 ipa'],
    'mic': ['mic', 'lipo b12', 'lipo-c b12'],
    'klow': ['klow', 'ghk bpc'],
    'glow': ['glow', 'ghk bpc tb']
  };

  function aliasList(series) {
    var key = normalizeTerm(series.id);
    var nameKey = normalizeTerm(series.name);
    var aliases = [];
    if (SEARCH_ALIASES[key]) aliases = aliases.concat(SEARCH_ALIASES[key]);
    if (SEARCH_ALIASES[nameKey]) aliases = aliases.concat(SEARCH_ALIASES[nameKey]);
    return aliases;
  }

  function fieldScore(queryKey, queryParts, field) {
    var key = normalizeTerm(field);
    if (!key) return 0;
    if (key === queryKey) return 140;
    if (key.indexOf(queryKey) !== -1) return key.indexOf(queryKey) === 0 ? 120 : 95;
    var words = searchTokens(field).map(normalizeTerm);
    for (var i = 0; i < words.length; i++) {
      if (words[i].indexOf(queryKey) === 0) return 105;
    }
    if (queryKey.length >= 5 && isSubsequence(queryKey, key)) return Math.max(42, 78 - (key.length - queryKey.length));
    if (queryKey.length >= 4) {
      var threshold = queryKey.length <= 5 ? 1 : 2;
      for (var j = 0; j < words.length; j++) {
        var d = editDistance(queryKey, words[j], threshold);
        if (d <= threshold) return 68 - d * 12;
      }
    }
    if (queryParts.length > 1) {
      var total = 0;
      for (var p = 0; p < queryParts.length; p++) {
        var part = queryParts[p];
        if (!part) continue;
        if (key.indexOf(part) === -1 && !isSubsequence(part, key)) return 0;
        total += key.indexOf(part) !== -1 ? 18 : 8;
      }
      return total;
    }
    return 0;
  }

  function scoreSearchTarget(query, fields) {
    var queryKey = normalizeTerm(query);
    if (!queryKey) return 0;
    var queryParts = searchTokens(query).map(normalizeTerm);
    var best = 0;
    fields.forEach(function (field) {
      best = Math.max(best, fieldScore(queryKey, queryParts, field));
    });
    return best;
  }

  function seriesSearchFields(category, series) {
    var fields = [series.name, series.id].concat(aliasList(series));
    series.skus.forEach(function (sku) {
      fields.push(sku.sku, sku.spec, series.name + ' ' + sku.sku, series.name + ' ' + sku.spec);
    });
    return fields;
  }

  function bestMatchedSku(series, query) {
    var best = null;
    var bestScore = 0;
    series.skus.forEach(function (sku) {
      var score = scoreSearchTarget(query, [sku.sku, sku.spec, series.name + ' ' + sku.sku, series.name + ' ' + sku.spec]);
      if (score > bestScore) {
        best = sku;
        bestScore = score;
      }
    });
    return bestScore >= 50 ? best : null;
  }

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

  function cartMessage(items) {
    var lines = items.map(function (item, i) {
      return (i + 1) + '. ' + item.seriesName + ' — ' + item.sku + ' — ' + item.spec + ' — $' + item.price;
    });
    return 'Hello PeptidesPrescripts, I would like to order these products:\n\n' + lines.join('\n');
  }

  function updateCartCount() {
    var count = readCart().length;
    if (cartCount) cartCount.textContent = count;
    if (openCart) openCart.setAttribute('data-count', String(count));
  }

  function notifyCartChanged() {
    try {
      window.dispatchEvent(new CustomEvent('pepticore:cartchange'));
    } catch (e) {}
  }

  function removeCartItemByKey(key) {
    if (!key) return;
    var before = readCart();
    var next = before.filter(function (item) { return cartItemKey(item) !== key; });
    if (next.length === before.length) return;
    writeCart(next);
    renderCart();
    notifyCartChanged();
    trackEvent('cart_remove', { entityType: 'cart', entityId: key, label: 'Remove cart item', value: String(next.length) });
  }

  function clearCartItems() {
    if (!readCart().length) return;
    writeCart([]);
    renderCart();
    notifyCartChanged();
    trackEvent('cart_clear', { entityType: 'cart', entityId: 'all', label: 'Clear cart', value: '0' });
  }

  function renderCart() {
    if (!cartBody || !sendCart) return;
    var items = readCart();
    updateCartCount();
    if (!items.length) {
      cartBody.innerHTML = ''
        + '<div class="cart-empty cart-empty-compact">'
        +   '<div>No products selected yet.</div>'
        +   '<a class="cart-empty-action" href="/catalog">Browse catalog</a>'
        + '</div>';
      sendCart.href = '/contact';
      sendCart.setAttribute('aria-disabled', 'true');
      if (clearCart) clearCart.disabled = true;
      if (cartMinNote) cartMinNote.hidden = true;
      Array.prototype.forEach.call(cartBody.querySelectorAll('.cart-empty-action'), function (el) {
        el.addEventListener('click', closeCartModal);
      });
      animateCartRows();
      return;
    }
    cartBody.innerHTML = items.map(function (item) {
      return ''
        + '<div class="cart-item" data-key="' + esc(cartItemKey(item)) + '">'
        +   '<div>'
        +     '<div class="cart-item-name">' + esc(item.seriesName) + '</div>'
        +     '<div class="cart-item-meta">'
        +       '<span>' + esc(item.sku) + '</span>'
        +       '<span>' + esc(item.spec) + '</span>'
        +       '<strong>$' + esc(item.price) + ' <span class="price-gbp">£' + gbpPrice(item.price) + '</span></strong>'
        +     '</div>'
        +   '</div>'
        +   '<button class="cart-remove" type="button" data-cart-remove="' + esc(cartItemKey(item)) + '" aria-label="Remove ' + esc(item.seriesName) + '">Remove</button>'
        + '</div>';
    }).join('');
    var total = items.reduce(function (sum, item) { return sum + (Number(item.price) || 0); }, 0);
    if (total < MIN_ORDER) {
      sendCart.href = '#';
      sendCart.setAttribute('aria-disabled', 'true');
      if (cartMinNote) {
        cartMinNote.hidden = false;
        cartMinNote.textContent = 'Add $' + (MIN_ORDER - total) + ' more to reach the $' + MIN_ORDER + ' minimum order';
      }
    } else {
      sendCart.href = wa(cartMessage(items));
      sendCart.removeAttribute('aria-disabled');
      if (cartMinNote) cartMinNote.hidden = true;
    }
    if (clearCart) clearCart.disabled = false;
    animateCartRows();
  }

  function openCartModal() {
    renderCart();
    document.body.dataset.cart = 'open';
    syncPageScrollLock();
    if (cartOverlay) cartOverlay.setAttribute('aria-hidden', 'false');
    trackEvent('cart_open', { entityType: 'cart', entityId: 'drawer', label: 'Cart drawer', value: String(readCart().length) });
    animateOverlayOpen('.cart-box');
    animateCartRows();
  }

  function closeCartModal() {
    delete document.body.dataset.cart;
    if (cartOverlay) cartOverlay.setAttribute('aria-hidden', 'true');
    syncPageScrollLock();
  }

  function openCoaModal(category, series) {
    var coas = coaList(series);
    if (!coaOverlay || !coaBody || !coas.length) return;
    if (coaTitle) coaTitle.textContent = series.name + ' COA';
    if (coaSub) {
      coaSub.textContent = coas.length > 1
        ? coas.length + ' component COAs linked to this product series.'
        : 'Batch documentation linked to this product series.';
    }
    coaBody.innerHTML = coas.map(function (coa, i) {
      var pdfSrc = assetPath(coa.pdf || '');
      var previewSrc = assetPath(coa.src || coa.preview || coa.pdf || '');
      var fallbackSrc = pdfSrc || previewSrc;
      var isPdfPreview = /\.pdf(?:[?#].*)?$/i.test(previewSrc);
      var panelId = 'coa-panel-' + series.id + '-' + i;
      var isOpen = false;
      var preview = isPdfPreview
        ? '<div class="coa-preview-missing">Image preview is unavailable. Download the PDF file instead.</div>'
        : '<button class="coa-image-button" type="button" data-coa-zoom="' + esc(previewSrc) + '" data-coa-label="' + esc(coa.label + ' COA') + '" aria-label="Open ' + esc(coa.label + ' COA image preview') + '">'
        +   '<img class="coa-img" src="' + esc(previewSrc) + '" alt="' + esc(coa.label + ' COA') + '" loading="lazy" decoding="async" width="1238" height="1750" />'
        + '</button>';
      var download = pdfSrc || fallbackSrc;
      var downloadName = coa.download || '';
      return ''
        + '<figure class="coa-card' + (isOpen ? ' is-open' : '') + '" data-coa-item>'
        +   '<figcaption>'
        +     '<button class="coa-toggle" type="button" data-coa-toggle aria-expanded="' + (isOpen ? 'true' : 'false') + '" aria-controls="' + esc(panelId) + '">'
        +       '<span class="coa-index">' + String(i + 1).padStart(2, '0') + '</span>'
        +       '<strong>' + esc(coa.label) + '</strong>'
        +       '<span class="coa-toggle-state">' + (isOpen ? 'Hide image' : 'Preview image') + '</span>'
        +     '</button>'
        +     '<span class="coa-actions">'
        +       '<a class="coa-download" href="' + esc(download) + '" download="' + esc(downloadName) + '" data-coa-download>Download PDF</a>'
        +     '</span>'
        +   '</figcaption>'
        +   '<div class="coa-preview-wrap" id="' + esc(panelId) + '"' + (isOpen ? '' : ' hidden') + '>'
        +     preview
        +   '</div>'
        + '</figure>';
    }).join('');
    document.body.dataset.coa = 'open';
    syncPageScrollLock();
    coaOverlay.setAttribute('aria-hidden', 'false');
    coaBody.scrollTop = 0;
    var coaBox = coaOverlay.querySelector('.coa-box');
    if (coaBox) {
      coaBox.style.removeProperty('opacity');
      coaBox.style.removeProperty('visibility');
      coaBox.style.removeProperty('transform');
    }
    trackEvent('coa_open', { entityType: 'series', entityId: series.id, label: series.name, metadata: { category: category.id, count: coas.length } });
    animateOverlayOpen('.coa-box');
    if (window.gsap) {
      window.gsap.fromTo(toArray(coaBody, '.coa-card'),
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.34, stagger: 0.05, ease: 'power2.out', overwrite: true }
      );
    }
  }

  function closeCoaModal() {
    closeCoaZoom();
    delete document.body.dataset.coa;
    if (coaOverlay) coaOverlay.setAttribute('aria-hidden', 'true');
    if (coaBody) coaBody.innerHTML = '';
    syncPageScrollLock();
  }

  function setCoaCardOpen(card, open) {
    if (!card) return;
    var toggle = card.querySelector('[data-coa-toggle]');
    var panel = card.querySelector('.coa-preview-wrap');
    var state = card.querySelector('.coa-toggle-state');
    card.classList.toggle('is-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (panel) panel.hidden = !open;
    if (state) state.textContent = open ? 'Hide image' : 'Preview image';
  }

  function toggleCoaCard(card) {
    if (!card) return;
    var willOpen = !card.classList.contains('is-open');
    toArray(coaBody, '[data-coa-item]').forEach(function (item) {
      if (item !== card) setCoaCardOpen(item, false);
    });
    setCoaCardOpen(card, willOpen);
    if (willOpen && card.scrollIntoView) {
      window.requestAnimationFrame(function () {
        scrollCoaCardIntoView(card);
      });
    }
  }

  function ensureCoaZoom() {
    var zoom = document.getElementById('coaZoomOverlay');
    if (zoom) return zoom;
    zoom = document.createElement('div');
    zoom.className = 'coa-zoom-overlay';
    zoom.id = 'coaZoomOverlay';
    zoom.setAttribute('aria-hidden', 'true');
    zoom.innerHTML = ''
      + '<div class="coa-zoom-panel" role="dialog" aria-modal="true" aria-label="COA image preview">'
      +   '<button class="coa-zoom-close" type="button" aria-label="Close COA image preview">Esc</button>'
      +   '<img class="coa-zoom-img" alt="" />'
      +   '<div class="coa-zoom-caption"></div>'
      + '</div>';
    document.body.appendChild(zoom);
    zoom.addEventListener('click', function (e) {
      if (e.target === zoom || e.target.classList.contains('coa-zoom-close')) closeCoaZoom();
    });
    return zoom;
  }

  function openCoaZoom(src, label) {
    if (!src) return;
    var zoom = ensureCoaZoom();
    var img = zoom.querySelector('.coa-zoom-img');
    var caption = zoom.querySelector('.coa-zoom-caption');
    if (img) {
      img.alt = label || 'COA image preview';
      img.decoding = 'async';
      img.loading = 'eager';
    }
    if (caption) caption.textContent = label || 'COA image preview';
    document.body.dataset.coaZoom = 'open';
    zoom.setAttribute('aria-hidden', 'false');
    syncPageScrollLock();
    window.requestAnimationFrame(function () {
      if (!img) return;
      if (img.getAttribute('src') !== src) img.src = src;
      img.alt = label || 'COA image preview';
      if (img.decode) img.decode().catch(function () {});
    });
  }

  function closeCoaZoom() {
    var zoom = document.getElementById('coaZoomOverlay');
    if (!zoom) return;
    delete document.body.dataset.coaZoom;
    zoom.setAttribute('aria-hidden', 'true');
    syncPageScrollLock();
  }

  function triggerCoaDownload(link) {
    if (!link) return;
    var href = assetPath(link.getAttribute('href'));
    if (!href) return;
    var downloadName = link.getAttribute('download') || '';
    fetchAndDownload(href, downloadName);
  }

  function addCartItem(category, series, sku) {
    var items = readCart();
    var item = {
      catId: category.id,
      seriesId: series.id,
      categoryName: category.label,
      seriesName: series.name,
      sku: sku.sku,
      spec: sku.spec,
      price: sku.price
    };
    var key = cartItemKey(item);
    for (var i = 0; i < items.length; i++) {
      if (cartItemKey(items[i]) === key) {
        writeCart(items);
        renderCart();
        return false;
      }
    }
    items.push(item);
    writeCart(items);
    renderCart();
    trackEvent('cart_add', { entityType: 'sku', entityId: sku.sku, label: series.name, value: String(sku.price), metadata: { category: category.id, series: series.id, spec: sku.spec } });
    trackEvent('specification_select', { entityType: 'sku', entityId: sku.sku, label: series.name, value: String(sku.price), metadata: { category: category.id, series: series.id, spec: sku.spec } });
    return true;
  }

  // ---- decorative SVG helpers (inline, no external assets) -------------------
  function heroSVG() {
    // atmospheric molecular ring + peptide backbone
    return ''
      + '<svg viewBox="0 0 680 680" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
      +   '<defs>'
      +     '<radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">'
      +       '<stop offset="0%" stop-color="#2E5339" stop-opacity="0.08"/>'
      +       '<stop offset="60%" stop-color="#9A7B4F" stop-opacity="0.03"/>'
      +       '<stop offset="100%" stop-color="transparent"/>'
      +     '</radialGradient>'
      +   '</defs>'
      +   '<circle cx="340" cy="340" r="300" fill="url(#heroGlow)"/>'
      +   '<g stroke="#2E5339" stroke-width="0.6" fill="none" opacity="0.28">'
      +     '<circle cx="340" cy="340" r="260"/>'
      +     '<circle cx="340" cy="340" r="200"/>'
      +     '<circle cx="340" cy="340" r="140"/>'
      +   '</g>'
      +   '<g stroke="#0F1011" stroke-width="0.8" fill="none" opacity="0.35">'
      +     '<polygon points="340,180 455,246 455,378 340,444 225,378 225,246"/>'
      +     '<polygon points="340,230 412,272 412,356 340,398 268,356 268,272"/>'
      +   '</g>'
      +   '<g fill="#2E5339" opacity="0.55">'
      +     '<circle cx="340" cy="180" r="3.5"/>'
      +     '<circle cx="455" cy="246" r="3.5"/>'
      +     '<circle cx="455" cy="378" r="3.5"/>'
      +     '<circle cx="340" cy="444" r="3.5"/>'
      +     '<circle cx="225" cy="378" r="3.5"/>'
      +     '<circle cx="225" cy="246" r="3.5"/>'
      +   '</g>'
      +   '<path d="M80,560 C180,500 260,600 360,540 C460,480 540,580 640,520" stroke="#9A7B4F" stroke-width="0.9" fill="none" opacity="0.5"/>'
      +   '<path d="M80,600 C180,540 260,640 360,580 C460,520 540,620 640,560" stroke="#0F1011" stroke-width="0.6" fill="none" opacity="0.2"/>'
      + '</svg>';
  }
  function molecularSVG() {
    // tiny hex on cat-card corner
    return ''
      + '<svg viewBox="0 0 160 160" aria-hidden="true">'
      +   '<g stroke="currentColor" stroke-width="0.8" fill="none" opacity="0.22">'
      +     '<polygon points="80,26 130,55 130,113 80,142 30,113 30,55"/>'
      +     '<polygon points="80,48 112,66 112,102 80,120 48,102 48,66"/>'
      +     '<circle cx="80" cy="84" r="6"/>'
      +     '<line x1="80" y1="26" x2="80" y2="48"/>'
      +     '<line x1="130" y1="55" x2="112" y2="66"/>'
      +     '<line x1="130" y1="113" x2="112" y2="102"/>'
      +     '<line x1="80" y1="142" x2="80" y2="120"/>'
      +     '<line x1="30" y1="113" x2="48" y2="102"/>'
      +     '<line x1="30" y1="55" x2="48" y2="66"/>'
      +   '</g>'
      + '</svg>';
  }
  function atmosphericSVG(variant) {
    // for featured series background — varies subtly by variant
    var patterns = [
      // double ring
      '<g stroke="#2E5339" stroke-width="0.6" fill="none" opacity="0.35"><circle cx="140" cy="140" r="110"/><circle cx="140" cy="140" r="70"/><circle cx="140" cy="140" r="30"/></g><g fill="#9A7B4F" opacity="0.4"><circle cx="140" cy="30" r="2"/><circle cx="250" cy="140" r="2"/><circle cx="140" cy="250" r="2"/><circle cx="30" cy="140" r="2"/></g>',
      // peptide sketch
      '<g stroke="#0F1011" stroke-width="0.7" fill="none" opacity="0.3"><path d="M20,80 L50,60 L90,80 L120,60 L160,80 L190,60 L230,80 L260,60"/><path d="M20,160 L50,140 L90,160 L120,140 L160,160 L190,140 L230,160 L260,140"/></g><g fill="#2E5339" opacity="0.4"><circle cx="50" cy="60" r="3"/><circle cx="120" cy="60" r="3"/><circle cx="190" cy="60" r="3"/><circle cx="50" cy="140" r="3"/><circle cx="120" cy="140" r="3"/><circle cx="190" cy="140" r="3"/></g>',
      // scatter
      '<g stroke="#0F1011" stroke-width="0.5" fill="none" opacity="0.25"><circle cx="60" cy="60" r="40"/><circle cx="200" cy="80" r="30"/><circle cx="140" cy="180" r="50"/><line x1="100" y1="60" x2="170" y2="80"/><line x1="200" y1="110" x2="170" y2="160"/><line x1="100" y1="100" x2="120" y2="150"/></g><g fill="#2E5339" opacity="0.5"><circle cx="60" cy="60" r="2.5"/><circle cx="200" cy="80" r="2.5"/><circle cx="140" cy="180" r="2.5"/></g>'
    ];
    return ''
      + '<svg viewBox="0 0 280 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      +   (patterns[variant % patterns.length])
      + '</svg>';
  }

  // ---- GSAP motion layer ----------------------------------------------------
  function toArray(root, selector) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function cleanupMotion() {
    if (motionMedia) {
      motionMedia.revert();
      motionMedia = null;
    }
    if (window.ScrollTrigger) {
      window.ScrollTrigger.getAll().forEach(function (trigger) { trigger.kill(); });
    }
  }

  function registerMotionPlugins() {
    if (!window.gsap) return false;
    if (window.ScrollTrigger && !registerMotionPlugins.done) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      registerMotionPlugins.done = true;
    }
    return true;
  }

  function revealImmediately(root) {
    toArray(root || document, '.fade-in, .reveal').forEach(function (el) {
      el.classList.add('is-visible');
      el.style.removeProperty('opacity');
      el.style.removeProperty('visibility');
      el.style.removeProperty('transform');
    });
  }

  function animateOverlayOpen(boxSelector) {
    if (!window.gsap) return;
    var box = document.querySelector(boxSelector);
    if (!box) return;
    window.gsap.fromTo(box,
      { autoAlpha: 0, y: 18, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out', overwrite: true }
    );
  }

  function animateSearchRows() {
    if (!window.gsap || document.body.dataset.search !== 'open') return;
    var rows = toArray(searchResults, '.search-result, .search-quick-link');
    if (!rows.length) return;
    window.gsap.fromTo(rows,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.28, stagger: 0.025, ease: 'power2.out', overwrite: true }
    );
  }

  function animateCartRows() {
    if (!window.gsap || document.body.dataset.cart !== 'open') return;
    var rows = toArray(cartBody, '.cart-item, .cart-empty-compact');
    if (!rows.length) return;
    window.gsap.fromTo(rows,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.32, stagger: 0.035, ease: 'power2.out', overwrite: true }
    );
  }

  function pulseTarget(target) {
    if (!window.gsap || !target) return;
    window.gsap.fromTo(target,
      { scale: 0.96 },
      { scale: 1, duration: 0.38, ease: 'back.out(2)', overwrite: true, clearProps: 'transform' }
    );
  }

  function bindMagicCards(root, conditions) {
    if (!window.gsap) return;
    var gsap = window.gsap;
    var cards = toArray(root, '.home-popular-card, .series-card, .cat-card, .feat-series, .research-card, .related-card, .home-flow-card, .hero-command-card, .page-stat');
    cards.forEach(function (card) {
      card.classList.add('magic-card');
      if (!card.querySelector('.magic-card-glow')) {
        var glow = document.createElement('span');
        glow.className = 'magic-card-glow';
        glow.setAttribute('aria-hidden', 'true');
        card.appendChild(glow);
      }
      if (!card.querySelector('.magic-card-beam')) {
        var beam = document.createElement('span');
        beam.className = 'magic-card-beam';
        beam.setAttribute('aria-hidden', 'true');
        card.appendChild(beam);
      }
      if (conditions.isMobile) return;
      card.addEventListener('pointermove', function (event) {
        var rect = card.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        gsap.to(card, {
          '--mx': x + 'px',
          '--my': y + 'px',
          duration: 0.24,
          ease: 'power2.out',
          overwrite: true
        });
      });
    });
  }

  function animateScrollItems(root, selector, options) {
    if (!window.gsap) return;
    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var items = toArray(root, selector).filter(function (el) {
      return !el.closest('.hero') && !el.closest('.home-popular') && !el.hasAttribute('data-motion-intro');
    });
    if (!items.length) return;
    items.forEach(function (el) { el.classList.add('is-visible'); });
    gsap.set(items, { autoAlpha: 1, y: options && options.y ? options.y : 16 });
    if (!ScrollTrigger) {
      gsap.to(items, { y: 0, duration: 0.56, stagger: 0.035, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
      return;
    }
    ScrollTrigger.batch(items, {
      start: 'top 88%',
      once: true,
      interval: 0.08,
      batchMax: 8,
      onEnter: function (batch) {
        gsap.to(batch, {
          y: 0,
          duration: options && options.duration ? options.duration : 0.56,
          stagger: { each: 0.035, from: 'start' },
          ease: 'power3.out',
          overwrite: true,
          clearProps: 'transform,opacity,visibility'
        });
      }
    });
  }

  function bindHoverMotion(root, conditions) {
    if (!window.gsap) return;
    var gsap = window.gsap;
    var hoverTargets = toArray(root, '.home-popular-card, .series-card, .cat-card, .feat-series, .research-card, .related-card');
    if (!conditions.isMobile) {
      hoverTargets.forEach(function (el) {
        var media = el.querySelector('img');
        el.addEventListener('pointerenter', function () {
          gsap.to(el, { y: -8, scale: 1.012, duration: 0.28, ease: 'power3.out', overwrite: true });
          if (media) gsap.to(media, { scale: 1.045, duration: 0.45, ease: 'power3.out', overwrite: true });
        });
        el.addEventListener('pointerleave', function () {
          gsap.to(el, { y: 0, scale: 1, duration: 0.38, ease: 'power3.out', overwrite: true, clearProps: 'transform' });
          if (media) gsap.to(media, { scale: 1, duration: 0.42, ease: 'power3.out', overwrite: true, clearProps: 'transform' });
        });
      });
    }
    toArray(root, '.btn-wa, .btn-ghost, .sku-cart, .sku-order, .detail-coa-btn, .standard-sig-link').forEach(function (el) {
      el.addEventListener('pointerdown', function () {
        gsap.to(el, { scale: 0.965, duration: 0.12, ease: 'power2.out', overwrite: true });
      });
      el.addEventListener('pointerup', function () {
        gsap.to(el, { scale: 1, duration: 0.26, ease: 'back.out(2)', overwrite: true, clearProps: 'transform' });
      });
      el.addEventListener('pointerleave', function () {
        gsap.to(el, { scale: 1, duration: 0.18, ease: 'power2.out', overwrite: true, clearProps: 'transform' });
      });
    });
  }

  function animateHome(root, conditions) {
    var gsap = window.gsap;
    var tl = gsap.timeline({ defaults: { duration: 0.72, ease: 'power3.out' } });
    toArray(root, '.hero .fade-in, .hero .reveal, .home-popular-card, .home-flow-card').forEach(function (el) {
      el.classList.add('is-visible');
    });
    tl.addLabel('intro', 0)
      .fromTo(toArray(root, '.hero-kicker'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.44 }, 'intro')
      .fromTo(toArray(root, '.hero-title'), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.82 }, 'intro+=0.04')
      .fromTo(toArray(root, '.hero-sub'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.56 }, 'intro+=0.28')
      .fromTo(toArray(root, '.hero-proof-rail span'), { autoAlpha: 0, y: 10, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, stagger: 0.045 }, 'intro+=0.36')
      .fromTo(toArray(root, '.hero-ctas'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 'intro+=0.5')
      .fromTo(toArray(root, '.home-popular-head'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.46 }, 'intro+=0.56')
      .fromTo(toArray(root, '.home-popular-card'), { autoAlpha: 0, x: 24, y: 18, scale: 0.97 }, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.6, stagger: 0.055 }, 'intro+=0.58');
  }

  function animateCategory(root) {
    var gsap = window.gsap;
    var introCards = toArray(root, '.series-card').slice(0, 8);
    introCards.forEach(function (card) { card.setAttribute('data-motion-intro', 'category'); });
    gsap.timeline({ defaults: { duration: 0.68, ease: 'power3.out' } })
      .fromTo(toArray(root, '.page-crumb'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.42 })
      .fromTo(toArray(root, '.page-title'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0 }, '<0.06')
      .fromTo(toArray(root, '.page-sub'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0 }, '<0.1')
      .fromTo(toArray(root, '.page-side'), { autoAlpha: 0, x: 18, y: 12 }, { autoAlpha: 1, x: 0, y: 0 }, '<0.08')
      .fromTo(introCards, { y: 18, scale: 0.985 }, {
        y: 0,
        scale: 1,
        duration: 0.62,
        stagger: 0.055,
        clearProps: 'transform,opacity,visibility',
        onComplete: function () {
          introCards.forEach(function (card) { card.removeAttribute('data-motion-intro'); });
        }
      }, '<0.04');
  }

  function animateSeries(root) {
    var gsap = window.gsap;
    gsap.timeline({ defaults: { duration: 0.7, ease: 'power3.out' } })
      .fromTo(toArray(root, '.detail-back'), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.42 })
      .fromTo(toArray(root, '.detail-img-wrap'), { autoAlpha: 0, x: -28, y: 24, scale: 0.965 }, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.86 }, '<0.06')
      .fromTo(toArray(root, '.detail-head'), { autoAlpha: 0, x: 22, y: 18 }, { autoAlpha: 1, x: 0, y: 0, duration: 0.78 }, '<0.1')
      .fromTo(toArray(root, '.sku-row').slice(0, 5), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.56, stagger: 0.045 }, '<0.16');
  }

  function initMotion(route) {
    if (!registerMotionPlugins()) {
      revealImmediately(view);
      return;
    }

    var gsap = window.gsap;
    gsap.defaults({ ease: 'power3.out', overwrite: 'auto' });
    motionMedia = gsap.matchMedia();
    motionMedia.add({
      isDesktop: '(min-width: 861px)',
      isMobile: '(max-width: 860px)',
      reduceMotion: '(prefers-reduced-motion: reduce)'
    }, function (context) {
      var conditions = context.conditions || {};
      revealImmediately(view);
      if (conditions.reduceMotion) {
        gsap.set(toArray(view, '.fade-in, .reveal, .series-card, .research-card, .cat-card, .feat-series, .sku-row, .spec-cell, .related-card'), {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          clearProps: 'transform,opacity,visibility'
        });
        return;
      }

      if (route === 'home') animateHome(view, conditions);
      if (route === 'category') animateCategory(view, conditions);
      if (route === 'series') animateSeries(view, conditions);

      bindMagicCards(view, conditions);
      animateScrollItems(view, [
        '.standard-kicker',
        '.standard-quote',
        '.standard-signature',
        '.home-flow-card',
        '.section-head',
        '.feat-series',
        '.cat-card',
        '.series-card',
        '.research-section',
        '.research-card',
        '.detail-about',
        '.detail-sku',
        '.sku-row',
        '.spec-grid',
        '.spec-cell',
        '.related',
        '.related-card',
        '.compliance'
      ].join(','));
      bindHoverMotion(view, conditions);

      if (window.ScrollTrigger) {
        requestAnimationFrame(function () { window.ScrollTrigger.refresh(); });
      }
    });
  }

  // ---- scroll reveal (IntersectionObserver) ----------------------------------
  var revealObserver = null;
  function armScrollReveal() {
    if (window.gsap) {
      if (revealObserver) revealObserver.disconnect();
      revealImmediately(document);
      return;
    }
    if (!('IntersectionObserver' in window)) {
      // graceful fallback — reveal everything immediately
      Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) { el.classList.add('is-visible'); });
      return;
    }
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          revealObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) {
      revealObserver.observe(el);
    });
  }

  // ------------------------ sidebar render ------------------------
  catCount.textContent = DATA.length;
  seriesCount.textContent = totalSeries;
  skuCount.textContent = totalSkus;

  function renderSidebar(currentCat) {
    sideNav.innerHTML = DATA.map(function (c) {
      var active = currentCat === c.id ? 'true' : 'false';
      return ''
        + '<a href="#/c/' + c.id + '" class="side-item" aria-current="' + active + '" data-cat="' + c.id + '">'
        +   '<span class="side-item-label">' + esc(c.label) + '</span>'
        +   '<span class="side-item-count">' + c.series.length + '</span>'
        + '</a>';
    }).join('');
    // close sidebar on nav click
    Array.prototype.forEach.call(sideNav.querySelectorAll('.side-item'), function (el) {
      el.addEventListener('click', function () { closeSide(); });
    });
  }
  renderSidebar(null);

  // footer categories
  footCats.innerHTML = DATA.map(function (c) {
    return '<li><a href="#/c/' + c.id + '">' + esc(c.label) + '</a></li>';
  }).join('');

		  // WA links
		  hydrateSalesRouteFromLocation();
		  hydrateForcedWaAccount();
		  refreshWhatsappLinks();
	  [footWa, fab].forEach(function (link) {
	    if (!link) return;
	    link.addEventListener('click', function () {
	      trackEvent('whatsapp_redirect', { entityType: 'link', entityId: link.id || 'whatsapp', label: 'WhatsApp direct link' });
	      flushTrack(true);
	    });
	  });

  // ------------------------ sidebar toggle ------------------------
  function openSide() {
    document.body.dataset.side = 'open';
    syncPageScrollLock();
    sidebar.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    if (window.gsap) {
      window.gsap.fromTo(toArray(sidebar, '.side-head, .side-item, .side-foot'),
        { autoAlpha: 0, x: -12 },
        { autoAlpha: 1, x: 0, duration: 0.38, stagger: 0.035, ease: 'power3.out', overwrite: true }
      );
    }
  }
  function closeSide() {
    delete document.body.dataset.side;
    sidebar.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    syncPageScrollLock();
  }
  menuBtn.addEventListener('click', function () { if (document.body.dataset.side === 'open') closeSide(); else openSide(); });
  if (closeSideBtn) closeSideBtn.addEventListener('click', closeSide);
  backdrop.addEventListener('click', closeSide);

  function bindMobileTouchFallbacks() {
    var canTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    if (!canTouch) return;
    document.addEventListener('touchend', function (e) {
      var target = e.target;
      if (!target || !target.closest) return;

      var removeTrigger = target.closest('.cart-remove[data-cart-remove]');
      if (removeTrigger) {
        e.preventDefault();
        e.stopPropagation();
        removeCartItemByKey(removeTrigger.getAttribute('data-cart-remove'));
        return;
      }

      var clearTrigger = target.closest('#clearCart');
      if (clearTrigger && !clearTrigger.disabled) {
        e.preventDefault();
        e.stopPropagation();
        clearCartItems();
        return;
      }

      var cartTrigger = target.closest('#openCart,[data-open-cart]');
      if (cartTrigger) {
        e.preventDefault();
        e.stopPropagation();
        openCartModal();
        return;
      }

      var menuTrigger = target.closest('#menuBtn');
      if (menuTrigger) {
        e.preventDefault();
        e.stopPropagation();
        if (document.body.dataset.side === 'open') closeSide();
        else openSide();
        return;
      }

      var profileTrigger = target.closest('#navWa');
      if (profileTrigger) {
        e.preventDefault();
        e.stopPropagation();
        var accountBtnTouch = document.getElementById('openAccount');
        if (accountBtnTouch) accountBtnTouch.click();
        return;
      }

      var closeCartTrigger = target.closest('#closeCart');
      if (closeCartTrigger) {
        e.preventDefault();
        e.stopPropagation();
        closeCartModal();
        return;
      }

      var waTrigger = target.closest('#fab,a[href*="wa.me/"],a[href*="api.whatsapp.com/"]');
      if (!waTrigger) return;
      if (!waTrigger.getAttribute('href') || waTrigger.getAttribute('href') === '#') {
        waTrigger.href = wa('Hello PeptidesPrescripts, I would like a catalog overview.');
      }
      waTrigger.setAttribute('target', '_blank');
      waTrigger.setAttribute('rel', 'noopener noreferrer');
      var href = waTrigger.href || '';
      if (/^https?:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(href)) {
        e.preventDefault();
        e.stopPropagation();
        trackEvent('whatsapp_redirect', { entityType: 'link', entityId: waTrigger.id || 'whatsapp-touch', label: 'WhatsApp touch link' });
        flushTrack(true);
        window.location.href = href;
      }
    }, { passive: false, capture: true });
  }

  bindMobileTouchFallbacks();

  // ------------------------ search ------------------------
  function openSearchModal() {
    document.body.dataset.search = 'open';
    syncPageScrollLock();
    searchOverlay.setAttribute('aria-hidden', 'false');
    renderSearch(searchInput.value);
    trackEvent('nav_click', { entityType: 'overlay', entityId: 'search', label: 'Open search' });
    animateOverlayOpen('.search-box');
    animateSearchRows();
    setTimeout(function () { searchInput.focus(); }, 50);
  }
  function closeSearchModal() {
    delete document.body.dataset.search;
    searchOverlay.setAttribute('aria-hidden', 'true');
    searchInput.value = '';
    renderSearch('');
    syncPageScrollLock();
  }
  if (openSearch) openSearch.addEventListener('click', openSearchModal);
  if (sideSearch) sideSearch.addEventListener('click', function () {
    closeSide();
    openSearchModal();
  });
  if (sideAccount) sideAccount.addEventListener('click', function () {
    var accountBtn = document.getElementById('openAccount');
    closeSide();
    if (accountBtn) accountBtn.click();
  });
  closeSearch.addEventListener('click', closeSearchModal);
  searchOverlay.addEventListener('click', function (e) {
    if (e.target.id === 'searchOverlay') closeSearchModal();
  });
	  if (openCart) openCart.addEventListener('click', openCartModal);
  document.addEventListener('click', function (e) {
    var cartTrigger = e.target.closest && e.target.closest('#openCart,[data-open-cart]');
    if (!cartTrigger) return;
    e.preventDefault();
    e.stopPropagation();
    openCartModal();
  }, true);
	  document.addEventListener('click', function (e) {
	    var profileTrigger = e.target.closest && e.target.closest('#navWa');
	    if (!profileTrigger) return;
	    e.preventDefault();
	    e.stopPropagation();
	    var accountBtn = document.getElementById('openAccount');
	    if (accountBtn) accountBtn.click();
	  }, true);
	  function closeCartFromControl(e) {
	    if (e) {
	      e.preventDefault();
	      e.stopPropagation();
	    }
	    closeCartModal();
	  }
	  if (closeCart) {
	    closeCart.addEventListener('click', closeCartFromControl, true);
	    closeCart.addEventListener('touchend', closeCartFromControl, { passive: false, capture: true });
	  }
  if (cartOverlay) cartOverlay.addEventListener('click', function (e) {
    if (e.target.id === 'cartOverlay') closeCartModal();
  });
  if (closeCoa) closeCoa.addEventListener('click', closeCoaModal);
  if (coaOverlay) coaOverlay.addEventListener('click', function (e) {
    if (e.target.id === 'coaOverlay') closeCoaModal();
  });
  if (coaOverlay) {
    coaOverlay.addEventListener('touchstart', function (e) {
      overlayTouchY = e.touches && e.touches.length ? e.touches[0].clientY : 0;
    }, { passive: true });
    coaOverlay.addEventListener('wheel', function (e) {
      e.stopPropagation();
      var scroller = e.target.closest && e.target.closest('.coa-body');
      if (!scroller || isScrollBoundary(scroller, e.deltaY || 0)) e.preventDefault();
    }, { passive: false });
    coaOverlay.addEventListener('touchmove', function (e) {
      e.stopPropagation();
      var currentY = e.touches && e.touches.length ? e.touches[0].clientY : overlayTouchY;
      var deltaY = overlayTouchY - currentY;
      overlayTouchY = currentY;
      var scroller = e.target.closest && e.target.closest('.coa-body');
      if (!scroller || isScrollBoundary(scroller, deltaY)) e.preventDefault();
    }, { passive: false });
  }
  if (coaBody) coaBody.addEventListener('click', function (e) {
    var downloadTarget = e.target.closest && e.target.closest('[data-coa-download]');
    if (downloadTarget) {
      e.preventDefault();
      triggerCoaDownload(downloadTarget);
      return;
    }
    var toggle = e.target.closest && e.target.closest('[data-coa-toggle]');
    if (toggle) {
      e.preventDefault();
      toggleCoaCard(toggle.closest('[data-coa-item]'));
      return;
    }
    var zoomTarget = e.target.closest && e.target.closest('[data-coa-zoom]');
    if (zoomTarget) {
      e.preventDefault();
      openCoaZoom(zoomTarget.getAttribute('data-coa-zoom'), zoomTarget.getAttribute('data-coa-label'));
    }
  });
  if (clearCart) clearCart.addEventListener('click', function (e) {
    e.preventDefault();
    clearCartItems();
  });
  if (cartBody) cartBody.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.cart-remove');
    if (!btn) return;
    e.preventDefault();
    var key = btn.getAttribute('data-cart-remove');
    if (!key) {
      var row = btn.closest('.cart-item');
      key = row ? row.getAttribute('data-key') : '';
    }
    removeCartItemByKey(key);
  });

  // ------------------------ house modal ------------------------
  var houseOverlay = document.getElementById('houseOverlay');
  var openHouseBtn = document.getElementById('openHouse');
  var closeHouseBtn = document.getElementById('closeHouse');
  var closeHouse2Btn = document.getElementById('closeHouse2');
  var houseScrollEl = document.getElementById('houseScroll');
  var houseWa = document.getElementById('houseWa');
  if (houseWa) houseWa.href = wa('Hello AOSAI, I would like to ask about PeptidesPrescripts products.');

  // probe each [data-img] element — load assets/<filename>, reveal on success, fallback on error
  var houseImagesLoaded = false;
  var houseImagePreloads = [];
  function loadHouseImages() {
    if (houseImagesLoaded) return;
    houseImagesLoaded = true;
    var nodes = document.querySelectorAll('.house-img[data-img]');
    Array.prototype.forEach.call(nodes, function (el) {
      var file = el.getAttribute('data-img');
      if (!file) return;
      var url = 'assets/' + file;
      var img = new Image();
      img.onload = function () {
        el.style.backgroundImage = "url('" + url + "')";
        el.classList.add('is-loaded');
      };
      img.onerror = function () {
        el.setAttribute('data-fallback', 'true');
      };
      houseImagePreloads.push(img);
      img.src = url;
    });
  }

  function openHouseModal() {
    document.body.dataset.house = 'open';
    syncPageScrollLock();
    houseOverlay.setAttribute('aria-hidden', 'false');
    if (houseScrollEl) houseScrollEl.scrollTop = 0;
    loadHouseImages();
    animateOverlayOpen('.house-panel');
    if (window.gsap) {
      window.gsap.fromTo(toArray(houseOverlay, '.house-cover-inner > *, .house-lede, .house-campus'),
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.62, stagger: 0.055, ease: 'power3.out', overwrite: true }
      );
    }
  }
  function closeHouseModal() {
    delete document.body.dataset.house;
    houseOverlay.setAttribute('aria-hidden', 'true');
    syncPageScrollLock();
  }
  if (openHouseBtn) openHouseBtn.addEventListener('click', openHouseModal);
  if (closeHouseBtn) closeHouseBtn.addEventListener('click', closeHouseModal);
  if (closeHouse2Btn) closeHouse2Btn.addEventListener('click', closeHouseModal);
  if (houseOverlay) houseOverlay.addEventListener('click', function (e) {
    if (e.target.id === 'houseOverlay') closeHouseModal();
  });

  // delegate: any element with [data-house-open] opens the modal
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-house-open]');
    if (t) { e.preventDefault(); openHouseModal(); }
  });
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.sku-cart');
    if (!btn) return;
    e.preventDefault();
    var category = findCategory(btn.getAttribute('data-cat'));
    var series = category ? findSeries(category.id, btn.getAttribute('data-series')) : null;
    var sku = findSku(series, btn.getAttribute('data-sku'));
    if (!category || !series || !sku) return;
    var added = addCartItem(category, series, sku);
    btn.classList.add('is-added');
    btn.innerHTML = added ? 'Added' : 'In cart';
    pulseTarget(btn);
    pulseTarget(openCart);
    setTimeout(function () {
      btn.classList.remove('is-added');
      btn.innerHTML = 'Add';
    }, 1200);
  });
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.detail-coa-btn');
    if (!btn) return;
    e.preventDefault();
    var category = findCategory(btn.getAttribute('data-cat'));
    var series = category ? findSeries(category.id, btn.getAttribute('data-series')) : null;
    if (!category || !series) return;
    openCoaModal(category, series);
  });

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); openSearchModal();
    } else if (e.key === 'Escape') {
      if (document.body.dataset.coaZoom === 'open') closeCoaZoom();
      else if (document.body.dataset.coa === 'open') closeCoaModal();
      else if (document.body.dataset.house === 'open') closeHouseModal();
      else if (document.body.dataset.cart === 'open') closeCartModal();
      else if (document.body.dataset.search === 'open') closeSearchModal();
      else if (document.body.dataset.side === 'open') closeSide();
    }
  });

  function renderSearch(q) {
    q = (q || '').trim();
    if (!q) {
      var quickLinks = DATA.map(function (c) {
        return ''
          + '<a class="search-quick-link" href="#/c/' + c.id + '">'
          +   '<span>' + esc(c.label) + '</span>'
          +   '<b>' + c.series.length + '</b>'
          + '</a>';
      }).join('');
      searchResults.innerHTML = ''
        + '<div class="search-empty search-empty-rich">'
        +   '<div class="search-empty-kicker">Catalog</div>'
        +   '<div class="search-quick">' + quickLinks + '</div>'
        + '</div>';
      Array.prototype.forEach.call(searchResults.querySelectorAll('.search-quick-link'), function (el) {
        el.addEventListener('click', function () { closeSearchModal(); });
      });
      animateSearchRows();
      return;
    }
    var hits = [];
    DATA.forEach(function (c) {
      c.series.forEach(function (s) {
        var score = scoreSearchTarget(q, seriesSearchFields(c, s));
        if (score >= 42) {
          hits.push({ category: c, series: s, matchedSku: bestMatchedSku(s, q), score: score });
        }
      });
    });
    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return minPrice(a.series) - minPrice(b.series);
    });
    window.clearTimeout(renderSearch.trackTimer);
    renderSearch.trackTimer = window.setTimeout(function () {
      var key = q.toLowerCase() + '|' + hits.length;
      if (key === lastTrackedSearch) return;
      lastTrackedSearch = key;
      var trackedQuery = analyticsSearchTerm(q);
      trackEvent(hits.length ? 'search' : 'search_no_result', {
        entityType: 'search',
        entityId: trackedQuery,
        label: trackedQuery,
        value: trackedQuery,
        metadata: { results: hits.length }
      });
      trackEvent('product_search', {
        entityType: 'search',
        entityId: trackedQuery,
        label: trackedQuery,
        value: String(hits.length),
        metadata: { results: hits.length }
      });
    }, 420);
    if (!hits.length) {
      searchResults.innerHTML = '<div class="search-empty">No matches for "' + esc(q) + '".</div>';
      return;
    }
    searchResults.innerHTML = hits.slice(0, 30).map(function (h) {
      var priceBits = h.matchedSku
        ? '$' + h.matchedSku.price
        : 'from $' + minPrice(h.series);
      var meta = h.matchedSku
        ? h.matchedSku.sku + ' · ' + h.matchedSku.spec + ' · ' + h.category.label
        : h.series.skus.length + ' options · ' + h.category.label;
      return ''
        + '<a class="search-result" href="#/c/' + h.category.id + '/s/' + h.series.id + '">'
        +   '<span class="search-result-thumb"><img src="' + esc(productImageUrl(h.series)) + '" alt="" loading="lazy" /></span>'
        +   '<span>'
        +     '<div class="search-result-title">' + esc(h.series.name) + '</div>'
        +     '<div class="search-result-meta">' + esc(meta) + '</div>'
        +   '</span>'
        +   '<span class="search-result-price">' + priceBits + '</span>'
        + '</a>';
    }).join('');
    Array.prototype.forEach.call(searchResults.querySelectorAll('.search-result'), function (el) {
      el.addEventListener('click', function () { closeSearchModal(); });
    });
    animateSearchRows();
  }
  searchInput.addEventListener('input', function () { renderSearch(searchInput.value); });

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest && e.target.closest('[data-open-search]');
    if (!trigger) return;
    e.preventDefault();
    openSearchModal();
  });
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href*="wa.me"]');
    if (!link) return;
    trackEvent('whatsapp_redirect', { entityType: 'link', entityId: link.className || link.id || 'whatsapp', label: 'WhatsApp link' });
    flushTrack(true);
  });

  // ------------------------ router ------------------------
  function isAdminHash() {
    return /^#\/admin(?:\/|$)/.test(location.hash || '');
  }

  function parseHash() {
    var h = location.hash.replace(/^#/, '').replace(/^\//, '');
    if (!h) return { route: 'home' };
    var parts = h.split('/');
    // c/:catId
    if (parts[0] === 'c' && parts[1] && !parts[2]) return { route: 'category', catId: parts[1] };
    // c/:catId/s/:seriesId
    if (parts[0] === 'c' && parts[1] && parts[2] === 's' && parts[3]) return { route: 'series', catId: parts[1], seriesId: parts[3] };
    return { route: 'home' };
  }

  function go(hash) { location.hash = hash; }
  brandBtn.addEventListener('click', function (e) { e.preventDefault(); go('/'); });

  function render() {
    // The member console owns admin hashes. Do not mount the public SPA, its
    // motion system, or its home fallback behind a live admin session.
    if (isAdminHash()) {
      cleanupMotion();
      return;
    }
    var r = parseHash();
    cleanupMotion();
    if (document.body.dataset.search === 'open') closeSearchModal();
    if (document.body.dataset.cart === 'open') closeCartModal();
    if (document.body.dataset.coa === 'open') closeCoaModal();
    if (document.body.dataset.house === 'open') closeHouseModal();
    if (document.body.dataset.side === 'open') closeSide();
    resetRouteScroll();
    var fabEl = document.getElementById('fab');
    if (r.route === 'category') {
      var c = findCategory(r.catId);
      if (!c) { view.innerHTML = renderNotFound(); return; }
      document.body.dataset.page = 'category';
      renderSidebar(r.catId);
      view.innerHTML = renderCategory(c);
      wireCategory(c);
      initMotion('category');
      if (fabEl) fabEl.href = wa('Hello PeptidesPrescripts, I am browsing ' + c.label + ' and would like more information.');
      trackEvent('category_view', { entityType: 'category', entityId: c.id, label: c.label, metadata: { series: c.series.length } });
      trackEvent('page_view', { entityType: 'route', entityId: 'category', label: c.label });
    } else if (r.route === 'series') {
      var cat = findCategory(r.catId); var s = findSeries(r.catId, r.seriesId);
      if (!cat || !s) { view.innerHTML = renderNotFound(); return; }
      document.body.dataset.page = 'series';
      renderSidebar(r.catId);
      view.innerHTML = renderSeries(cat, s);
      armScrollReveal();
      initMotion('series');
      if (fabEl) fabEl.href = wa('Hello PeptidesPrescripts, I would like to order ' + s.name + ' (from $' + minPrice(s) + ').');
      trackEvent('product_view', { entityType: 'series', entityId: s.id, label: s.name, value: String(minPrice(s)), metadata: { category: cat.id, skus: s.skus.length } });
      trackEvent('page_view', { entityType: 'route', entityId: 'series', label: s.name });
    } else {
      document.body.dataset.page = 'home';
      renderSidebar(null);
      view.innerHTML = renderHome();
      wireHome();
      initMotion('home');
      if (fabEl) fabEl.href = wa('Hello PeptidesPrescripts, I would like a catalog overview.');
      trackEvent('page_view', { entityType: 'route', entityId: 'home', label: 'Home' });
    }
    resetRouteScroll();
  }

  window.addEventListener('hashchange', render);

  // ------------------------ home ------------------------
  function heroMediaHtml() {
    var base = '/assets/generated/pepticore-hero-final-user/';
    return ''
      + '<picture class="hero-bg-media" aria-hidden="true">'
      +   '<source media="(max-width: 760px)" srcset="' + base + 'pepticore-hero-user-desktop-960.webp" />'
      +   '<img src="' + base + 'pepticore-hero-user-desktop-1920.webp"'
      +     ' srcset="' + base + 'pepticore-hero-user-desktop-1920.webp 1x, ' + base + 'pepticore-hero-user-desktop-2880.webp 2x"'
      +     ' alt="" width="1920" height="1081" fetchpriority="high" decoding="async" />'
      + '</picture>';
  }

  function renderHome() {
    var seoProductSlugs = {
      retatrutide: 'retatrutide',
      tirzepatide: 'tirzepatide',
      semaglutide: 'semaglutide',
      bpc157: 'bpc-157',
      'ghk-cu': 'ghk-cu',
      nad: 'nad',
      snap8: 'snap-8',
      'bpc-tb-combo': 'bpc-157-tb500'
    };
    function publicProductHref(series, categoryId) {
      var productSlug = seoProductSlugs[series.id];
      return productSlug ? '/products/' + productSlug : '#/c/' + categoryId + '/s/' + series.id;
    }

    // Category cards — one unified style, quiet
    var catHtml = DATA.map(function (c, i) {
      var tSkus = 0;
      c.series.forEach(function (s) { tSkus += s.skus.length; });
      var story = STORIES.categories[c.id] || {};
      var num = String(i + 1).padStart(2, '0');
      var lede = story.lede || c.tagline;
      return ''
        + '<a class="cat-card reveal" style="animation-delay:' + (i * 0.04) + 's" href="#/c/' + c.id + '">'
        +   '<div class="cat-card-idx">' + num + ' — ' + String(DATA.length).padStart(2, '0') + '</div>'
        +   '<h3 class="cat-card-title">' + esc(c.label) + '</h3>'
        +   '<p class="cat-card-tag"><em>' + esc(lede) + '</em></p>'
        +   '<div class="cat-card-foot">'
        +     '<span class="cat-card-count">' + c.series.length + ' series · ' + tSkus + ' SKUs</span>'
        +     '<svg class="cat-card-arrow" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        +   '</div>'
        + '</a>';
    }).join('');

    var popularSpecs = [
      { catId: 'glp1', seriesId: 'retatrutide' },
      { catId: 'glp1', seriesId: 'tirzepatide' },
      { catId: 'glp1', seriesId: 'semaglutide' },
      { catId: 'healing', seriesId: 'bpc157' },
      { catId: 'longevity', seriesId: 'ghk-cu' },
      { catId: 'longevity', seriesId: 'nad' },
      { catId: 'skin-beauty', seriesId: 'snap8' },
      { catId: 'healing', seriesId: 'bpc-tb-combo' }
    ];
    var popular = popularSpecs.map(function (item, i) {
      var cat = findCategory(item.catId);
      var s = findSeries(item.catId, item.seriesId);
      if (!cat || !s) return '';
      return ''
        + '<a class="home-popular-card" style="animation-delay:' + (0.03 * i) + 's" href="' + publicProductHref(s, cat.id) + '">'
        +   '<div class="home-popular-img">'
        +     '<img src="' + esc(productImageUrl(s)) + '" alt="' + esc(s.name) + '" loading="lazy" />'
        +   '</div>'
        +   '<div class="home-popular-body">'
        +     '<h3>' + esc(s.name) + '</h3>'
        +     '<p>' + s.skus.length + ' specs · from $' + minPrice(s) + '</p>'
        +   '</div>'
        + '</a>';
    }).join('');

    return ''
      // HERO — full-bleed product scene background with real DOM copy
      + '<section class="hero hero-full-bleed-final">'
      +   heroMediaHtml()
      +   '<div class="hero-shell wrap">'
      +   '<div class="hero-grid">'
      +     '<div class="hero-title-block">'
      +       '<div class="hero-kicker fade-in"><button class="hero-kicker-link" data-house-open>PeptidesPrescripts</button> · Research-use peptide catalog</div>'
      +       '<h1 class="hero-title fade-in fade-in-d1">Research-use peptides.<br/><em>Clear specs.</em></h1>'
      +     '</div>'
      +     '<div class="hero-body-block">'
      +       '<p class="hero-sub fade-in fade-in-d2">Review ' + totalSeries + ' research-use peptide series with SKU-level specifications, visible starting prices, and available COA documentation.</p>'
      +       '<div class="hero-proof-rail fade-in fade-in-d3" aria-label="Catalog summary">'
      +         '<span><b>' + totalSeries + '</b> series</span>'
      +         '<span><b>' + totalSkus + '</b> SKUs</span>'
      +         '<span><b>COA</b> access</span>'
      +       '</div>'
      +       '<div class="hero-ctas fade-in fade-in-d4">'
      +         '<a class="btn-wa" href="/catalog">Browse catalog</a>'
      +         '<a class="btn-ghost hero-search-action" href="/catalog" data-open-search>Find a product</a>'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      +   '</div>'
      + '</section>'
      + '<section class="home-popular wrap" aria-label="Popular product series">'
      +   '<div class="home-popular-head">'
      +     '<div>'
      +       '<div class="home-popular-kicker">Popular series</div>'
      +       '<h2>Quick product access</h2>'
      +     '</div>'
      +     '<a href="/catalog">View all</a>'
      +   '</div>'
      +   '<div class="home-popular-shell">'
      +     '<div class="home-popular-track">' + popular + '</div>'
      +     '<div class="home-popular-edge home-popular-edge-l" aria-hidden="true"></div>'
      +     '<div class="home-popular-edge home-popular-edge-r" aria-hidden="true"></div>'
      +   '</div>'
      +   '<div class="home-popular-hint">Scroll for more product series</div>'
      + '</section>'

      // ORDER FLOW — clear product path without decorative clutter
      + '<section class="home-flow wrap" aria-label="Catalog ordering workflow">'
      +   '<div class="home-flow-card reveal">'
      +     '<div class="home-flow-num">01</div>'
      +     '<h3>Search or browse</h3>'
      +     '<p>Find products by common name, abbreviation, category, SKU, or specification.</p>'
      +   '</div>'
      +   '<div class="home-flow-card reveal">'
      +     '<div class="home-flow-num">02</div>'
      +     '<h3>Check specs and COA</h3>'
      +     '<p>Review vial format, price, literature context, and available COA records before ordering.</p>'
      +   '</div>'
      +   '<div class="home-flow-card reveal">'
      +     '<div class="home-flow-num">03</div>'
      +     '<h3>Send the list</h3>'
      +     '<p>Add SKUs to cart and send a structured order message directly through WhatsApp.</p>'
      +   '</div>'
      + '</section>'

      // THE STANDARD — single quiet manifesto
      + '<section class="standard"><div class="wrap standard-inner">'
      +   '<div class="standard-kicker reveal">Catalog standard</div>'
      +   '<h2 class="standard-quote reveal">'
      +     'PeptidesPrescripts keeps every product entry focused on <em>clear specifications</em>: '
      +     'exact SKU references, listed vial formats, visible starting prices, available COA access, and a structured inquiry path.'
      +   '</h2>'
      +   '<div class="standard-signature reveal">'
      +     '<div class="standard-sig-name">AOSAI Biotechnology · Guangzhou</div>'
      +     '<a class="standard-sig-link" href="/about">About PeptidesPrescripts and AOSAI <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></a>'
      +   '</div>'
      + '</div></section>'

      // SEO CONTENT — crawlable resource links and research-use context
      + '<section class="home-seo-resources"><div class="wrap">'
      +   '<header class="section-head reveal">'
      +     '<h2 class="section-head-title">Research-use peptide <em>resources.</em></h2>'
      +     '<div class="section-head-meta">Catalog overview · COA context · inquiry workflow</div>'
      +   '</header>'
      +   '<div class="home-seo-grid">'
      +     '<article class="home-seo-card reveal"><h3>Research-use peptide catalog</h3><p>Browse ' + totalSeries + ' research-use peptide series with SKU-level specifications, visible starting prices, and category browsing.</p><a href="/catalog">Open catalog overview</a></article>'
      +     '<article class="home-seo-card reveal"><h3>COA and quality access</h3><p>Review available COA previews and analytical documentation context before submitting an inquiry.</p><a href="/quality">Review COA access</a></article>'
      +     '<article class="home-seo-card reveal"><h3>Order list workflow</h3><p>Build an order list, review estimated pricing, and send your inquiry through WhatsApp. Final quote is confirmed by PeptidesPrescripts sales.</p><a href="/order-process">See order process</a></article>'
      +     '<article class="home-seo-card reveal"><h3>Research-use ordering FAQ</h3><p>Read answers about specifications, COA requests, listed prices, member points, fixed shipping, and SKU search.</p><a href="/faq">Read FAQ</a></article>'
      +     '<article class="home-seo-card reveal"><h3>Documentation guides</h3><p>Understand COA fields, HPLC purity context, mass-spectrum records, SKU formats, and research catalog navigation.</p><a href="/guides">Browse guides</a></article>'
      +   '</div>'
      +   '<div class="home-seo-products" aria-label="Analytical documentation guides">'
      +     '<a href="/guides/hplc-purity-explained">Understanding HPLC purity</a>'
      +     '<a href="/guides/peptide-mass-spectrum">Mass-spectrum data in peptide analysis</a>'
      +     '<a href="/guides/lyophilized-peptide-vials">Lyophilized vial formats</a>'
      +     '<a href="/guides/coa-and-batch-documentation">COA and batch documentation</a>'
      +   '</div>'
      +   '<div class="home-seo-products" aria-label="Popular product series SEO pages">'
      +     '<a href="/products/retatrutide">Retatrutide specifications</a>'
      +     '<a href="/products/tirzepatide">Tirzepatide specifications</a>'
      +     '<a href="/products/semaglutide">Semaglutide specifications</a>'
      +     '<a href="/products/bpc-157">BPC-157 specifications</a>'
      +     '<a href="/products/ghk-cu">GHK-CU specifications</a>'
      +     '<a href="/products/tb-500">TB-500 specifications</a>'
      +     '<a href="/products/nad">NAD+ specifications</a>'
      +     '<a href="/products/mots-c">MOTS-C specifications</a>'
      +     '<a href="/products/tesamorelin">Tesamorelin specifications</a>'
      +   '</div>'
      +   '<p class="home-seo-disclaimer">Research use only. Not for human consumption. Products are not approved for diagnosis, treatment, or cure of any disease.</p>'
      + '</div></section>'

      // CATALOG — one unified grid
      + '<section class="section wrap">'
      +   '<header class="section-head reveal">'
      +     '<h2 class="section-head-title">Browse by <em>research</em> category.</h2>'
      +     '<div class="section-head-meta">' + totalSeries + ' series · ' + totalSkus + ' SKUs · 8 categories</div>'
      +   '</header>'
      +   '<div class="cat-grid">' + catHtml + '</div>'
      + '</section>'
      ;
  }

  function wireHome() {
    armScrollReveal();
    var popularTrack = document.querySelector('.home-popular-track');
    if (popularTrack) {
      popularTrack.scrollLeft = 0;
      requestAnimationFrame(function () { popularTrack.scrollLeft = 0; });
    }
  }

  // ------------------------ category ------------------------
  function renderCategory(c) {
    var story = STORIES.categories[c.id] || {};
    var totalSkus = 0;
    c.series.forEach(function (s) { totalSkus += s.skus.length; });
    var cardsHtml = c.series.map(function (s, i) {
      return seriesCardHtml(c, s, i);
    }).join('');
    var referencesHtml = renderReferencesSection(c, null);

    return ''
      + '<div class="wrap">'
      +   '<div class="page-head">'
      +     '<div class="fade-in">'
      +       '<div class="page-crumb"><a href="#/">PeptidesPrescripts</a>'
      +         '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 2l4 3-4 3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      +         '<span>' + esc(c.label) + '</span>'
      +       '</div>'
      +       '<h1 class="page-title">' + esc(c.label) + '</h1>'
      +       '<p class="page-sub">' + esc(story.prose || c.tagline) + '</p>'
      +       '<div class="page-focus-row">'
      +         '<span>Single / combo series</span>'
      +         '<span>COA where available</span>'
      +         '<span>WhatsApp-ready cart</span>'
      +       '</div>'
      +     '</div>'
      +     '<div class="page-side fade-in fade-in-d2">'
      +       '<div class="search-input-wrap">'
      +         '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m14 14 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
      +         '<input id="catFilter" type="text" placeholder="Filter product series…" />'
      +       '</div>'
      +       '<div class="page-side-meta">'
      +         '<span><b>' + c.series.length + '</b> series</span>'
      +         '<span><b>' + totalSkus + '</b> SKUs</span>'
      +         '<span>from <b>$' + Math.min.apply(null, c.series.map(minPrice)) + '</b></span>'
      +       '</div>'
      +       '<div class="page-stats-grid">'
      +         '<div class="page-stat"><b>' + c.series.length + '</b><span>series</span></div>'
      +         '<div class="page-stat"><b>' + totalSkus + '</b><span>SKUs</span></div>'
      +         '<div class="page-stat"><b>$' + Math.min.apply(null, c.series.map(minPrice)) + '</b><span>from</span></div>'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="series-grid" id="seriesGrid">' + cardsHtml + '</div>'
      +   referencesHtml
      + '</div>';
  }

  function seriesCardHtml(c, s, i) {
    return ''
      + '<a class="series-card fade-in" data-name="' + esc(s.name.toLowerCase()) + '" data-search="' + esc(seriesSearchFields(c, s).join(' ')) + '" style="animation-delay:' + (0.04 * (i % 8)) + 's" href="#/c/' + c.id + '/s/' + s.id + '">'
      +   '<div class="series-card-img">'
      +     '<img class="series-card-photo" src="' + esc(productImageUrl(s)) + '" alt="' + esc(s.name) + '" loading="lazy" />'
      +   '</div>'
      +   '<div class="series-card-body">'
      +     '<div class="series-card-kicker">' + esc(c.label.split('&')[0].trim()) + '</div>'
      +     '<h3 class="series-card-name">' + esc(s.name) + '</h3>'
      +     '<div class="series-card-meta">' + s.skus.length + ' specification' + (s.skus.length > 1 ? 's' : '') + '</div>'
      +     '<div class="series-card-foot">'
      +       '<span class="series-card-price"><small>from</small>$' + minPrice(s) + '</span>'
      +       '<span class="series-card-cta">View details <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
      +     '</div>'
      +   '</div>'
      + '</a>';
  }

  function refMatchesSeries(ref, seriesId) {
    if (!ref.series || !ref.series.length) return false;
    for (var i = 0; i < ref.series.length; i++) {
      if (ref.series[i] === seriesId) return true;
    }
    return false;
  }

  function allReferences() {
    var refs = [];
    var categories = STORIES.categories || {};
    Object.keys(categories).forEach(function (key) {
      (categories[key].references || []).forEach(function (ref) {
        refs.push(ref);
      });
    });
    return refs;
  }

  function referencesForSeries(categoryReferences, seriesId) {
    var matched = categoryReferences.filter(function (ref) {
      return refMatchesSeries(ref, seriesId);
    });
    if (!matched.length) {
      matched = allReferences().filter(function (ref) {
        return refMatchesSeries(ref, seriesId);
      });
    }
    if (!matched.length) return { references: categoryReferences, matchedCount: 0 };

    var filled = matched.slice();
    categoryReferences.forEach(function (ref) {
      if (filled.length >= 4) return;
      if (matched.indexOf(ref) === -1) filled.push(ref);
    });
    return { references: filled.slice(0, 4), matchedCount: matched.length };
  }

  function renderReferencesSection(c, s) {
    var story = STORIES.categories[c.id] || {};
    var categoryReferences = story.references || [];
    var result = s ? referencesForSeries(categoryReferences, s.id) : { references: categoryReferences, matchedCount: 0 };
    var references = result.references;
    if (!references.length) return '';

    var isSeries = !!s;
    var hasSeriesMatch = isSeries && result.matchedCount > 0;
    var titleId = 'research-title-' + esc(c.id) + (isSeries ? '-' + esc(s.id) : '');
    var kicker = isSeries
      ? (hasSeriesMatch ? 'Matched literature' : 'Category literature')
      : 'Primary references / official guidance';
    var title = isSeries
      ? (hasSeriesMatch ? 'Research <em>references</em>' : 'Category <em>context</em>')
      : 'Sources &amp; <em>references</em>';
    var sub = isSeries
      ? (hasSeriesMatch
        ? 'Selected primary literature matched to ' + esc(s.name) + '. Category references are included only for scientific context.'
        : 'Selected class-level literature for ' + esc(s.name) + ', limited to primary papers and official guidance.')
      : 'Selected primary literature and official guidance for this category. These references provide context only, not product-efficacy claims for individual SKUs.';

    var cards = references.map(function (r, i) {
      var href = r.url || '#';
      var isMatched = isSeries && refMatchesSeries(r, s.id);
      return ''
        + '<a class="research-card reveal" style="animation-delay:' + (0.035 * (i % 8)) + 's" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">'
        +   (isSeries ? '<div class="research-card-badge">' + (isMatched ? 'Matched to ' + esc(s.name) : 'Category context') + '</div>' : '')
        +   '<div class="research-card-source">' + esc(r.source || 'Reference') + '</div>'
        +   '<h3 class="research-card-title">' + esc(r.title || '') + '</h3>'
        +   '<div class="research-card-meta">' + esc([r.year, r.ref].filter(Boolean).join(' · ')) + '</div>'
        +   '<p class="research-card-authors">' + esc(r.authors || '') + '</p>'
        +   '<span class="research-card-link">Open reference <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M5 3h6v6M11 3 4 10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
        + '</a>';
    }).join('');

    return ''
      + '<section class="research-section reveal" aria-labelledby="' + titleId + '">'
      +   '<header class="research-head">'
      +     '<div class="research-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 5.5A3.5 3.5 0 0 1 9.5 2H19v16h-9.5A3.5 3.5 0 0 0 6 21.5v-16Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 5.5A3.5 3.5 0 0 0 2.5 2H2v16h.5A3.5 3.5 0 0 1 6 21.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9.5 6H16M9.5 10H16M9.5 14H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>'
      +     '<div>'
      +       '<div class="research-kicker">' + kicker + '</div>'
      +       '<h2 id="' + titleId + '" class="research-title">' + title + '</h2>'
      +       '<p class="research-sub">' + sub + '</p>'
      +     '</div>'
      +   '</header>'
      +   '<div class="research-grid">' + cards + '</div>'
      + '</section>';
  }

  function wireCategory(c) {
    armScrollReveal();
    var input = document.getElementById('catFilter');
    var grid = document.getElementById('seriesGrid');
    if (!input || !grid) return;
    input.addEventListener('input', function () {
      var q = input.value.trim();
      var shown = 0;
      Array.prototype.forEach.call(grid.querySelectorAll('.series-card'), function (el) {
        var match = !q || scoreSearchTarget(q, [el.dataset.search || el.dataset.name]) >= 42;
        el.style.display = match ? '' : 'none';
        if (match) shown++;
      });
      var empty = document.getElementById('emptyNote');
      if (!shown) {
        if (!empty) {
          var d = document.createElement('div');
          d.id = 'emptyNote'; d.className = 'empty-note';
          d.textContent = 'No product series matches "' + q + '" in this category.';
          grid.parentNode.insertBefore(d, grid.nextSibling);
        }
      } else if (empty) {
        empty.remove();
      }
    });
  }

  // ------------------------ series ------------------------
  function renderSeries(c, s) {
    var story = STORIES.categories[c.id] || {};
    var lot = Math.random().toString(36).slice(2, 6).toUpperCase();
    var priceLow = minPrice(s);
    var priceHigh = Math.max.apply(null, s.skus.map(function (k) { return k.price; }));
    var firstSku = s.skus[0];
    var firstSkuMsg = firstSku
      ? 'Hello PeptidesPrescripts, I would like to order SKU ' + firstSku.sku + ' (' + s.name + ', ' + firstSku.spec + ', $' + firstSku.price + ').'
      : 'Hello PeptidesPrescripts, I would like to order ' + s.name + '.';

    var skuRows = s.skus.map(function (sk, i) {
      var msg = 'Hello PeptidesPrescripts, I would like to order SKU ' + sk.sku + ' (' + s.name + ', ' + sk.spec + ', $' + sk.price + ').';
      return ''
        + '<div class="sku-row">'
        +   '<div class="sku-code">' + esc(sk.sku) + '</div>'
        +   '<div class="sku-spec">' + esc(sk.spec) + '</div>'
        +   '<div class="sku-price"><small>USD</small>$' + sk.price + '</div>'
        +   '<button class="sku-cart" type="button" data-cat="' + esc(c.id) + '" data-series="' + esc(s.id) + '" data-sku="' + esc(sk.sku) + '">Add</button>'
        +   '<a class="sku-order" href="' + wa(msg) + '" data-wa-message="' + esc(msg) + '" target="_blank" rel="noopener noreferrer">'
        +     '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.5 14.4c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.1c-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5s.2-.3.3-.5c.1-.2.1-.4 0-.5s-.7-1.7-1-2.3-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.4 1 2.8 1.1 3c.1.2 2 3.1 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.5-.2z"/><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15l-1.4 5.1 5.2-1.4A10 10 0 1 0 12 2zm5.9 15.9a8 8 0 0 1-10.1.9l-.4-.2-3 .8.8-3-.2-.4A8 8 0 1 1 17.9 17.9z"/></svg>'
        +     'Order'
        +   '</a>'
        + '</div>';
    }).join('');

    // Related series — 3 others from same category
    var related = c.series.filter(function (x) { return x.id !== s.id; }).slice(0, 3);
    var relatedHtml = related.map(function (rs) {
      return ''
        + '<a class="related-card" href="#/c/' + c.id + '/s/' + rs.id + '">'
        +   '<div class="related-media">'
        +     '<img class="related-photo" src="' + esc(productImageUrl(rs)) + '" alt="' + esc(rs.name) + '" loading="lazy" />'
        +   '</div>'
        +   '<div class="related-body">'
        +     '<div class="related-name">' + esc(rs.name) + '</div>'
        +     '<div class="related-meta">' + rs.skus.length + ' specs · from $' + minPrice(rs) + '</div>'
        +   '</div>'
        + '</a>';
    }).join('');

    var mechanism = story.mechanism ||
      'This research-use series is organized by exact SKU and listed specification. Review the mapped documentation status for the selected record, then use the inquiry workflow for availability, shipping, and final quote confirmation.';

    return ''
      + '<article class="detail">'
      +   '<a class="detail-back" href="#/c/' + c.id + '"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M11 7H3M7 3 3 7l4 4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg> Back to ' + esc(c.label) + '</a>'

      +   '<header class="detail-top">'
      +     '<div class="detail-img-wrap fade-in">'
      +       '<img class="detail-product-photo" src="' + esc(productImageUrl(s, 800)) + '" alt="' + esc(s.name) + ' research-use catalog series" width="800" height="800" decoding="async" />'
      +     '</div>'
      +     '<div class="detail-head fade-in fade-in-d2">'
      +       '<div class="detail-kicker">' + esc(c.label) + ' · ' + (story.kicker || '') + '</div>'
      +       '<h1 class="detail-title">' + esc(s.name) + '</h1>'
      +       '<p class="detail-sub"><em>' + s.skus.length + ' specification' + (s.skus.length > 1 ? 's' : '') + '</em>, priced from $' + priceLow + (priceHigh !== priceLow ? ' to $' + priceHigh : '') + '. Review the exact SKU, listed format, and mapped COA status before submitting an inquiry.</p>'
      +       '<div class="detail-summary-grid" aria-label="Product summary">'
      +         '<div><b>$' + priceLow + '</b><span>starting price</span></div>'
      +         '<div><b>' + s.skus.length + '</b><span>specification' + (s.skus.length > 1 ? 's' : '') + '</span></div>'
      +         '<div><b>' + (coaList(s).length || '—') + '</b><span>COA file' + (coaList(s).length > 1 ? 's' : '') + '</span></div>'
      +       '</div>'
      +       '<div class="detail-mobile-actions" aria-label="Quick order actions">'
      +         '<a class="detail-mobile-specs" href="#detailSkuList">Specs</a>'
      +         (firstSku ? '<button class="sku-cart detail-mobile-add" type="button" data-cat="' + esc(c.id) + '" data-series="' + esc(s.id) + '" data-sku="' + esc(firstSku.sku) + '">Add ' + esc(firstSku.sku) + '</button>' : '')
      +         '<a class="detail-mobile-wa" href="' + wa(firstSkuMsg) + '" data-wa-message="' + esc(firstSkuMsg) + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>'
      +       '</div>'
      +       '<div class="detail-badges">'
      +         '<span class="badge accent">' + (coaList(s).length ? 'COA mapped' : 'COA status shown') + '</span>'
      +         '<span class="badge bronze">Research use only</span>'
      +         '<span class="badge">Lot ' + lot + '</span>'
      +         '<span class="badge">Sales confirmed</span>'
      +       '</div>'
      +       '<div class="detail-actions">' + coaButtonHtml(c, s) + '</div>'
      +     '</div>'
      +   '</header>'

      // MECHANISM / ABOUT
      +   '<section class="detail-about reveal">'
      +     '<div class="detail-about-label">Research context</div>'
      +     '<p class="detail-about-body">' + esc(mechanism) + '</p>'
      +   '</section>'

      // SKU TABLE
      +   '<section class="detail-sku reveal" id="detailSkuList">'
      +     '<header class="detail-sku-head">'
      +       '<h2 class="detail-sku-title">Available <em>specifications</em></h2>'
      +       '<div class="detail-sku-meta">' + s.skus.length + ' SKUs · USD · per 10-vial pack unless noted</div>'
      +     '</header>'
      +     '<div class="sku-list">' + skuRows + '</div>'
      +   '</section>'

      // PRODUCT LITERATURE
      +   renderReferencesSection(c, s)

      // SPECIFICATIONS GRID
      +   '<section class="spec-grid reveal">'
      +     '<div class="spec-cell"><div class="spec-k">Catalog format</div><div class="spec-v">Shown by exact SKU</div></div>'
      +     '<div class="spec-cell"><div class="spec-k">Price basis</div><div class="spec-v">USD starting reference</div></div>'
      +     '<div class="spec-cell"><div class="spec-k">Packaging</div><div class="spec-v">As listed in each SKU row</div></div>'
      +     '<div class="spec-cell"><div class="spec-k">Storage</div><div class="spec-v">Review mapped documentation</div></div>'
      +     '<div class="spec-cell"><div class="spec-k">Record identity</div><div class="spec-v">' + esc(s.id) + ' · ' + s.skus.length + ' SKU' + (s.skus.length > 1 ? 's' : '') + '</div></div>'
      +     '<div class="spec-cell"><div class="spec-k">Documentation</div><div class="spec-v">' + (coaList(s).length ? 'COA available' : 'COA not currently mapped') + '</div></div>'
      +     '<div class="spec-cell"><div class="spec-k">Dispatch</div><div class="spec-v">Confirmed by sales</div></div>'
      +     '<div class="spec-cell"><div class="spec-k">Final quote</div><div class="spec-v">Confirmed by sales</div></div>'
      +   '</section>'

      // RELATED SERIES
      + (relatedHtml ? (''
      +   '<section class="related reveal">'
      +     '<header class="related-head">'
      +       '<div class="related-kicker">More from ' + esc(c.label) + '</div>'
      +       '<a class="related-all" href="#/c/' + c.id + '">View category <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></a>'
      +     '</header>'
      +     '<div class="related-grid">' + relatedHtml + '</div>'
      +   '</section>') : '')

      // COMPLIANCE NOTE
      +   '<aside class="compliance reveal">'
      +     '<div class="compliance-mark">!</div>'
      +     '<div class="compliance-body"><strong>For research use only.</strong> This product is sold strictly for laboratory research. It is not approved for human consumption, diagnosis, cure, or treatment of any disease. Customers are solely responsible for compliance with local law and institutional review.</div>'
      +   '</aside>'

      + '</article>';
  }

  function renderNotFound() {
    return '<div class="wrap"><div class="page-head"><div><h1 class="page-title">Not found</h1><p class="page-sub">The page you requested could not be located. <a href="#/" style="color:var(--accent);font-weight:600">Return home</a>.</p></div></div></div>';
  }

  // boot
  render();
})();
