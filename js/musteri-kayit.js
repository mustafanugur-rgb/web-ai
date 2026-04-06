/**
 * Müşteri üye ol (kayit.html) - dinamik_users'a role: musteri ile eklenir
 */
(function () {
  'use strict';

  var USERS_KEY = 'dinamik_users';

  function getUsers() {
    try {
      var s = localStorage.getItem(USERS_KEY);
      return s ? JSON.parse(s) : [];
    } catch (e) {}
    return [];
  }

  function setUsers(arr) {
    localStorage.setItem(USERS_KEY, JSON.stringify(arr));
  }

  function generateId() {
    return 'm' + Date.now() + Math.random().toString(36).slice(2, 8);
  }

  var form = document.getElementById('customer-register-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errEl = document.getElementById('register-error');
    var successEl = document.getElementById('register-success');
    var btn = document.getElementById('register-btn');
    if (errEl) errEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';

    var name = (document.getElementById('reg-name')?.value || '').trim();
    var email = (document.getElementById('reg-email')?.value || '').trim().toLowerCase();
    var phone = (document.getElementById('reg-phone')?.value || '').trim();
    var pass = document.getElementById('reg-password')?.value || '';
    var pass2 = document.getElementById('reg-password2')?.value || '';

    if (name.length < 2) {
      if (errEl) { errEl.textContent = 'Ad soyad en az 2 karakter olmalı.'; errEl.style.display = 'block'; }
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (errEl) { errEl.textContent = 'Geçerli bir e-posta adresi girin.'; errEl.style.display = 'block'; }
      return;
    }
    if (pass.length < 6) {
      if (errEl) { errEl.textContent = 'Şifre en az 6 karakter olmalı.'; errEl.style.display = 'block'; }
      return;
    }
    if (pass !== pass2) {
      if (errEl) { errEl.textContent = 'Şifreler eşleşmiyor.'; errEl.style.display = 'block'; }
      return;
    }

    var users = getUsers();
    if (users.some(function (u) { return u.email && u.email.toLowerCase() === email; })) {
      if (errEl) { errEl.textContent = 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.'; errEl.style.display = 'block'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor...'; }

    var newUser = {
      id: generateId(),
      name: name,
      email: email,
      phone: phone || '',
      password: pass,
      role: 'musteri',
      permissions: [],
      active: true
    };
    users.push(newUser);
    setUsers(users);

    if (successEl) successEl.style.display = 'block';
    setTimeout(function () {
      window.location.href = 'giris.html?kayit=ok';
    }, 1200);
  });
})();
