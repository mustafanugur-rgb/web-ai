/**
 * Çözüm Ortakları / Referanslar — veri ve yan panel render
 * İki ayrı liste: Çözüm Ortakları (sol panel), Referanslar (sağ panel).
 */
(function () {
  'use strict';

  var STORAGE_KEY_COZUM = 'dinamik_ortaklar_cozum';
  var STORAGE_KEY_REFERANS = 'dinamik_ortaklar_referans';
  var STORAGE_KEY_LEGACY = 'dinamik_ortaklar';

  var defaultCozum = [
    { name: 'SambaPOS', logo: 'https://sambapos.org/themes/sambapos/logo.png', url: 'https://sambapos.org' },
    { name: 'PayTR', logo: 'https://www.paytr.com/img/paytr-logo.svg', url: 'https://www.paytr.com' },
    { name: 'Dinamik POS', logo: 'images/logo.png', url: 'index.html' }
  ];
  var defaultReferans = [
    { name: 'Ortak 1', logo: '', url: '#' },
    { name: 'Ortak 2', logo: '', url: '#' },
    { name: 'Ortak 3', logo: '', url: '#' }
  ];

  function migrateLegacy() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_LEGACY);
      if (!raw) return;
      var list = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return;
      var half = Math.ceil(list.length / 2);
      localStorage.setItem(STORAGE_KEY_COZUM, JSON.stringify(list.slice(0, half)));
      localStorage.setItem(STORAGE_KEY_REFERANS, JSON.stringify(list.slice(half)));
      localStorage.removeItem(STORAGE_KEY_LEGACY);
    } catch (e) {}
  }

  function getPartnersCozum() {
    migrateLegacy();
    try {
      var raw = localStorage.getItem(STORAGE_KEY_COZUM);
      if (raw) {
        var list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch (e) {}
    return defaultCozum.slice();
  }

  function getPartnersReferans() {
    migrateLegacy();
    try {
      var raw = localStorage.getItem(STORAGE_KEY_REFERANS);
      if (raw) {
        var list = JSON.parse(raw);
        if (Array.isArray(list)) return list;
      }
    } catch (e) {}
    return defaultReferans.slice();
  }

  function savePartnersCozum(list) {
    try {
      localStorage.setItem(STORAGE_KEY_COZUM, JSON.stringify(list));
      return true;
    } catch (e) {}
    return false;
  }

  function savePartnersReferans(list) {
    try {
      localStorage.setItem(STORAGE_KEY_REFERANS, JSON.stringify(list));
      return true;
    } catch (e) {}
    return false;
  }

  function getPartners() {
    return getPartnersCozum().concat(getPartnersReferans());
  }

  function savePartners(list) {
    var half = Math.ceil(list.length / 2);
    return savePartnersCozum(list.slice(0, half)) && savePartnersReferans(list.slice(half));
  }

  function renderSidePartners() {
    var leftEl = document.getElementById('side-partners-left');
    var rightEl = document.getElementById('side-partners-right');
    if (!leftEl && !rightEl) return;

    var leftPartners = getPartnersCozum();
    var rightPartners = getPartnersReferans();

    var leftTitle = document.documentElement.getAttribute('lang') === 'tr' ? 'Çözüm Ortakları' : 'Partners';
    var rightTitle = document.documentElement.getAttribute('lang') === 'tr' ? 'Referanslarımız' : 'Our References';
    function itemHtml(p) {
      var logo = (p.logo && p.logo.trim()) ? '<img src="' + escapeHtml(p.logo) + '" alt="" loading="lazy">' : '';
      var name = '<span class="side-partners-item-name">' + escapeHtml(p.name) + '</span>';
      var url = (p.url && p.url !== '#') ? p.url : '#';
      return '<li><a class="side-partners-item" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + logo + name + '</a></li>';
    }

    function blockHtml(title, items) {
      var listHtml = items.length > 0 ? items.map(itemHtml).join('') : '<li class="side-partners-empty">—</li>';
      return '<p class="side-partners-title">' + escapeHtml(title) + '</p><ul class="side-partners-list">' + listHtml + '</ul>';
    }
    if (leftEl) {
      var leftBlock = blockHtml(leftTitle, leftPartners);
      leftEl.innerHTML = '<div class="side-strip-marquee"><div class="side-strip-marquee-inner">' + leftBlock + leftBlock + '</div></div>';
    }
    if (rightEl) {
      var rightBlock = blockHtml(rightTitle, rightPartners);
      rightEl.innerHTML = '<div class="side-strip-marquee"><div class="side-strip-marquee-inner">' + rightBlock + rightBlock + '</div></div>';
    }
  }

  function escapeHtml(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderLoginPartners(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var partners = getPartnersCozum();
    if (partners.length === 0) return;
    var html = '<p class="login-partners-title">Çözüm Ortaklarımız</p><div class="login-partners-list">';
    partners.slice(0, 8).forEach(function (p) {
      var logo = p.logo ? '<img src="' + escapeHtml(p.logo) + '" alt="' + escapeHtml(p.name) + '">' : '<span>' + escapeHtml(p.name) + '</span>';
      var url = (p.url && p.url !== '#') ? p.url : '#';
      html += '<a class="login-partners-item" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + logo + '</a>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  if (typeof window.DinamikOrtaklar === 'undefined') {
    window.DinamikOrtaklar = {
      getPartners: getPartners,
      savePartners: savePartners,
      getPartnersCozum: getPartnersCozum,
      getPartnersReferans: getPartnersReferans,
      savePartnersCozum: savePartnersCozum,
      savePartnersReferans: savePartnersReferans,
      renderSidePartners: renderSidePartners,
      renderLoginPartners: renderLoginPartners
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSidePartners);
  } else {
    renderSidePartners();
  }
})();
