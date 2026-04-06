/**
 * Checkout - PayTR entegrasyonu
 * Abonelik planı veya e-ticaret sepeti
 */

(function () {
  'use strict';

  var plans =
    typeof getCheckoutPlansObject === 'function'
      ? getCheckoutPlansObject()
      : {
          starter: {
            name: 'Starter',
            price: 499,
            features: ['POS + Adisyon takibi', '1 kasa / 2 kullanıcı', 'Temel raporlar', 'E-posta destek']
          },
          growth: {
            name: 'Growth',
            price: 899,
            features: ['POS + CRM + WhatsApp', '5 kasa / 10 kullanıcı', 'Sadakat programı', '7/24 destek']
          }
        };

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

  function getCheckoutType() {
    var params = new URLSearchParams(window.location.search);
    return params.get('type') || 'plan';
  }

  function getPlanFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var requested = params.get('plan');
    var keys = Object.keys(plans);
    if (requested && plans[requested]) return requested;
    if (keys.indexOf('growth') >= 0) return 'growth';
    return keys[0] || 'growth';
  }

  function formatPrice(n) {
    return typeof I18N !== 'undefined' && I18N.formatPrice
      ? I18N.formatPrice(n)
      : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n);
  }

  function updateSummaryPlan(planKey) {
    var plan = plans[planKey];
    if (!plan) return plan;

    document.getElementById('summary-plan-type').style.display = 'block';
    document.getElementById('summary-cart-type').style.display = 'none';

    var sn = document.querySelector('.summary-name');
    var sp = document.querySelector('.summary-price');
    var sf = document.getElementById('summary-features');
    var st = document.getElementById('summary-total');
    var btn = document.getElementById('submit-btn');

    if (sn) sn.textContent = plan.name;
    if (sp) sp.textContent = formatPrice(plan.price) + '/ay';
    if (sf) sf.innerHTML = plan.features.map(function (f) { return '<li>' + f + '</li>'; }).join('');
    if (st) st.textContent = formatPrice(plan.price);
    if (btn) btn.textContent = formatPrice(plan.price) + ' ile Ödemeye Geç';

    return plan;
  }

  function updateSummaryCart() {
    var cart = getCart();
    if (!cart.length) {
      window.location.href = 'sepet.html';
      return null;
    }

    document.getElementById('summary-plan-type').style.display = 'none';
    document.getElementById('summary-cart-type').style.display = 'block';

    var subtotal = cart.reduce(function (s, p) {
      return s + (p.price || 0) * (p.qty || 1);
    }, 0);
    var total = subtotal * 1.18; // KDV dahil

    var itemsEl = document.getElementById('summary-cart-items');
    if (itemsEl) {
      itemsEl.innerHTML = cart.map(function (p) {
        var qty = p.qty || 1;
        var line = (p.price || 0) * qty;
        return '<li><span>' + p.name + ' x' + qty + '</span><span>' + formatPrice(line) + '</span></li>';
      }).join('');
    }

    document.getElementById('summary-total').textContent = formatPrice(total);

    var btn = document.getElementById('submit-btn');
    if (btn) btn.textContent = formatPrice(total) + ' ile Ödemeye Geç';

    var backLink = document.getElementById('back-link');
    if (backLink) backLink.href = 'sepet.html';

    return { cart: cart, total: total };
  }

  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim();
  }

  function sanitizePhone(str) {
    return (str || '').replace(/\D/g, '').slice(0, 15);
  }

  function showPaytrIframe(token) {
    var formStep = document.getElementById('checkout-step-form');
    var paytrStep = document.getElementById('checkout-step-paytr');
    var wrapper = document.getElementById('paytr-iframe-wrapper');

    if (!wrapper) return;

    wrapper.innerHTML =
      '<iframe src="https://www.paytr.com/odeme/guvenli/' + token + '" id="paytriframe" frameborder="0" scrolling="no" style="width:100%;"></iframe>';

    if (formStep) formStep.style.display = 'none';
    if (paytrStep) paytrStep.style.display = 'block';

    if (typeof iFrameResize === 'function') {
      iFrameResize({}, '#paytriframe');
    }
  }

  function setLoading(loading) {
    var btn = document.getElementById('submit-btn');
    if (!btn) return;
    btn.disabled = !!loading;
    btn.textContent = loading ? 'Yükleniyor...' : (btn.dataset.btnText || 'Ödemeye Geç');
  }

  var form = document.getElementById('checkout-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = sanitize(form.querySelector('[name="name"]')?.value);
      var email = form.querySelector('[name="email"]')?.value?.trim() || '';
      var phone = sanitizePhone(form.querySelector('[name="phone"]')?.value);
      var business = sanitize(form.querySelector('[name="business"]')?.value);

      if (!name || name.length < 2) {
        alert('Lütfen geçerli bir ad soyad girin.');
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Lütfen geçerli bir e-posta adresi girin.');
        return;
      }
      if (!phone || phone.length < 10) {
        alert('Lütfen geçerli bir telefon numarası girin.');
        return;
      }

      var type = getCheckoutType();
      var payload;

      if (type === 'cart') {
        var cart = getCart();
        if (!cart.length) {
          alert('Sepetiniz boş.');
          window.location.href = 'sepet.html';
          return;
        }
        var subtotal = cart.reduce(function (s, p) {
          return s + (p.price || 0) * (p.qty || 1);
        }, 0);
        var total = subtotal * 1.18;

        payload = {
          name: name,
          email: email,
          phone: phone,
          business: business || 'Restoran/Kafe',
          cart: cart.map(function (p) {
            return {
              name: p.name,
              price: p.price,
              qty: p.qty || 1
            };
          }),
          amount: total
        };
      } else {
        var plan = form.querySelector('[name="plan"]')?.value || 'growth';
        var planData = plans[plan];
        if (!planData) {
          alert('Geçersiz plan.');
          return;
        }
        payload = {
          name: name,
          email: email,
          phone: phone,
          business: business || 'Restoran/Kafe',
          plan: planData.name,
          amount: planData.price
        };
      }

      setLoading(true);
      var btn = document.getElementById('submit-btn');
      if (btn) btn.dataset.btnText = btn.textContent;

      var apiBase = typeof window.getDinamikApiBase === 'function' ? window.getDinamikApiBase() : (window.API_BASE || '');
      var apiUrl = apiBase + '/api/paytr/token';

      function parseJsonOrThrow(text, context) {
        var t = (text || '').trim();
        if (t.indexOf('<') === 0) {
          throw new Error('Ödeme API\'si yanıt vermiyor: sunucu HTML döndürüyor (Node uygulaması çalışmıyor veya /api yönlendirilmemiş). Sunucuda "npm start" veya PM2 ile Node\'u başlatın.');
        }
        try { return t ? JSON.parse(t) : {}; } catch (e) { throw new Error(context || 'Geçersiz yanıt'); }
      }

      fetch(apiBase + '/api/csrf-token')
        .then(function (r) { return r.text().then(function (text) {
          var data = parseJsonOrThrow(text, 'CSRF yanıtı geçersiz');
          return { ok: r.ok, data: data };
        }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.data.error || 'CSRF alınamadı');
          payload.csrf_token = res.data.token;
          return fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        })
        .then(function (r) {
          return r.text().then(function (text) {
            var data = parseJsonOrThrow(text, 'Ödeme token yanıtı geçersiz');
            if (!r.ok) throw new Error(data.error || 'Token alınamadı (sunucu hatası)');
            return data;
          });
        })
        .then(function (data) {
          if (!data || !data.token) {
            throw new Error('Ödeme sayfası açılamadı.');
          }
          setLoading(false);
          try {
            sessionStorage.setItem('dinamik_pending_order', JSON.stringify({
              id: data.merchant_oid || 'DP' + Date.now(),
              customer: payload.name,
              email: payload.email,
              phone: payload.phone,
              total: payload.amount,
              status: 'pending',
              date: new Date().toISOString()
            }));
          } catch (e) {}
          showPaytrIframe(data.token);
          if (type === 'cart') setCart([]);
        })
        .catch(function (err) {
          setLoading(false);
          var msg = err.message || 'Ödeme başlatılamadı.';
          var isJsonError = /Unexpected token|not valid JSON|JSON/i.test(msg);
          var isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError';
          if (isJsonError || isNetworkError) {
            var isLive = window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
            msg = isLive
              ? 'Ödeme API\'si yanıt vermiyor. Sunucuda Node.js uygulaması çalışıyor olmalı (npm install + npm start veya PM2). /api istekleri Node\'a yönlendirilmeli; HTML sayfası dönmemeli. Detay: WEB_ATMA.md / DEPLOYMENT.md'
              : 'Ödeme sunucusuna bağlanılamadı. Komut satırında "npm start" yazıp tarayıcıda http://localhost:3001 adresini kullanın.';
          }
          alert(msg);
        });
    });
  }

  var type = getCheckoutType();
  var planInput = document.getElementById('plan-input');
  if (planInput) planInput.value = type === 'cart' ? '' : getPlanFromUrl();

  if (type === 'cart') {
    var cartData = updateSummaryCart();
    if (planInput) planInput.remove?.();
  } else {
    var planKey = getPlanFromUrl();
    updateSummaryPlan(planKey);
  }

  window.addEventListener('dinamik:langchange', function () {
    if (type === 'cart') updateSummaryCart();
    else updateSummaryPlan(getPlanFromUrl());
  });
})();
