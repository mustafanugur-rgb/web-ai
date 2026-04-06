/**
 * Siparişler sayfası — localStorage, durum filtresi, CSV dışa aktarma
 */
(function () {
  'use strict';

  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem('dinamik_orders') || '[]');
    } catch (e) {
      return [];
    }
  }

  function formatPrice(n) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(n || 0);
  }

  function statusBucket(o) {
    var s = (o && o.status) || '';
    if (s === 'paid') return 'paid';
    if (s === 'pending') return 'pending';
    return 'other';
  }

  function statusLabel(o) {
    var s = (o && o.status) || '';
    if (s === 'paid') return 'Ödendi';
    if (s === 'pending') return 'Beklemede';
    if (s === 'Tamamlandı') return 'Tamamlandı';
    return s || '—';
  }

  function filterOrders(orders, filterVal) {
    if (!filterVal) return orders;
    return orders.filter(function (o) {
      return statusBucket(o) === filterVal;
    });
  }

  function csvEscape(s) {
    var t = String(s == null ? '' : s);
    if (/[",\n\r]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
    return t;
  }

  function exportCsv(orders) {
    var rows = [['Sipariş No', 'Müşteri', 'E-posta', 'Telefon', 'Tutar', 'Durum', 'Tarih']];
    orders.forEach(function (o) {
      rows.push([
        o.id || '',
        o.customer || o.note || '',
        o.email || '',
        o.phone || '',
        String(o.total != null ? o.total : ''),
        statusLabel(o),
        o.date || ''
      ]);
    });
    var csv = rows.map(function (r) {
      return r.map(csvEscape).join(',');
    }).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'siparisler-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  function render() {
    var orders = getOrders();
    var tbody = document.getElementById('orders-tbody');
    var empty = document.getElementById('orders-empty');
    var statToday = document.getElementById('stat-today-orders');
    var statPending = document.getElementById('stat-pending');
    var statAmount = document.getElementById('stat-pending-amount');
    var filterEl = document.getElementById('filter-order-status');

    if (!tbody) return;

    var today = new Date().toDateString();
    var todayCount = orders.filter(function (o) {
      return o.date && new Date(o.date).toDateString() === today;
    }).length;
    var pending = orders.filter(function (o) {
      return o.status === 'pending';
    });
    var pendingAmount = pending.reduce(function (s, o) {
      return s + (parseFloat(o.total) || 0);
    }, 0);

    if (statToday) statToday.textContent = todayCount;
    if (statPending) statPending.textContent = pending.length;
    if (statAmount) statAmount.textContent = formatPrice(pendingAmount);

    var filterVal = filterEl ? filterEl.value : '';
    var filtered = filterOrders(orders, filterVal);

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      var wrapper = tbody.closest('.table-wrapper');
      if (wrapper) wrapper.style.display = 'none';
      return;
    }

    if (empty) empty.style.display = 'none';
    var wrapper = tbody.closest('.table-wrapper');
    if (wrapper) wrapper.style.display = '';

    tbody.innerHTML = filtered
      .slice()
      .reverse()
      .map(function (o) {
        var badge =
          o.status === 'paid'
            ? 'badge-success'
            : o.status === 'pending'
              ? 'badge-warning'
              : 'badge-accent';
        var date = o.date ? new Date(o.date).toLocaleString('tr-TR') : '-';
        return (
          '<tr>' +
          '<td>#' +
          (o.id || '-') +
          '</td>' +
          '<td>' +
          (o.customer || o.note || '-') +
          '</td>' +
          '<td>' +
          formatPrice(o.total || 0) +
          '</td>' +
          '<td><span class="badge ' +
          badge +
          '">' +
          statusLabel(o) +
          '</span></td>' +
          '<td>' +
          date +
          '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  window.DinamikSiparislerAdmin = { render: render };

  render();

  document.getElementById('filter-order-status')?.addEventListener('change', render);

  document.getElementById('btn-export-orders-csv')?.addEventListener('click', function () {
    var orders = getOrders();
    var filterEl = document.getElementById('filter-order-status');
    var filterVal = filterEl ? filterEl.value : '';
    var filtered = filterOrders(orders, filterVal);
    if (!filtered.length) {
      alert('Dışa aktarılacak sipariş yok.');
      return;
    }
    exportCsv(filtered);
  });
})();
