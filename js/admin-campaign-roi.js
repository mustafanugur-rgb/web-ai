/**
 * Dashboard — Kampanya ROI kartları (dinamik_campaigns, kampanyalar sayfası ile aynı kaynak)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dinamik_campaigns';

  function getCampaigns() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        var arr = JSON.parse(stored);
        return Array.isArray(arr) ? arr : [];
      }
    } catch (e) {}
    return [
      { id: 'c1', name: 'Yaz İndirimi', status: 'active', revenue: 12400, spend: 1200 },
      { id: 'c2', name: 'Doğum Günü Kampanyası', status: 'new', revenue: 3100, spend: 450 }
    ];
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function formatMoney(n) {
    return (n || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  }

  function render() {
    var grid = document.getElementById('campaign-roi-grid');
    var note = document.getElementById('campaign-roi-note');
    if (!grid) return;

    var raw = getCampaigns();
    var hasStored = false;
    try {
      hasStored = !!localStorage.getItem(STORAGE_KEY);
    } catch (e) {}

    var list = raw.slice().sort(function (a, b) {
      return (b.revenue || 0) - (a.revenue || 0);
    });
    var top = list.slice(0, 4);

    if (note) {
      if (!hasStored) {
        note.textContent =
          'Örnek kampanya verileri gösteriliyor. Kampanyalar sayfasından düzenleyip kaydettiğinizde burası güncellenir.';
      } else if (!raw.length) {
        note.textContent = 'Kayıtlı kampanya yok. Kampanyalar sayfasından gelir/harcama girebilirsiniz.';
      } else {
        note.textContent = 'Gelir ve harcama değerleri Kampanyalar’da girdiğiniz rakamlardır (bu tarayıcı).';
      }
    }

    if (!top.length) {
      grid.innerHTML =
        '<div class="card" style="padding: var(--space-6); text-align: center;"><p class="stat-meta" style="margin:0;">Gösterilecek kampanya yok.</p>' +
        '<p style="margin-top: var(--space-3);"><a href="kampanyalar.html" class="btn btn-primary btn-sm">Kampanyalar</a></p></div>';
      return;
    }

    grid.innerHTML = top
      .map(function (c) {
        var spend = c.spend || 0;
        var revenue = c.revenue || 0;
        var roi =
          spend > 0 ? (revenue / spend).toFixed(1).replace('.', ',') + 'x' : '—';
        var badge =
          c.status === 'active'
            ? 'badge-success'
            : c.status === 'new'
              ? 'badge-accent'
              : 'badge-warning';
        var statusText =
          c.status === 'active' ? 'Aktif' : c.status === 'new' ? 'Yeni' : 'Pasif';
        return (
          '<article class="card campaign-card">' +
          '<div class="campaign-header">' +
          '<span class="campaign-name">' +
          esc(c.name || 'Kampanya') +
          '</span>' +
          '<span class="badge ' +
          badge +
          '">' +
          statusText +
          '</span>' +
          '</div>' +
          '<div class="campaign-stats">' +
          '<div><span class="campaign-stat-value">₺' +
          formatMoney(revenue) +
          '</span> Gelir</div>' +
          '<div><span class="campaign-stat-value">₺' +
          formatMoney(spend) +
          '</span> Harcama</div>' +
          '<div><span class="campaign-stat-value accent">' +
          esc(roi) +
          '</span> ROI</div>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');
  }

  render();

  window.addEventListener('dinamik:campaigns-updated', render);
})();

