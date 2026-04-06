/**
 * Teklif / bilgi talep formu - başarı mesajı ve WhatsApp yönlendirmesi
 */
(function () {
  'use strict';

  var FS = typeof DinamikFormSecurity !== 'undefined' ? DinamikFormSecurity : null;

  function sanitizeText(str, max) {
    var s = FS
      ? FS.sanitize(typeof str === 'string' ? str : '')
      : (typeof str === 'string' ? str.replace(/[<>]/g, '').trim() : '');
    return max ? s.slice(0, max) : s;
  }

  var form = document.getElementById('demo-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = sanitizeText((form.querySelector('[name="name"]')?.value || '').trim(), 200);
    var phoneRaw = (form.querySelector('[name="phone"]')?.value || '').trim();
    var phone = FS ? FS.sanitizePhone(phoneRaw) : phoneRaw.replace(/\D/g, '');
    var email = FS
      ? FS.sanitizeEmail((form.querySelector('[name="email"]')?.value || '').trim())
      : (form.querySelector('[name="email"]')?.value || '').trim();
    var business = sanitizeText((form.querySelector('[name="business"]')?.value || '').trim(), 500);
    var message = sanitizeText((form.querySelector('[name="message"]')?.value || '').trim(), 2000);

    if (!name || name.length < 2) {
      alert('Lütfen ad soyad girin.');
      return;
    }
    if (!phone || phone.length < 10) {
      alert('Lütfen geçerli bir telefon numarası girin.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Gönderiliyor...';
    }

    try {
      var demos = JSON.parse(localStorage.getItem('dinamik_demo_requests') || '[]');
      demos.push({
        name: name,
        phone: phone,
        email: email,
        business: business,
        message: message,
        date: new Date().toISOString()
      });
      localStorage.setItem('dinamik_demo_requests', JSON.stringify(demos));
    } catch (err) {}

    (function tryEmailNotify() {
      var base =
        typeof window.getDinamikApiBase === 'function' ? window.getDinamikApiBase() : window.API_BASE || '';
      if (base === undefined || base === null) base = '';
      var tokenUrl = (base || '') + '/api/csrf-token';
      fetch(tokenUrl, { credentials: 'same-origin' })
        .then(function (r) {
          return r.json();
        })
        .then(function (d) {
          if (!d || !d.token) return;
          return fetch((base || '') + '/api/demo-teklif', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': d.token
            },
            body: JSON.stringify({
              name: name,
              phone: phone,
              email: email,
              business: business,
              message: message,
              csrf_token: d.token
            })
          });
        })
        .catch(function () {});
    })();

    if (btn) {
      btn.textContent = 'Teklif Talebi Alındı!';
      btn.classList.add('btn-success', 'btn');
      btn.classList.remove('btn-primary');
    }

    var waText = 'Merhaba, teklif talebim var. Ad: ' + name + ', İşletme: ' + (business || '-') + ', E-posta: ' + email;
    if (message) waText += '. Talep: ' + message;
    var waUrl = typeof DinamikConfig !== 'undefined'
      ? DinamikConfig.getWhatsAppUrl(waText)
      : 'https://wa.me/905322652660?text=' + encodeURIComponent(waText);

    setTimeout(function () {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }, 800);
  });
})();
