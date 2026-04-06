/**
 * Panel bildirim zili — yeni sipariş / teklif talepleri (localStorage)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dinamik_admin_notif_state';

  function loadState() {
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return { seenOrderKeys: [], demoSeenCount: 0 };
  }

  function saveState(st) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch (e) {}
  }

  function orderKey(o) {
    return String(o.id || '') + '|' + String(o.date || '');
  }

  function getCounts() {
    var orders = [];
    try {
      orders = JSON.parse(localStorage.getItem('dinamik_orders') || '[]');
    } catch (e) {}
    var demos = [];
    try {
      demos = JSON.parse(localStorage.getItem('dinamik_demo_requests') || '[]');
    } catch (e) {}

    var st = loadState();
    var seen = {};
    (st.seenOrderKeys || []).forEach(function (k) {
      seen[k] = true;
    });

    var unseenOrders = 0;
    orders.forEach(function (o) {
      var k = orderKey(o);
      if (!seen[k]) unseenOrders++;
    });

    var newDemos = Math.max(0, demos.length - (st.demoSeenCount || 0));

    return {
      unseenOrders: unseenOrders,
      newDemos: newDemos,
      total: unseenOrders + newDemos,
      orders: orders,
      demos: demos,
      state: st
    };
  }

  function markAllRead() {
    var data = getCounts();
    var keys = data.orders.map(orderKey);
    saveState({ seenOrderKeys: keys, demoSeenCount: data.demos.length });
    updateBadge();
    renderDropdown(document.getElementById('admin-notif-dropdown'));
  }

  function updateBadge() {
    var n = getCounts().total;
    var badge = document.getElementById('admin-notif-badge');
    if (!badge) return;
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  function renderDropdown(panel) {
    if (!panel) return;
    var data = getCounts();
    var lines = [];
    if (data.unseenOrders > 0) {
      lines.push(
        '<p class="admin-notif-item"><strong>' +
          data.unseenOrders +
          '</strong> yeni sipariş kaydı</p><p class="stat-meta"><a href="siparisler.html">Siparişlere git →</a></p>'
      );
    }
    if (data.newDemos > 0) {
      lines.push(
        '<p class="admin-notif-item"><strong>' +
          data.newDemos +
          '</strong> yeni teklif talebi</p><p class="stat-meta">CRM / yerel liste: <code>dinamik_demo_requests</code></p>'
      );
    }
    if (!lines.length) {
      panel.innerHTML = '<p class="admin-notif-empty">Yeni bildirim yok.</p>';
    } else {
      panel.innerHTML =
        lines.join('<hr class="admin-notif-hr">') +
        '<button type="button" class="btn btn-secondary btn-sm" id="admin-notif-mark-read" style="width:100%;margin-top:var(--space-3);">Tümünü okundu say</button>';
      var btn = document.getElementById('admin-notif-mark-read');
      if (btn) btn.addEventListener('click', markAllRead);
    }
  }

  function inject() {
    var actions = document.querySelector('.admin-header-actions');
    if (!actions || document.getElementById('admin-notif-bell')) return;

    var wrap = document.createElement('div');
    wrap.className = 'admin-notif-wrap';
    wrap.innerHTML =
      '<button type="button" class="admin-notif-bell" id="admin-notif-bell" aria-expanded="false" aria-haspopup="true" aria-label="Bildirimler">' +
      '<span class="admin-notif-icon" aria-hidden="true">🔔</span>' +
      '<span class="admin-notif-badge" id="admin-notif-badge" style="display:none;"></span>' +
      '</button>' +
      '<div class="admin-notif-dropdown" id="admin-notif-dropdown" hidden></div>';

    actions.insertBefore(wrap, actions.firstChild);

    var bell = document.getElementById('admin-notif-bell');
    var dropdown = document.getElementById('admin-notif-dropdown');
    renderDropdown(dropdown);
    updateBadge();

    bell.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dropdown.hidden;
      dropdown.hidden = !open;
      bell.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) renderDropdown(dropdown);
    });

    document.addEventListener('click', function () {
      if (!dropdown.hidden) {
        dropdown.hidden = true;
        bell.setAttribute('aria-expanded', 'false');
      }
    });

    dropdown.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  window.addEventListener('storage', function () {
    updateBadge();
  });
})();
