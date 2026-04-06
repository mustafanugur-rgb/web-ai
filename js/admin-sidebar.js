/**
 * Admin/CRM sidebar - mobil hamburger toggle, yetki filtrelemesi, kullanıcı bilgisi
 */
(function () {
  'use strict';
  var toggle = document.getElementById('sidebar-toggle');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar || !overlay) return;

  var LINK_PERM = {
    'admin.html': 'dashboard', 'raporlar.html': 'raporlar', 'crm.html': 'crm', 'urunler-yonetim.html': 'urunler',
    'siparisler.html': 'siparisler', 'kampanyalar.html': 'kampanyalar',
    'ayarlar.html': 'ayarlar', 'kullanicilar.html': 'kullanicilar'
  };

  function getPerm(href) {
    var h = (href || '').split('?')[0];
    if (h.indexOf('admin.html') !== -1 || h === '#dashboard') return 'dashboard';
    if (h.indexOf('raporlar') !== -1) return 'raporlar';
    if (h.indexOf('crm.html') !== -1 || h === '#customers') return 'crm';
    if (h.indexOf('urunler-yonetim') !== -1) return 'urunler';
    if (h.indexOf('siparisler') !== -1) return 'siparisler';
    if (h.indexOf('kampanyalar') !== -1) return 'kampanyalar';
    if (h.indexOf('ayarlar') !== -1) return 'ayarlar';
    if (h.indexOf('kullanicilar') !== -1) return 'kullanicilar';
    return null;
  }

  function hasPermission(perm) {
    return window.AdminAuth && window.AdminAuth.hasPermission && window.AdminAuth.hasPermission(perm);
  }

  function filterSidebarLinks() {
    var nav = sidebar.querySelector('.sidebar-nav');
    if (!nav) return;
    nav.querySelectorAll('a.sidebar-link').forEach(function (a) {
      var perm = getPerm(a.getAttribute('href'));
      if (perm && !hasPermission(perm)) a.style.display = 'none';
      else a.style.display = '';
    });
  }

  function updateUserDisplay() {
    var el = document.querySelector('.admin-user');
    if (!el) return;
    var u = window.AdminAuth && window.AdminAuth.getCurrentUser && window.AdminAuth.getCurrentUser();
    el.textContent = u ? (u.isAdmin ? 'Admin' : (u.name || u.email || 'Kullanıcı')) : '';
  }

  function open() {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', function () {
    if (sidebar.classList.contains('open')) close();
    else open();
  });

  overlay.addEventListener('click', close);

  sidebar.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', close);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      filterSidebarLinks();
      updateUserDisplay();
    });
  } else {
    filterSidebarLinks();
    updateUserDisplay();
  }
})();
