/**
 * Panel analitik — localStorage siparişleri (dinamik_orders)
 */
(function () {
  'use strict';

  var MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem('dinamik_orders') || '[]');
    } catch (e) {
      return [];
    }
  }

  function orderDate(o) {
    if (!o || !o.date) return null;
    var d = new Date(o.date);
    return isNaN(d.getTime()) ? null : d;
  }

  function isPaid(o) {
    return o && (o.status === 'paid' || o.status === 'Tamamlandı');
  }

  function parseTotal(o) {
    var t = parseFloat(o.total);
    return isFinite(t) && t > 0 ? t : 0;
  }

  function revenueForPredicate(orders, pred) {
    return orders.filter(function (o) {
      if (!isPaid(o)) return false;
      var t = parseTotal(o);
      if (t <= 0) return false;
      var d = orderDate(o);
      if (!d) return false;
      return pred(d);
    }).reduce(function (s, o) {
      return s + parseTotal(o);
    }, 0);
  }

  function todayPredicate(d) {
    var now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  function weekPredicate(d) {
    var now = new Date();
    var day = now.getDay();
    var mondayOffset = day === 0 ? -6 : 1 - day;
    var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return d >= monday && d <= now;
  }

  function monthPredicate(d) {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return d >= start && d <= now;
  }

  function revenueToday() {
    return revenueForPredicate(getOrders(), todayPredicate);
  }

  function revenueWeek() {
    return revenueForPredicate(getOrders(), weekPredicate);
  }

  function revenueMonth() {
    return revenueForPredicate(getOrders(), monthPredicate);
  }

  function paidOrderCount() {
    return getOrders().filter(isPaid).length;
  }

  /** Son n takvim ayı — ödenen sipariş cirosu (grafik için) */
  function revenueLastNMonths(n) {
    var orders = getOrders().filter(isPaid);
    var now = new Date();
    var result = [];
    var i;
    var d;
    var y;
    var m;
    var start;
    var end;
    var amount;

    for (i = n - 1; i >= 0; i--) {
      d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      y = d.getFullYear();
      m = d.getMonth();
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      amount = orders.reduce(function (s, o) {
        var od = orderDate(o);
        if (!od || od < start || od > end) return s;
        return s + parseTotal(o);
      }, 0);
      result.push({
        label: MONTHS_TR[m],
        amount: amount,
        year: y,
        month: m
      });
    }
    return result;
  }

  /** Yüzde yükseklik (8–100), max’a göre */
  function barHeightsPercents(amounts) {
    var max = Math.max.apply(null, amounts.concat([1]));
    return amounts.map(function (a) {
      if (a <= 0) return 8;
      return Math.max(8, Math.round((a / max) * 100));
    });
  }

  window.DinamikAnalytics = {
    getOrders: getOrders,
    orderDate: orderDate,
    isPaid: isPaid,
    parseTotal: parseTotal,
    revenueToday: revenueToday,
    revenueWeek: revenueWeek,
    revenueMonth: revenueMonth,
    paidOrderCount: paidOrderCount,
    revenueLastNMonths: revenueLastNMonths,
    barHeightsPercents: barHeightsPercents
  };
})();
