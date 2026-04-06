/**
 * Dinamik POS - Çok dilli destek (10 dil)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dinamik_lang';
  var DEFAULT_LANG = 'tr';

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  }

  function setLang(code) {
    if (typeof I18N_TRANSLATIONS === 'undefined' || !I18N_TRANSLATIONS[code]) {
      code = DEFAULT_LANG;
    }
    localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code;
    if (code === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
    applyAll();
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('dinamik:langchange', { detail: { lang: code } }));
    }
  }

  function t(key) {
    var lang = getLang();
    var dict = typeof I18N_TRANSLATIONS !== 'undefined' ? I18N_TRANSLATIONS[lang] : null;
    if (dict && dict[key]) return dict[key];
    var en = typeof I18N_TRANSLATIONS !== 'undefined' ? I18N_TRANSLATIONS.en : null;
    if (en && en[key]) return en[key];
    dict = I18N_TRANSLATIONS ? I18N_TRANSLATIONS[DEFAULT_LANG] : null;
    return (dict && dict[key]) || key;
  }

  /** TRY cinsinden tutarı seçili dile göre para birimine çevirip formatlar */
  function formatPrice(amountInTRY) {
    var lang = getLang();
    var cfg = typeof I18N_CURRENCY !== 'undefined' && I18N_CURRENCY[lang]
      ? I18N_CURRENCY[lang]
      : { currency: 'TRY', locale: 'tr-TR', rate: 1 };
    var amount = (parseFloat(amountInTRY) || 0) * (cfg.rate || 1);
    return new Intl.NumberFormat(cfg.locale || 'tr-TR', {
      style: 'currency',
      currency: cfg.currency || 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  function applyAll() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      if (key) el.title = t(key);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria-label');
      if (key) el.setAttribute('aria-label', t(key));
    });
    document.querySelectorAll('[data-i18n-wa-msg]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-wa-msg');
      if (key) el.setAttribute('data-whatsapp-msg', t(key));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (key) el.innerHTML = t(key);
    });
  }

  function renderLangSelector(container) {
    if (!container || typeof I18N_LANGUAGES === 'undefined') return;
    var current = getLang();
    container.innerHTML = '<select id="lang-select" class="lang-select" aria-label="Dil seçin">' +
      I18N_LANGUAGES.map(function (l) {
        return '<option value="' + l.code + '"' + (l.code === current ? ' selected' : '') + '>' + l.name + '</option>';
      }).join('') +
    '</select>';
    var sel = container.querySelector('#lang-select');
    if (sel) {
      sel.addEventListener('change', function () {
        setLang(sel.value);
      });
    }
  }

  window.I18N = {
    getLang: getLang,
    setLang: setLang,
    t: t,
    applyAll: applyAll,
    renderLangSelector: renderLangSelector,
    formatPrice: formatPrice
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setLang(getLang());
      var container = document.getElementById('lang-selector');
      if (container) renderLangSelector(container);
    });
  } else {
    setLang(getLang());
    var container = document.getElementById('lang-selector');
    if (container) renderLangSelector(container);
  }
})();
