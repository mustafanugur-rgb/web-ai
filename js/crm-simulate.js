/**
 * CRM - AI asistan lead listesi
 */

(function () {
  'use strict';

  var overlay = document.getElementById('loading-overlay');
  var searchInput = document.getElementById('customer-search');
  var customersTbody = document.getElementById('customers-tbody');
  var allLeads = [];

  function getInitials(name) {
    if (!name || name === '-') return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name[0] || '?').toUpperCase();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    return d.toLocaleString('tr-TR');
  }

  function packageBadgeClass(pkg) {
    if (pkg === 'Zincir') return 'badge-accent';
    if (pkg === 'Profesyonel') return 'badge-success';
    return 'badge-warning';
  }

  function updateSegmentCards(leads) {
    var zincir = leads.filter(function (l) { return l.recommended_package === 'Zincir'; });
    var profesyonel = leads.filter(function (l) { return l.recommended_package === 'Profesyonel'; });
    var baslangic = leads.filter(function (l) { return l.recommended_package === 'Baslangic'; });
    var oneWeek = leads.filter(function (l) {
      var d = new Date(l.created_at);
      return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
    });

    var cards = document.querySelectorAll('.segment-card');
    if (cards[0]) {
      cards[0].querySelector('.segment-count').textContent = zincir.length + ' lead';
      cards[0].querySelector('.segment-value').textContent = String(zincir.length);
    }
    if (cards[1]) {
      cards[1].querySelector('.segment-count').textContent = profesyonel.length + ' lead';
      cards[1].querySelector('.segment-value').textContent = String(profesyonel.length);
    }
    if (cards[2]) {
      cards[2].querySelector('.segment-count').textContent = baslangic.length + ' lead';
      cards[2].querySelector('.segment-value').textContent = String(baslangic.length);
    }
    if (cards[3]) {
      cards[3].querySelector('.segment-count').textContent = oneWeek.length + ' lead';
      cards[3].querySelector('.segment-value').textContent = String(oneWeek.length);
    }
  }

  function renderCustomers(list) {
    if (!customersTbody) return;
    if (!list || list.length === 0) {
      customersTbody.innerHTML = '<tr><td colspan="6"><div class="table-empty"><div class="table-empty-icon">👥</div><p>Henuz lead yok</p><p class="stat-meta">AI satis asistanindan gelen leadler burada listelenir.</p></div></td></tr>';
      return;
    }
    customersTbody.innerHTML = list.map(function (c) {
      var badge = packageBadgeClass(c.recommended_package);
      return '<tr><td><div class="customer-cell"><span class="customer-avatar">' + getInitials(c.name) + '</span><span class="customer-name">' + c.name + '</span></div></td><td>' + (c.phone || '-') + '</td><td><span class="badge ' + badge + '">' + (c.recommended_package || '-') + '</span></td><td>' + (c.business_name || '-') + '</td><td>' + formatDate(c.created_at) + '</td><td><span class="badge badge-success">Yeni</span></td></tr>';
    }).join('');
  }

  function filterCustomers(customers, query) {
    if (!query || query.trim() === '') return customers;
    var q = query.toLowerCase().trim();
    return customers.filter(function (c) {
      return (c.name && c.name.toLowerCase().indexOf(q) >= 0) ||
             (c.phone && c.phone.replace(/\s/g, '').indexOf(q) >= 0) ||
             (c.business_name && c.business_name.toLowerCase().indexOf(q) >= 0) ||
             (c.recommended_package && c.recommended_package.toLowerCase().indexOf(q) >= 0);
    });
  }

  function onSearch() {
    var query = searchInput ? searchInput.value : '';
    renderCustomers(filterCustomers(allLeads, query));
  }

  if (overlay) {
    overlay.classList.add('visible');
    setTimeout(function () {
      overlay.classList.remove('visible');
    }, 400);
  }

  if (searchInput) {
    searchInput.addEventListener('input', onSearch);
    searchInput.addEventListener('search', onSearch);
  }

  function loadLeads() {
    var base = typeof window.getDinamikApiBase === 'function' ? window.getDinamikApiBase() : '';
    return fetch((base || '') + '/api/leads')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        allLeads = (d && d.leads && Array.isArray(d.leads)) ? d.leads : [];
        updateSegmentCards(allLeads);
        renderCustomers(allLeads);
      })
      .catch(function () {
        allLeads = [];
        renderCustomers([]);
      })
      .finally(function () {
        if (overlay) overlay.classList.remove('visible');
      });
  }

  loadLeads();
})();
