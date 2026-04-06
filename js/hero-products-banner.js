/**
 * Hero ürün banner - mağaza ürünlerini gösterir, tıklanınca urunler.html'e gider
 */
(function () {
  'use strict';

  function getProducts() {
    try {
      var stored = localStorage.getItem('dinamik_products');
      if (stored) {
        var arr = JSON.parse(stored);
        return Array.isArray(arr) && arr.length > 0 ? arr : (typeof PRODUCTS_DEFAULT !== 'undefined' ? PRODUCTS_DEFAULT : []);
      }
    } catch (e) {}
    return typeof PRODUCTS_DEFAULT !== 'undefined' ? PRODUCTS_DEFAULT : [];
  }

  function formatPrice(n) {
    return typeof I18N !== 'undefined' && I18N.formatPrice
      ? I18N.formatPrice(n)
      : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n);
  }

  function renderProduct(p) {
    var img = (p.image || '').trim();
    var imgHtml = (img && (img.indexOf('http') === 0 || img.indexOf('/') === 0 || img.indexOf('images/') === 0))
      ? '<img src="' + img.replace(/"/g, '&quot;') + '" alt="' + (p.name || '').replace(/"/g, '&quot;') + '" loading="lazy" decoding="async">'
      : '<span class="product-emoji">' + (p.image || '📦') + '</span>';
    var href = 'urun-detay.html?id=' + encodeURIComponent(p.id || '');
    return '<a href="' + href + '" class="hero-products-banner-item hero-products-banner-link">' +
      imgHtml +
      '<div class="hero-products-banner-item-info">' +
      '<span class="hero-products-banner-item-name">' + (p.name || '').replace(/</g, '&lt;') + '</span>' +
      '<span class="hero-products-banner-item-price">' + formatPrice(p.price || 0) + '</span></div>' +
      '</a>';
  }

  function renderBanner() {
    var container = document.getElementById('hero-products-banner-items');
    var banner = document.getElementById('hero-products-banner');
    if (!container || !banner) return;

    var products = getProducts();
    if (!products.length) {
      banner.style.display = 'none';
      return;
    }

    var itemsHtml = products.map(renderProduct).join('');
    var useMarquee = products.length >= 4;

    if (useMarquee) {
      container.classList.add('hero-products-banner-marquee');
      container.innerHTML = '<div class="hero-products-banner-marquee-inner">' +
        '<div class="hero-products-banner-track">' + itemsHtml + '</div>' +
        '<div class="hero-products-banner-track" aria-hidden="true">' + itemsHtml + '</div>' +
        '</div>';
    } else {
      container.classList.remove('hero-products-banner-marquee');
      container.innerHTML = itemsHtml;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBanner);
  } else {
    renderBanner();
  }

  window.addEventListener('dinamik:langchange', renderBanner);
})();
