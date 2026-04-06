/**
 * SambaPOS Acil Destek - form gönderimi
 * SMTP varsa e-posta gider; yoksa veya mail hata verirse talep server/data/acil-destek-requests.json + localStorage.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dinamik_acil_destek';

  function getApiBase() {
    if (typeof window.getDinamikApiBase === 'function') return window.getDinamikApiBase();
    if (typeof window !== 'undefined' && window.API_BASE) return window.API_BASE;
    if (typeof window !== 'undefined' && window.location && window.location.origin) return window.location.origin;
    return 'http://localhost:3001';
  }

  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim().slice(0, 2000);
  }

  var form = document.getElementById('acil-destek-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var problem = sanitize((form.querySelector('[name="problem"]')?.value || '').trim());
    var name = (form.querySelector('[name="name"]')?.value || '').trim();
    var phone = (form.querySelector('[name="phone"]')?.value || '').trim();
    var email = (form.querySelector('[name="email"]')?.value || '').trim();

    if (!problem || problem.length < 10) {
      alert(typeof I18N !== 'undefined' ? I18N.t('acil_destek_validation_problem') : 'Lütfen sorununuzu en az 10 karakter olacak şekilde yazın.');
      return;
    }
    if (!name || name.length < 2) {
      alert(typeof I18N !== 'undefined' ? I18N.t('acil_destek_validation_name') : 'Lütfen ad soyad girin.');
      return;
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      alert(typeof I18N !== 'undefined' ? I18N.t('acil_destek_validation_phone') : 'Lütfen geçerli bir telefon numarası girin.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert(typeof I18N !== 'undefined' ? I18N.t('acil_destek_validation_email') : 'Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = (typeof I18N !== 'undefined' ? I18N.t('acil_destek_sending') : 'Gönderiliyor...');
    }

    var apiBase = getApiBase();
    var payload = { problem: problem, name: name, phone: phone, email: email };

    fetch(apiBase + '/api/csrf-token')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        payload.csrf_token = data.token;
        return fetch(apiBase + '/api/acil-destek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      })
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.error || 'Gönderim başarısız');
          return data;
        });
      })
      .then(function (data) {
        try {
          var list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          list.push({
            problem: problem,
            name: name,
            phone: phone,
            email: email,
            date: new Date().toISOString()
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (err) {}

        var successText =
          typeof I18N !== 'undefined'
            ? I18N.t('acil_destek_success')
            : 'Talebiniz alındı. En kısa sürede dönüş yapacağız.';

        if (btn) {
          btn.textContent = successText;
          btn.classList.add('btn-success');
          btn.classList.remove('btn-primary');
        }
        form.reset();

        var waText = 'Acil Destek Talebi - ' + name + ' - ' + phone + ' - ' + email + '\nSorun: ' + problem.slice(0, 300);
        var waUrl = typeof DinamikConfig !== 'undefined'
          ? DinamikConfig.getWhatsAppUrl(waText)
          : 'https://wa.me/905322652660?text=' + encodeURIComponent(waText);
        setTimeout(function () {
          if (confirm(typeof I18N !== 'undefined' ? I18N.t('acil_destek_whatsapp_confirm') : 'WhatsApp üzerinden de iletmek ister misiniz? Hızlı yanıt için açabilirsiniz.')) {
            window.open(waUrl, '_blank', 'noopener,noreferrer');
          }
        }, 600);
      })
      .catch(function (err) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = (typeof I18N !== 'undefined' ? I18N.t('acil_destek_submit') : 'Gönder — En Kısa Sürede Dönüş Yapacağız');
        }
        alert(
          err.message ||
            'Gönderilemedi. Siteyi Node sunucusu üzerinden açtığınızdan emin olun (npm start). İnternet bağlantınızı kontrol edin.'
        );
      });
  });
})();
