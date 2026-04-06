/**
 * Ürün detay sayfası — ?id= ile ürün özellikleri
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function formatPrice(n) {
    return typeof I18N !== 'undefined' && I18N.formatPrice
      ? I18N.formatPrice(n)
      : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n);
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem('dinamik_cart') || '[]');
    } catch (e) {
      return [];
    }
  }

  function setCart(items) {
    localStorage.setItem('dinamik_cart', JSON.stringify(items));
    updateCartCount();
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

  function renderImage(p) {
    var img = (p.image || '').trim();
    if (img && (img.indexOf('http') === 0 || img.indexOf('/') === 0 || img.indexOf('images/') === 0)) {
      return '<img src="' + esc(img) + '" alt="' + esc(p.name) + '" class="product-detail-image" loading="eager" width="600" height="400" decoding="async">';
    }
    return '<div class="product-detail-image-placeholder">' + esc(p.image || '📦') + '</div>';
  }

  function render() {
    var root = document.getElementById('product-detail-root');
    if (!root) return;

    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var list = typeof getProducts === 'function' ? getProducts() : (typeof PRODUCTS !== 'undefined' ? PRODUCTS : []);
    var p = id ? list.find(function (x) { return x.id === id; }) : null;

    if (!p) {
      document.title = (typeof I18N !== 'undefined' ? I18N.t('product_detail_not_found') : 'Ürün bulunamadı') + ' | Dinamik POS';
      root.innerHTML = '<div class="card product-detail-empty">' +
        '<p>' + (typeof I18N !== 'undefined' ? I18N.t('product_detail_not_found') : 'Ürün bulunamadı.') + '</p>' +
        '<a href="urunler.html" class="btn btn-primary">' + (typeof I18N !== 'undefined' ? I18N.t('browse_products') : 'Ürünlere Göz At') + '</a></div>';
      return;
    }

    document.title = esc(p.name) + ' | Dinamik POS';

    var catLabel = typeof getCategoryLabel === 'function' ? getCategoryLabel(p.category) : p.category;
    var oldPriceHtml = p.oldPrice
      ? '<span class="product-old-price">' + formatPrice(p.oldPrice) + '</span>'
      : '';
    var features = Array.isArray(p.features) ? p.features : [];
    var featuresHtml = features.length
      ? '<h2 class="product-detail-section-title">' + (typeof I18N !== 'undefined' ? I18N.t('product_detail_features') : 'Özellikler') + '</h2>' +
        '<ul class="product-detail-features">' + features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>'
      : '';

    var seoBlock = '';
    if (p.seoTitle || p.seoDesc) {
      seoBlock = '<div class="product-detail-seo">' +
        (p.seoTitle ? '<p class="product-detail-seo-line"><strong>' + esc(p.seoTitle) + '</strong></p>' : '') +
        (p.seoDesc ? '<p class="product-detail-seo-line">' + esc(p.seoDesc) + '</p>' : '') +
        '</div>';
    }

    var desc = (p.desc || '').trim() ? '<div class="product-detail-desc">' + esc(p.desc).replace(/\n/g, '<br>') + '</div>' : '';

    root.innerHTML = '<article class="product-detail-article card">' +
      '<div class="product-detail-grid">' +
        '<div class="product-detail-media">' + renderImage(p) + '</div>' +
        '<div class="product-detail-info">' +
          '<span class="product-category">' + esc(catLabel) + '</span>' +
          '<h1 class="product-detail-title">' + esc(p.name) + '</h1>' +
          '<div class="product-price-row">' +
            '<span class="product-price">' + formatPrice(p.price || 0) + '</span>' + oldPriceHtml +
          '</div>' +
          desc +
          featuresHtml +
          seoBlock +
          '<div class="product-detail-actions">' +
          '<button type="button" class="btn btn-primary btn-lg product-detail-add-btn" data-id="' + esc(p.id) + '">' +
            (typeof I18N !== 'undefined' ? I18N.t('add_to_cart') : 'Sepete Ekle') +
          '</button>' +
          '<a href="#" class="btn btn-whatsapp btn-lg product-detail-wa" target="_blank" rel="noopener noreferrer" data-i18n="product_detail_whatsapp">WhatsApp ile Yaz</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</article>';

    if (typeof I18N !== 'undefined' && I18N.applyAll) {
      I18N.applyAll();
    }
    var waLink = root.querySelector('.product-detail-wa');
    if (waLink) {
      var waMsgTpl = typeof I18N !== 'undefined' ? I18N.t('product_detail_wa_msg') : 'Merhaba, {name} ürünü hakkında bilgi almak istiyorum.';
      var waMsg = waMsgTpl.replace(/\{name\}/g, p.name);
      waLink.href = window.DinamikConfig && typeof DinamikConfig.getWhatsAppUrl === 'function'
        ? DinamikConfig.getWhatsAppUrl(waMsg)
        : 'https://wa.me/905322652660?text=' + encodeURIComponent(waMsg);
    }

    root.querySelector('.product-detail-add-btn').addEventListener('click', function () {
      addToCart(p);
      var btn = root.querySelector('.product-detail-add-btn');
      if (btn) {
        btn.textContent = (typeof I18N !== 'undefined' ? I18N.t('product_detail_added') : 'Sepete eklendi ✓');
        btn.disabled = true;
        setTimeout(function () {
          btn.textContent = typeof I18N !== 'undefined' ? I18N.t('add_to_cart') : 'Sepete Ekle';
          btn.disabled = false;
        }, 1800);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      render();
      updateCartCount();
    });
  } else {
    render();
    updateCartCount();
  }

  window.addEventListener('dinamik:langchange', render);
})();
