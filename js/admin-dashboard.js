/**
 * Dashboard — özet kartları (DinamikAnalytics)
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

  function updateDashboard() {
    var DA = window.DinamikAnalytics;
    if (!DA) return;

    var today = DA.revenueToday();
    var week = DA.revenueWeek();
    var month = DA.revenueMonth();
    var paidCount = DA.paidOrderCount();

    var elToday = document.getElementById('stat-today');
    var elWeek = document.getElementById('stat-week');
    var elMonth = document.getElementById('stat-month');
    var elCount = document.getElementById('stat-order-count');
    var note = document.getElementById('dashboard-data-note');

    if (elToday) elToday.textContent = formatPrice(today);
    if (elWeek) elWeek.textContent = formatPrice(week);
    if (elMonth) elMonth.textContent = formatPrice(month);
    if (elCount) elCount.textContent = String(paidCount);

    if (note) {
      note.textContent =
        paidCount === 0
          ? 'Kayıtlı ödeme yok. Ödeme tamamlanınca (başarılı sayfa) bu tarayıcıda siparişler burada toplanır.'
          : 'Özet: bu tarayıcıdaki tamamlanan ödemeler (localStorage). Canlı çoklu cihaz için sunucu raporu gerekir.';
    }
  }

  updateDashboard();
})();
