/**
 * Admin - State simulation & loading states
 * Siparişler: localStorage (dinamik_orders) veya demo veri
 */

(function () {
  'use strict';

  var overlay = document.getElementById('loading-overlay');
  var ordersTbody = document.getElementById('orders-tbody');

  function simulateLoad() {
    if (overlay) overlay.classList.add('visible');
    setTimeout(function () {
      if (overlay) overlay.classList.remove('visible');
    }, 600);
  }

  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem('dinamik_orders') || '[]');
    } catch {
      return [];
    }
  }

  function formatPrice(n) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(n);
  }

  function renderOrders() {
    if (!ordersTbody) return;
    var orders = getOrders();
    var list = orders.slice().reverse().slice(0, 10);

    if (list.length === 0) {
      ordersTbody.innerHTML = '<tr><td colspan="5"><div class="table-empty"><div class="table-empty-icon">📋</div><p>Henüz sipariş yok</p><p class="stat-meta">Mağaza veya checkout üzerinden tamamlanan siparişler burada görünecek.</p></div></td></tr>';
      return;
    }

    ordersTbody.innerHTML = list.map(function (o) {
      var statusClass = o.status === 'paid' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : 'badge-accent';
      var statusText = o.status === 'paid' ? 'Ödendi' : o.status === 'pending' ? 'Beklemede' : 'Tamamlandı';
      var date = o.date ? new Date(o.date).toLocaleString('tr-TR') : '-';
      return '<tr><td>#' + (o.id || '-') + '</td><td>' + (o.customer || '-') + '</td><td>' + formatPrice(o.total || 0) + '</td><td><span class="badge ' + statusClass + '">' + statusText + '</span></td><td>' + date + '</td></tr>';
    }).join('');
  }

  simulateLoad();
  renderOrders();
})();
