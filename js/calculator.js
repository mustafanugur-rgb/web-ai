/**
 * Revenue Calculator - Loss Estimation
 * Converts user inputs to monthly loss estimate
 */

(function () {
  'use strict';

  const dailyCustomers = document.getElementById('daily-customers');
  const avgTicket = document.getElementById('avg-ticket');
  const lossPercent = document.getElementById('loss-percent');
  const lossDisplay = document.getElementById('loss-display');
  const monthlyLossEl = document.getElementById('monthly-loss');

  if (!dailyCustomers || !avgTicket || !lossPercent || !monthlyLossEl) return;

  function formatCurrency(num) {
    if (typeof I18N !== 'undefined' && I18N.formatPrice) {
      return I18N.formatPrice(num);
    }
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }

  function calculate() {
    const customers = parseInt(dailyCustomers.value, 10) || 0;
    const ticket = parseFloat(avgTicket.value) || 0;
    const loss = parseInt(lossPercent.value, 10) || 0;

    const dailyRevenue = customers * ticket;
    const monthlyRevenue = dailyRevenue * 30;
    const monthlyLoss = monthlyRevenue * (loss / 100);

    monthlyLossEl.textContent = formatCurrency(monthlyLoss);
    if (lossDisplay) lossDisplay.textContent = loss + '%';
  }

  [dailyCustomers, avgTicket, lossPercent].forEach(function (el) {
    if (el) {
      el.addEventListener('input', calculate);
      el.addEventListener('change', calculate);
    }
  });

  calculate();

  window.addEventListener('dinamik:langchange', calculate);
})();
