/**
 * Kampanyalar — ekleme, düzenleme, silme (dinamik_campaigns)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dinamik_campaigns';

  var DEFAULTS = [
    { id: 'c1', name: 'Yaz İndirimi', status: 'active', revenue: 12400, spend: 1200 },
    { id: 'c2', name: 'Doğum Günü Kampanyası', status: 'new', revenue: 3100, spend: 450 }
  ];

  function getCampaigns() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        var arr = JSON.parse(stored);
        return Array.isArray(arr) ? arr : [];
      }
    } catch (e) {}
    return DEFAULTS.map(function (c) {
      return Object.assign({}, c);
    });
  }

  function setCampaigns(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    try {
      window.dispatchEvent(new CustomEvent('dinamik:campaigns-updated'));
    } catch (e) {}
  }

  function generateId() {
    return 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  var modal = document.getElementById('campaign-modal');
  var form = document.getElementById('campaign-form');

  function openModal(id) {
    if (!modal || !form) return;
    form.reset();
    document.getElementById('campaign-id').value = '';
    document.getElementById('campaign-modal-title').textContent = 'Yeni Kampanya';
    document.getElementById('campaign-revenue').value = '0';
    document.getElementById('campaign-spend').value = '0';
    document.getElementById('campaign-status').value = 'active';

    if (id) {
      var list = getCampaigns();
      var c = list.find(function (x) {
        return x.id === id;
      });
      if (c) {
        document.getElementById('campaign-modal-title').textContent = 'Kampanya Düzenle';
        document.getElementById('campaign-id').value = c.id;
        document.getElementById('campaign-name').value = c.name || '';
        document.getElementById('campaign-status').value = c.status === 'passive' ? 'passive' : c.status === 'new' ? 'new' : 'active';
        document.getElementById('campaign-revenue').value = String(c.revenue != null ? c.revenue : 0);
        document.getElementById('campaign-spend').value = String(c.spend != null ? c.spend : 0);
      }
    }

    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
  }

  function render() {
    var list = getCampaigns();
    var grid = document.getElementById('campaigns-grid');
    var empty = document.getElementById('campaigns-empty');
    if (!grid) return;

    if (list.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    grid.innerHTML = list
      .map(function (c) {
        var spend = parseFloat(c.spend) || 0;
        var revenue = parseFloat(c.revenue) || 0;
        var roi = spend > 0 ? (revenue / spend).toFixed(1).replace('.', ',') + 'x' : '—';
        var badge =
          c.status === 'active' ? 'badge-success' : c.status === 'new' ? 'badge-accent' : 'badge-warning';
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
          revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) +
          '</span> Gelir</div>' +
          '<div><span class="campaign-stat-value">₺' +
          spend.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) +
          '</span> Harcama</div>' +
          '<div><span class="campaign-stat-value accent">' +
          esc(roi) +
          '</span> ROI</div>' +
          '</div>' +
          '<div class="product-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm btn-edit-campaign" data-id="' +
          esc(c.id) +
          '">Düzenle</button>' +
          '<button type="button" class="btn btn-secondary btn-sm btn-delete-campaign" data-id="' +
          esc(c.id) +
          '">Sil</button>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');

    grid.querySelectorAll('.btn-edit-campaign').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal(btn.getAttribute('data-id'));
      });
    });
    grid.querySelectorAll('.btn-delete-campaign').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cid = btn.getAttribute('data-id');
        if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;
        var next = getCampaigns().filter(function (x) {
          return x.id !== cid;
        });
        setCampaigns(next);
        render();
      });
    });
  }

  document.getElementById('btn-add-campaign')?.addEventListener('click', function () {
    openModal(null);
  });
  document.getElementById('btn-add-campaign-empty')?.addEventListener('click', function () {
    openModal(null);
  });

  document.getElementById('campaign-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('campaign-modal-cancel')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  form?.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = (document.getElementById('campaign-id').value || '').trim();
    var name = (document.getElementById('campaign-name').value || '').trim();
    var status = document.getElementById('campaign-status').value || 'active';
    var revenue = parseFloat(document.getElementById('campaign-revenue').value) || 0;
    var spend = parseFloat(document.getElementById('campaign-spend').value) || 0;

    if (name.length < 2) {
      alert('Kampanya adı en az 2 karakter olmalı.');
      return;
    }

    var list = getCampaigns();
    var payload = {
      id: id || generateId(),
      name: name,
      status: status,
      revenue: Math.max(0, revenue),
      spend: Math.max(0, spend)
    };

    if (id) {
      var idx = list.findIndex(function (x) {
        return x.id === id;
      });
      if (idx >= 0) list[idx] = payload;
      else list.push(payload);
    } else {
      list.push(payload);
    }

    setCampaigns(list);
    closeModal();
    render();
  });

  render();
})();
