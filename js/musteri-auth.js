/**
 * Müşteri girişi (giris.html) ve Hesabım (hesabim.html)
 * Panel kullanıcıları (dinamik_users) e-posta + şifre ile giriş yapıp Hesabım'a gider.
 */
(function () {
  'use strict';

  var USERS_KEY = 'dinamik_users';
  var AUTH_KEY = 'dinamik_admin_auth';
  var AUTH_USER_KEY = 'dinamik_auth_user';

  function getUsers() {
    try {
      var s = localStorage.getItem(USERS_KEY);
      return s ? JSON.parse(s) : [];
    } catch (e) {}
    return [];
  }

  function isLoggedIn() {
    return sessionStorage.getItem(AUTH_KEY) === '1';
  }

  function setUserSession(user) {
    sessionStorage.setItem(AUTH_KEY, '1');
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      isAdmin: !!user.isAdmin
    }));
  }

  function getCurrentUser() {
    try {
      var s = sessionStorage.getItem(AUTH_USER_KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) {}
    return null;
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  }

  var pathname = window.location.pathname || '';
  var isGiris = pathname.indexOf('giris') !== -1;
  var isHesabim = pathname.indexOf('hesabim') !== -1;

  if (isHesabim) {
    if (!isLoggedIn()) {
      window.location.href = 'giris.html?return=' + encodeURIComponent('hesabim.html');
    } else {
      if (typeof AdminAuth === 'undefined') {
        window.AdminAuth = { getCurrentUser: getCurrentUser, logout: logout };
      }
    }
  }

  if (isGiris) {
    if (isLoggedIn()) {
      var returnUrl = new URLSearchParams(window.location.search).get('return');
      window.location.href = returnUrl || 'hesabim.html';
    } else {
      window.AdminAuth = { getCurrentUser: getCurrentUser, logout: logout };
      document.getElementById('customer-login-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = (document.getElementById('customer-email')?.value || '').trim().toLowerCase();
        var pass = document.getElementById('customer-password')?.value || '';
        var errEl = document.getElementById('customer-login-error');
        if (!email) {
          if (errEl) { errEl.style.display = 'block'; }
          return;
        }
        var users = getUsers().filter(function (u) { return u.active !== false && u.email && u.email.toLowerCase() === email; });
        var user = users.find(function (u) { return u.password === pass; });
        if (user) {
          setUserSession(user);
          var returnUrl = new URLSearchParams(window.location.search).get('return');
          window.location.href = returnUrl || 'hesabim.html';
        } else {
          if (errEl) { errEl.style.display = 'block'; errEl.setAttribute('aria-live', 'polite'); }
        }
      });
    }
  }
})();
