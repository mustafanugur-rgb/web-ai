/**
 * Admin ve kullanıcı girişi - yetki kontrolü
 * Admin: şifre ile. Kullanıcılar: e-posta + şifre (dinamik_users)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dinamik_settings';
  var USERS_KEY = 'dinamik_users';
  var AUTH_KEY = 'dinamik_admin_auth';
  var AUTH_USER_KEY = 'dinamik_auth_user';
  var DEFAULT_PASS = 'admin123';
  var PAGE_PERM = {
    'admin.html': 'dashboard', 'raporlar.html': 'raporlar', 'crm.html': 'crm', 'urunler-yonetim.html': 'urunler',
    'siparisler.html': 'siparisler', 'kampanyalar.html': 'kampanyalar',
    'ayarlar.html': 'ayarlar', 'kullanicilar.html': 'kullanicilar',
    'ortaklar.html': 'ortaklar'
  };

  function getAdminPassword() {
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s) { var obj = JSON.parse(s); return obj.admin_password || DEFAULT_PASS; }
    } catch (e) {}
    return DEFAULT_PASS;
  }

  function getUsers() {
    try {
      var s = localStorage.getItem(USERS_KEY);
      return s ? JSON.parse(s) : [];
    } catch (e) {}
    return [];
  }

  function isLoggedIn() {
    return sessionStorage.getItem(AUTH_KEY) === '1' || localStorage.getItem(AUTH_KEY) === '1';
  }

  function getCurrentUser() {
    try {
      var s = sessionStorage.getItem(AUTH_USER_KEY) || localStorage.getItem(AUTH_USER_KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) {}
    return null;
  }

  function setStorage(key, val, remember) {
    sessionStorage.setItem(key, val);
    if (remember) localStorage.setItem(key, val);
  }

  function setLoggedIn() {
    sessionStorage.setItem(AUTH_KEY, '1');
  }

  function setUserSession(user, remember) {
    var data = JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions || [], isAdmin: false });
    setStorage(AUTH_KEY, '1', remember);
    setStorage(AUTH_USER_KEY, data, remember);
  }

  function setAdminSession(remember) {
    var data = JSON.stringify({ isAdmin: true, permissions: ['dashboard', 'raporlar', 'crm', 'urunler', 'siparisler', 'kampanyalar', 'ayarlar', 'kullanicilar', 'ortaklar'] });
    setStorage(AUTH_KEY, '1', remember);
    setStorage(AUTH_USER_KEY, data, remember);
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }

  function hasPermission(perm) {
    var u = getCurrentUser();
    if (!u) return false;
    if (u.isAdmin) return true;
    var perms = u.permissions || [];
    if (perms.indexOf(perm) !== -1) return true;
    /* Raporlar sayfası eklendi; eski kayıtlarda yoksa dashboard yetkisi olanlar görebilsin */
    if (perm === 'raporlar' && perms.indexOf('dashboard') !== -1) return true;
    return false;
  }

  function redirectToLogin() {
    var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = 'admin-login.html?return=' + returnUrl;
  }

  function redirectToReturn() {
    var params = new URLSearchParams(window.location.search);
    var returnUrl = params.get('return');
    if (returnUrl) window.location.href = decodeURIComponent(returnUrl);
    else window.location.href = 'admin.html';
  }

  if (window.location.pathname.indexOf('admin-login') !== -1) {
    if (isLoggedIn()) {
      redirectToReturn();
    } else {
      document.getElementById('login-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = (document.getElementById('login-email')?.value || '').trim().toLowerCase();
        var pass = document.getElementById('login-password')?.value || '';
        var remember = !!document.getElementById('login-remember')?.checked;
        var errEl = document.getElementById('login-error');
        if (!email) {
          if (pass === getAdminPassword()) {
            setAdminSession(remember);
            redirectToReturn();
          } else {
            if (errEl) { errEl.style.display = 'block'; errEl.setAttribute('aria-live', 'polite'); }
          }
        } else {
          var users = getUsers().filter(function (u) { return u.active !== false && u.email === email; });
          var user = users.find(function (u) { return u.password === pass; });
          if (user) {
            setUserSession(user, remember);
            redirectToReturn();
          } else {
            if (errEl) { errEl.style.display = 'block'; errEl.setAttribute('aria-live', 'polite'); }
          }
        }
      });
    }
  } else {
    var adminPages = ['admin.html', 'raporlar.html', 'crm.html', 'urunler-yonetim.html', 'siparisler.html', 'kampanyalar.html', 'ayarlar.html', 'kullanicilar.html', 'ortaklar.html'];
    var currentPage = window.location.pathname.split('/').pop() || '';
    if (adminPages.indexOf(currentPage) !== -1) {
      if (!isLoggedIn()) {
        redirectToLogin();
      } else {
        var perm = PAGE_PERM[currentPage];
        if (perm && !hasPermission(perm)) {
          alert('Bu sayfaya erişim yetkiniz yok.');
          window.location.href = 'admin.html';
        }
      }
    }
  }

  function initLogout() {
    document.querySelectorAll('#admin-logout-btn, [data-admin-logout]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        logout();
        window.location.href = 'admin-login.html';
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogout);
  } else {
    initLogout();
  }

  window.AdminAuth = {
    isLoggedIn: isLoggedIn,
    logout: logout,
    setLoggedIn: setLoggedIn,
    getCurrentUser: getCurrentUser,
    hasPermission: hasPermission
  };
})();
