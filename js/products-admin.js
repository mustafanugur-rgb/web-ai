/**
 * Ürün yönetimi - Ekleme, düzenleme, silme
 */
(function () {
  'use strict';

  function formatPrice(n) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(n);
  }

  function generateId() {
    return 'p-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function updateStats(list) {
    var elT = document.getElementById('stat-products-total');
    var elC = document.getElementById('stat-products-categories');
    if (!elT && !elC) return;
    var cats = {};
    list.forEach(function (p) {
      var c = (p.category || '').trim() || '-';
      cats[c] = true;
    });
    if (elT) elT.textContent = String(list.length);
    if (elC) elC.textContent = String(Object.keys(cats).length);
  }

  function renderTable() {
    var list = getProducts();
    var tbody = document.getElementById('products-tbody');
    var empty = document.getElementById('products-empty');
    if (!tbody) return;

    updateStats(list);

    if (list.length === 0) {
      tbody.innerHTML = '';
      if (empty) {
        empty.style.display = 'block';
      }
      return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = list.map(function (p) {
      var imgHtml = (p.image && p.image.trim())
        ? '<img src="' + (p.image || '').replace(/"/g, '&quot;') + '" alt="" class="product-thumb" loading="lazy" decoding="async">'
        : '<div class="product-thumb-placeholder">📦</div>';
      var catLabel = typeof getCategoryLabel === 'function' ? getCategoryLabel(p.category) : p.category;
      return '<tr data-id="' + p.id + '">' +
        '<td>' + imgHtml + '</td>' +
        '<td><strong>' + (p.name || '') + '</strong></td>' +
        '<td>' + catLabel + '</td>' +
        '<td>' + formatPrice(p.price || 0) + '</td>' +
        '<td>' +
          '<div class="product-actions">' +
            '<button type="button" class="btn btn-secondary btn-edit" data-id="' + p.id + '">Düzenle</button>' +
            '<button type="button" class="btn btn-secondary btn-delete" data-id="' + p.id + '">Sil</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal(btn.getAttribute('data-id'));
      });
    });
    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
          deleteProduct(btn.getAttribute('data-id'));
        }
      });
    });
  }

  function deleteProduct(id) {
    var list = getProducts().filter(function (p) { return p.id !== id; });
    setProducts(list);
    renderTable();
  }

  function refreshCategoryDatalist() {
    var dl = document.getElementById('product-category-list');
    if (!dl || typeof DEFAULT_CATEGORY_LABELS === 'undefined') return;
    var seen = {};
    var labels = [];
    Object.keys(DEFAULT_CATEGORY_LABELS).forEach(function (slug) {
      var lbl = DEFAULT_CATEGORY_LABELS[slug];
      var k = lbl.toLocaleLowerCase('tr-TR');
      if (!seen[k]) {
        seen[k] = true;
        labels.push(lbl);
      }
    });
    if (typeof getExtraCategoryLabels === 'function') {
      var extra = getExtraCategoryLabels();
      Object.keys(extra).forEach(function (slug) {
        var lbl = extra[slug];
        var k = (lbl || '').toLocaleLowerCase('tr-TR');
        if (lbl && !seen[k]) {
          seen[k] = true;
          labels.push(lbl);
        }
      });
    }
    dl.innerHTML = labels.map(function (lbl) {
      return '<option value="' + String(lbl).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">';
    }).join('');
  }

  function openModal(editId) {
    var modal = document.getElementById('product-modal');
    var form = document.getElementById('product-form');
    var title = document.getElementById('modal-title');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('product-id').value = '';
    refreshCategoryDatalist();

    if (editId) {
      var p = getProducts().find(function (x) { return x.id === editId; });
      if (p) {
        title.textContent = 'Ürünü Düzenle';
        document.getElementById('product-id').value = p.id;
        document.getElementById('product-name').value = p.name || '';
        document.getElementById('product-category').value = typeof getCategoryLabel === 'function' ? getCategoryLabel(p.category || 'pos') : (p.category || 'pos');
        document.getElementById('product-price').value = p.price || '';
        document.getElementById('product-oldprice').value = p.oldPrice || '';
        document.getElementById('product-image').value = p.image || '';
        document.getElementById('product-desc').value = p.desc || '';
        document.getElementById('product-features').value = (p.features || []).join(', ');
        document.getElementById('product-seo-title').value = p.seoTitle || '';
        document.getElementById('product-seo-desc').value = p.seoDesc || '';
        document.getElementById('product-seo-keywords').value = Array.isArray(p.seoKeywords) ? p.seoKeywords.join(', ') : (p.seoKeywords || '');
      }
    } else {
      title.textContent = 'Yeni Ürün';
      var catInput = document.getElementById('product-category');
      if (catInput && typeof DEFAULT_CATEGORY_LABELS !== 'undefined') {
        catInput.value = DEFAULT_CATEGORY_LABELS.pos;
      }
    }

    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('product-name').focus();
  }

  function closeModal() {
    var modal = document.getElementById('product-modal');
    if (modal) {
      modal.classList.remove('visible');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  function saveProduct(data) {
    var list = getProducts();
    var id = data.id || generateId();
    var existing = list.findIndex(function (p) { return p.id === id; });

    var resolvedCat = typeof resolveCategoryFromInput === 'function'
      ? resolveCategoryFromInput(data.category)
      : { slug: data.category || 'pos', label: data.category };
    var product = {
      id: id,
      name: data.name.trim(),
      category: resolvedCat.slug || 'pos',
      price: parseInt(data.price, 10) || 0,
      oldPrice: data.oldPrice ? parseInt(data.oldPrice, 10) : undefined,
      image: data.image && data.image.trim() ? data.image.trim() : '',
      desc: data.desc ? data.desc.trim() : '',
      features: data.features
        ? data.features.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
        : [],
      seoTitle: data.seoTitle ? data.seoTitle.trim() : '',
      seoDesc: data.seoDesc ? data.seoDesc.trim() : '',
      seoKeywords: data.seoKeywords ? data.seoKeywords.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : []
    };

    if (existing >= 0) {
      list[existing] = product;
    } else {
      list.push(product);
    }
    setProducts(list);
    renderTable();
    closeModal();
  }

  document.getElementById('btn-add-product')?.addEventListener('click', function () {
    openModal(null);
  });
  document.getElementById('btn-add-empty')?.addEventListener('click', function () {
    openModal(null);
  });

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);

  document.getElementById('product-modal')?.addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  document.getElementById('product-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var data = {
      id: form.querySelector('#product-id').value || null,
      name: form.querySelector('#product-name').value,
      category: form.querySelector('#product-category').value,
      price: form.querySelector('#product-price').value,
      oldPrice: form.querySelector('#product-oldprice').value,
      image: form.querySelector('#product-image').value,
      desc: form.querySelector('#product-desc').value,
      features: form.querySelector('#product-features').value,
      seoTitle: form.querySelector('#product-seo-title').value,
      seoDesc: form.querySelector('#product-seo-desc').value,
      seoKeywords: form.querySelector('#product-seo-keywords').value
    };
    saveProduct(data);
  });

  /** Ürün görseli dosya yükleme — referanslardaki gibi sitede saklanır, 600×600 ölçü */
  (function () {
    var fileInput = document.getElementById('product-image-file');
    var urlInput = document.getElementById('product-image');
    var statusEl = document.getElementById('product-image-upload-status');
    if (!fileInput || !urlInput) return;
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var apiBase = typeof window.getDinamikApiBase === 'function' ? window.getDinamikApiBase() : (window.API_BASE || '');
      if (statusEl) { statusEl.style.display = ''; statusEl.textContent = 'Yükleniyor…'; }
      fetch(apiBase + '/api/csrf-token')
        .then(function (r) { return r.text().then(function (t) { var d; try { d = t && t.trim().indexOf('<') !== 0 ? JSON.parse(t) : {}; } catch (e) { d = {}; } return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error('CSRF alınamadı');
          var fd = new FormData();
          fd.append('image', file);
          return fetch(apiBase + '/api/upload/product-image', {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': (res.data && res.data.token) || '' },
            body: fd
          });
        })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Yükleme hatası'); return d; }); })
        .then(function (data) {
          if (data && data.url) {
            urlInput.value = data.url;
            if (statusEl) { statusEl.textContent = 'Görsel yüklendi (600×600).'; statusEl.style.display = ''; }
          }
          fileInput.value = '';
        })
        .catch(function (err) {
          if (statusEl) { statusEl.textContent = err.message || 'Yükleme başarısız (Node sunucusu gerekir).'; statusEl.style.display = ''; }
          fileInput.value = '';
        });
    });
  })();

  renderTable();
})();
