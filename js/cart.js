/**
 * Sepet sayfası - ürün listesi, toplam, silme
 */

(function () {
  'use strict';

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem('dinamik_cart') || '[]');
    } catch {
      return [];
    }
  }

  function setCart(items) {
    localStorage.setItem('dinamik_cart', JSON.stringify(items));
  }

  function formatPrice(n) {
    return typeof I18N !== 'undefined' && I18N.formatPrice
      ? I18N.formatPrice(n)
      : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n);
  }

  function getSubtotal(items) {
    return items.reduce(function (s, p) {
      return s + (p.price || 0) * (p.qty || 1);
    }, 0);
  }

  function renderCart() {
    var items = getCart();
    var emptyEl = document.getElementById('cart-empty');
    var contentEl = document.getElementById('cart-content');
    var itemsEl = document.getElementById('cart-items');

    if (!items.length) {
      if (emptyEl) emptyEl.style.display = 'block';
      if (contentEl) contentEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'grid';

    var subtotal = getSubtotal(items);
    var kdv = subtotal * 0.18;
    var total = subtotal + kdv;

    itemsEl.innerHTML = items.map(function (p, i) {
      var qty = p.qty || 1;
      var lineTotal = (p.price || 0) * qty;
      var imgHtml = (typeof p.image === 'string' && p.image.indexOf('http') === 0)
        ? '<img src="' + p.image + '" alt="" loading="lazy" decoding="async">'
        : '<span class="cart-emoji">' + (p.image || '📦') + '</span>';
      return '<div class="cart-item" data-id="' + p.id + '">' +
        '<div class="cart-item-image">' + imgHtml + '</div>' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + p.name + '</div>' +
          '<div class="cart-item-price">' + formatPrice(p.price) + ' x ' + qty + ' = ' + formatPrice(lineTotal) + '</div>' +
        '</div>' +
        '<div class="cart-item-actions">' +
          '<div class="cart-item-qty">' +
            '<button type="button" data-action="minus" data-id="' + p.id + '">−</button>' +
            '<span>' + qty + '</span>' +
            '<button type="button" data-action="plus" data-id="' + p.id + '">+</button>' +
          '</div>' +
          '<button type="button" class="cart-item-remove" data-action="remove" data-id="' + p.id + '" data-i18n="remove">' + (typeof I18N !== 'undefined' ? I18N.t('remove') : 'Sil') + '</button>' +
        '</div>' +
      '</div>';
    }).join('');

    document.getElementById('cart-subtotal').textContent = formatPrice(subtotal);
    document.getElementById('cart-kdv').textContent = formatPrice(kdv);
    document.getElementById('cart-total').textContent = formatPrice(total);

    itemsEl.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var action = btn.getAttribute('data-action');
        var cart = getCart();
        var idx = cart.findIndex(function (p) { return p.id === id; });
        if (idx < 0) return;

        if (action === 'remove') {
          cart.splice(idx, 1);
        } else if (action === 'plus') {
          cart[idx].qty = (cart[idx].qty || 1) + 1;
        } else if (action === 'minus') {
          cart[idx].qty = Math.max(1, (cart[idx].qty || 1) - 1);
        }

        setCart(cart);
        renderCart();
      });
    });
  }

  renderCart();

  window.addEventListener('dinamik:langchange', function () {
    renderCart();
  });
})();
