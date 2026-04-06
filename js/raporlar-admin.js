/**
 * Raporlar sayfası — ciro özeti ve sipariş dökümü (localStorage)
 */
(function () {
  'use strict';

  function formatPrice(n) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(n || 0);
  }

  function run() {
    var DA = window.DinamikAnalytics;
    if (!DA) return;

    var elToday = document.getElementById('rapor-today');
    var elWeek = document.getElementById('rapor-week');
    var elMonth = document.getElementById('rapor-month');
    var elPaid = document.getElementById('rapor-paid-count');
    var elAll = document.getElementById('rapor-all-count');
    var elPending = document.getElementById('rapor-pending-count');

    var orders = DA.getOrders();
    var paid = orders.filter(DA.isPaid);
    var pending = orders.filter(function (o) {
      return o && o.status === 'pending';
    });

    if (elToday) elToday.textContent = formatPrice(DA.revenueToday());
    if (elWeek) elWeek.textContent = formatPrice(DA.revenueWeek());
    if (elMonth) elMonth.textContent = formatPrice(DA.revenueMonth());
    if (elPaid) elPaid.textContent = String(paid.length);
    if (elAll) elAll.textContent = String(orders.length);
    if (elPending) elPending.textContent = String(pending.length);

    var series = DA.revenueLastNMonths(12);
    var tbody = document.getElementById('rapor-monthly-tbody');
    if (tbody) {
      tbody.innerHTML = series
        .map(function (x) {
          return (
            '<tr><td>' +
            x.label +
            ' ' +
            x.year +
            '</td><td>' +
            formatPrice(x.amount) +
            '</td></tr>'
          );
        })
        .join('');
    }

    var demos = [];
    try {
      demos = JSON.parse(localStorage.getItem('dinamik_demo_requests') || '[]');
    } catch (e) {}
    var elDemo = document.getElementById('rapor-demo-count');
    if (elDemo) elDemo.textContent = String(demos.length);

    var products = [];
    try {
      products = JSON.parse(localStorage.getItem('dinamik_products') || '[]');
    } catch (e) {}
    var elProd = document.getElementById('rapor-product-count');
    if (elProd) elProd.textContent = String(Array.isArray(products) ? products.length : 0);
  }

  run();
})();
