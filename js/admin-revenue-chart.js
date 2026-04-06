/**
 * Dashboard — son 6 ay gelir çubukları (localStorage ödenen siparişler)
 */
(function () {
  'use strict';

  function run() {
    var DA = window.DinamikAnalytics;
    if (!DA) return;

    var wrap = document.getElementById('revenue-chart-bars');
    if (!wrap) return;

    var series = DA.revenueLastNMonths(6);
    var amounts = series.map(function (x) {
      return x.amount;
    });
    var heights = DA.barHeightsPercents(amounts);
    var maxAmt = Math.max.apply(null, amounts.concat([0]));

    wrap.innerHTML = series
      .map(function (x, i) {
        var isLast = i === series.length - 1;
        var h = heights[i];
        return (
          '<div class="chart-bar' +
          (isLast ? ' accent' : '') +
          '" style="--height: ' +
          h +
          '%"><span title="' +
          (x.amount > 0 ? x.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '₺0') +
          '">' +
          x.label +
          '</span></div>'
        );
      })
      .join('');

    var summary = document.getElementById('revenue-chart-summary');
    if (summary) {
      var total = amounts.reduce(function (a, b) {
        return a + b;
      }, 0);
      var avg = amounts.length ? total / amounts.length : 0;
      summary.innerHTML =
        'Son 6 ay toplam <strong>' +
        total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }) +
        '</strong> · en yüksek ay <strong>' +
        maxAmt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }) +
        '</strong> · ortalama <strong>' +
        avg.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }) +
        '</strong>';
    }
  }

  run();
})();
