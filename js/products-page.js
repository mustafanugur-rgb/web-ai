/**
 * Ürünler sayfası - render, filtre, sepete ekle
 */

(function () {
  'use strict';

  function formatPrice(n) {
    return typeof I18N !== 'undefined' && I18N.formatPrice
      ? I18N.formatPrice(n)
      : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n);
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem('dinamik_cart') || '[]');
    } catch {
      return [];
    }
  }

  function setCart(items) {
    localStorage.setItem('dinamik_cart', JSON.stringify(items));
    updateCartCount();
  }

  function addToCart(product, qty) {
    qty = qty || 1;
    var cart = getCart();
    var found = cart.find(function (p) { return p.id === product.id; });
    if (found) {
      found.qty = (found.qty || 1) + qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        qty: qty,
        image: product.image
      });
    }
    setCart(cart);
  }

  function updateCartCount() {
    var cart = getCart();
    var total = cart.reduce(function (s, p) { return s + (p.qty || 1); }, 0);
    var el = document.getElementById('nav-cart-count');
    if (el) {
      el.textContent = total;
      el.setAttribute('data-count', total);
    }
  }

  function escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function renderProduct(p, category) {
    var catLabel = typeof getCategoryLabel === 'function' ? getCategoryLabel(p.category) : p.category;
    var oldPriceHtml = p.oldPrice
      ? '<span class="product-old-price">' + formatPrice(p.oldPrice) + '</span>'
      : '';
    var featuresHtml = (p.features || []).slice(0, 3).map(function (f) {
      return '<li>' + f + '</li>';
    }).join('');
    var img = (p.image || '').trim();
    var imageHtml = (img && (img.indexOf('http') === 0 || img.indexOf('/') === 0 || img.indexOf('images/') === 0))
      ? '<img src="' + img.replace(/"/g, '&quot;') + '" alt="' + (p.name || '').replace(/"/g, '&quot;') + '" loading="lazy" decoding="async">'
      : '<span class="product-emoji">' + (p.image || '') + '</span>';
    var detailHref = 'urun-detay.html?id=' + encodeURIComponent(p.id);
    var detailLabel = typeof I18N !== 'undefined' ? I18N.t('detail') : 'Detay';

    return '<article class="product-card card" data-category="' + p.category + '">' +
      '<a href="' + detailHref + '" class="product-card-link" aria-label="' + detailLabel + ': ' + (p.name || '').replace(/"/g, '&quot;') + '">' +
      '<div class="product-image">' + imageHtml + '</div>' +
      '</a>' +
      '<div class="product-body">' +
        '<span class="product-category">' + catLabel + '</span>' +
        '<a href="' + detailHref + '" class="product-name-link"><h2 class="product-name">' + p.name + '</h2></a>' +
        '<p class="product-desc">' + p.desc + '</p>' +
        '<div class="product-price-row">' +
          '<span class="product-price">' + formatPrice(p.price) + '</span>' +
          oldPriceHtml +
        '</div>' +
        '<ul class="product-features">' + featuresHtml + '</ul>' +
        '<button class="btn btn-primary btn-block add-to-cart-btn" data-id="' + p.id + '" data-i18n="add_to_cart">' + (typeof I18N !== 'undefined' ? I18N.t('add_to_cart') : 'Sepete Ekle') + '</button>' +
      '</div>' +
    '</article>';
  }

  function renderProducts(category) {
    var grid = document.getElementById('products-grid');
    if (!grid) return;

    var list = (typeof getProducts === 'function' ? getProducts() : PRODUCTS).filter(function (p) {
      return category === 'all' || p.category === category;
    });

    grid.innerHTML = list.map(function (p) { return renderProduct(p); }).join('');

    grid.querySelectorAll('.add-to-cart-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var list = typeof getProducts === 'function' ? getProducts() : PRODUCTS;
        var p = list.find(function (x) { return x.id === id; });
        if (p) {
          addToCart(p);
          btn.textContent = 'Eklendi ✓';
          btn.disabled = true;
          setTimeout(function () {
            btn.textContent = typeof I18N !== 'undefined' ? I18N.t('add_to_cart') : 'Sepete Ekle';
            btn.disabled = false;
          }, 1500);
        }
      });
    });
  }

  function buildProductFilters() {
    var wrap = document.getElementById('products-filters');
    if (!wrap || typeof getCategoryListForFilters !== 'function') return;
    var allText = typeof I18N !== 'undefined' ? I18N.t('filter_all') : 'Tümü';
    var cats = getCategoryListForFilters();
    var html = '<button type="button" class="filter-btn active" data-category="all" data-i18n="filter_all">' + escAttr(allText) + '</button>';
    cats.forEach(function (c) {
      html += '<button type="button" class="filter-btn" data-category="' + escAttr(c.slug) + '">' + escAttr(c.label) + '</button>';
    });
    wrap.innerHTML = html;
    if (typeof I18N !== 'undefined' && I18N.applyAll) I18N.applyAll();
    wrap.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        wrap.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderProducts(btn.getAttribute('data-category'));
      });
    });
  }

  buildProductFilters();

  window.addEventListener('dinamik:langchange', function () {
    var active = document.querySelector('.filter-btn.active');
    var cat = active ? active.getAttribute('data-category') : 'all';
    var first = document.querySelector('#products-filters .filter-btn[data-category="all"]');
    if (first && typeof I18N !== 'undefined') first.textContent = I18N.t('filter_all');
    renderProducts(cat || 'all');
  });

  var params = new URLSearchParams(window.location.search);
  var cat = params.get('cat') || params.get('category') || 'all';
  if (cat !== 'all') {
    var catBtn = document.querySelector('.filter-btn[data-category="' + cat + '"]');
    if (catBtn) {
      document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
      catBtn.classList.add('active');
      renderProducts(cat);
    } else {
      renderProducts('all');
    }
  } else {
    renderProducts('all');
  }
  updateCartCount();
})();
