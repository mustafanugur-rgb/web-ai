/**
 * Yazılım paketleri yönetimi (ana sayfa) — localStorage
 */
(function () {
  'use strict';

  function slugId(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'plan-' + Date.now();
  }

  function renderTable() {
    var tbody = document.getElementById('pricing-plans-tbody');
    var empty = document.getElementById('pricing-plans-empty');
    if (!tbody || typeof getPricingPlans !== 'function') return;

    var list = getPricingPlans();
    if (list.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = list
      .map(function (p, idx) {
        var priceCell = p.isCustomPrice
          ? (p.customPriceText || 'Özel')
          : String(p.priceMonthly || 0) + ' ₺/ay';
        return (
          '<tr data-id="' +
          (p.id || '').replace(/"/g, '&quot;') +
          '">' +
          '<td><strong>' +
          (p.name || '').replace(/</g, '&lt;') +
          '</strong><br><span class="stat-meta">' +
          (p.id || '').replace(/</g, '&lt;') +
          '</span></td>' +
          '<td>' +
          priceCell.replace(/</g, '&lt;') +
          '</td>' +
          '<td>' +
          (p.featured ? 'Evet' : '—') +
          '</td>' +
          '<td>' +
          '<div class="product-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm pp-up" data-idx="' +
          idx +
          '" ' +
          (idx === 0 ? 'disabled' : '') +
          '>↑</button> ' +
          '<button type="button" class="btn btn-secondary btn-sm pp-down" data-idx="' +
          idx +
          '" ' +
          (idx === list.length - 1 ? 'disabled' : '') +
          '>↓</button> ' +
          '<button type="button" class="btn btn-secondary btn-edit-pp" data-id="' +
          (p.id || '').replace(/"/g, '&quot;') +
          '">Düzenle</button> ' +
          '<button type="button" class="btn btn-secondary btn-delete-pp" data-id="' +
          (p.id || '').replace(/"/g, '&quot;') +
          '">Sil</button>' +
          '</div>' +
          '</td>' +
          '</tr>'
        );
      })
      .join('');

    tbody.querySelectorAll('.btn-edit-pp').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal(btn.getAttribute('data-id'));
      });
    });
    tbody.querySelectorAll('.btn-delete-pp').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Bu paketi silmek istediğinize emin misiniz?')) return;
        var id = btn.getAttribute('data-id');
        var next = getPricingPlans().filter(function (x) { return x.id !== id; });
        setPricingPlans(next);
        renderTable();
      });
    });
    tbody.querySelectorAll('.pp-up').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = parseInt(btn.getAttribute('data-idx'), 10);
        if (i <= 0) return;
        var arr = getPricingPlans().slice();
        var t = arr[i - 1];
        arr[i - 1] = arr[i];
        arr[i] = t;
        setPricingPlans(arr);
        renderTable();
      });
    });
    tbody.querySelectorAll('.pp-down').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = parseInt(btn.getAttribute('data-idx'), 10);
        var arr = getPricingPlans().slice();
        if (i >= arr.length - 1) return;
        var t = arr[i + 1];
        arr[i + 1] = arr[i];
        arr[i] = t;
        setPricingPlans(arr);
        renderTable();
      });
    });
  }

  function openModal(editId) {
    var modal = document.getElementById('pricing-plan-modal');
    var form = document.getElementById('pricing-plan-form');
    var title = document.getElementById('pp-modal-title');
    var idInput = document.getElementById('pp-id');
    if (!modal || !form || !idInput) return;

    form.reset();
    document.getElementById('pp-is-custom').checked = false;
    toggleCustomFields();

    if (editId) {
      var p = getPricingPlans().find(function (x) { return x.id === editId; });
      if (!p) return;
      if (title) title.textContent = 'Paketi Düzenle';
      idInput.value = p.id;
      idInput.readOnly = true;
      document.getElementById('pp-name').value = p.name || '';
      document.getElementById('pp-is-custom').checked = !!p.isCustomPrice;
      document.getElementById('pp-price').value = p.priceMonthly || '';
      document.getElementById('pp-custom-text').value = p.customPriceText || '';
      document.getElementById('pp-billing').value = p.billingLabel || '/ Ay';
      document.getElementById('pp-featured').checked = !!p.featured;
      document.getElementById('pp-features').value = (p.features || []).join('\n');
      document.getElementById('pp-primary-label').value = p.primaryBtnLabel || '';
      document.getElementById('pp-primary-href').value = p.primaryHref || '';
      document.getElementById('pp-secondary-label').value = p.secondaryBtnLabel || '';
      document.getElementById('pp-secondary-href').value = p.secondaryHref || '';
      toggleCustomFields();
    } else {
      if (title) title.textContent = 'Yeni Paket';
      idInput.value = '';
      idInput.readOnly = false;
      document.getElementById('pp-billing').value = '/ Ay';
    }

    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('pp-name').focus();
  }

  function toggleCustomFields() {
    var custom = document.getElementById('pp-is-custom');
    var isC = custom && custom.checked;
    var rowPrice = document.getElementById('pp-row-price');
    var rowCustom = document.getElementById('pp-row-custom');
    if (rowPrice) rowPrice.style.display = isC ? 'none' : '';
    if (rowCustom) rowCustom.style.display = isC ? '' : 'none';
  }

  function closeModal() {
    var modal = document.getElementById('pricing-plan-modal');
    if (modal) {
      modal.classList.remove('visible');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  function savePlan(e) {
    e.preventDefault();
    var form = e.target;
    var idInput = form.querySelector('#pp-id');
    var name = ((form.querySelector('#pp-name') && form.querySelector('#pp-name').value) || '').trim();
    var isCustom = !!(form.querySelector('#pp-is-custom') && form.querySelector('#pp-is-custom').checked);
    var isEdit = idInput && idInput.readOnly;
    var id = isEdit ? String(idInput.value || '').trim() : slugId((idInput && idInput.value) || name);
    if (!id) {
      alert('Paket adı veya kod (ID) gerekli.');
      return;
    }

    var plan = {
      id: id,
      name: name || id,
      isCustomPrice: isCustom,
      priceMonthly: isCustom ? 0 : parseInt(form.querySelector('#pp-price').value, 10) || 0,
      customPriceText: (form.querySelector('#pp-custom-text') && form.querySelector('#pp-custom-text').value) || 'Özel Teklif',
      billingLabel: (form.querySelector('#pp-billing') && form.querySelector('#pp-billing').value) || '/ Ay',
      featured: !!(form.querySelector('#pp-featured') && form.querySelector('#pp-featured').checked),
      features: (form.querySelector('#pp-features') && form.querySelector('#pp-features').value)
        ? form.querySelector('#pp-features').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean)
        : [],
      primaryBtnLabel: (form.querySelector('#pp-primary-label') && form.querySelector('#pp-primary-label').value) || 'Devam',
      primaryHref: (form.querySelector('#pp-primary-href') && form.querySelector('#pp-primary-href').value) || '#',
      secondaryBtnLabel: (form.querySelector('#pp-secondary-label') && form.querySelector('#pp-secondary-label').value) || 'İletişim',
      secondaryHref: (form.querySelector('#pp-secondary-href') && form.querySelector('#pp-secondary-href').value) || '#'
    };

    var list = getPricingPlans().slice();
    if (isEdit) {
      var idx = list.findIndex(function (x) { return x.id === id; });
      if (idx >= 0) list[idx] = plan;
    } else {
      if (list.some(function (x) { return x.id === plan.id; })) {
        alert('Bu kodda bir paket zaten var. Başka bir kod girin.');
        return;
      }
      list.push(plan);
    }

    setPricingPlans(list);
    renderTable();
    closeModal();

    if (typeof window.renderHomePricingPlans === 'function') {
      window.renderHomePricingPlans();
    }
  }

  document.getElementById('btn-add-pricing-plan')?.addEventListener('click', function () {
    openModal(null);
  });
  document.getElementById('btn-reset-pricing-plans')?.addEventListener('click', function () {
    if (!confirm('Tüm paketler varsayılan 3 pakete sıfırlansın mı?')) return;
    if (window.PRICING_PLANS_DEFAULT) {
      setPricingPlans(window.PRICING_PLANS_DEFAULT.slice());
      renderTable();
      if (typeof window.renderHomePricingPlans === 'function') window.renderHomePricingPlans();
    }
  });
  document.getElementById('pp-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('pp-modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('pricing-plan-modal')?.addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('pp-is-custom')?.addEventListener('change', toggleCustomFields);
  document.getElementById('pricing-plan-form')?.addEventListener('submit', savePlan);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  renderTable();
})();
