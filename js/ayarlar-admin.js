/**
 * Ayarlar sayfası - Genel ayarlar, ödeme tipleri, e-fatura, veri yönetimi
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dinamik_settings';

  function getSettings() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {};
  }

  function setSettings(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  var ID_TO_KEY = {
    'setting-firm': 'firm', 'setting-email': 'email', 'setting-phone': 'phone',
    'setting-whatsapp': 'whatsapp', 'setting-admin-password': 'admin_password',
    'setting-kdv': 'kdv', 'setting-currency': 'currency',
    'setting-ciro-gunluk': 'ciro_gunluk', 'setting-ciro-haftalik': 'ciro_haftalik', 'setting-ciro-aylik': 'ciro_aylik',
    'setting-ciro-rapor-donem': 'ciro_rapor_donem', 'setting-ciro-mesai-baslangic': 'ciro_mesai_baslangic',
    'setting-paytr-merchant': 'paytr_merchant', 'setting-paytr-key': 'paytr_key', 'setting-paytr-salt': 'paytr_salt',
    'setting-havale-bank': 'havale_bank', 'setting-havale-iban': 'havale_iban',
    'setting-havale-account': 'havale_account', 'setting-havale-branch': 'havale_branch',
    'setting-efatura-prefix': 'efatura_prefix',
    'setting-social-facebook': 'social_facebook', 'setting-social-instagram': 'social_instagram',
    'setting-social-twitter': 'social_twitter', 'setting-social-linkedin': 'social_linkedin',
    'setting-social-youtube': 'social_youtube',
    'setting-seo-site-name': 'seo_site_name',
    'setting-seo-global-description': 'seo_global_description',
    'setting-seo-og-image': 'seo_og_image',
    'setting-seo-home-title': 'seo_home_title',
    'setting-seo-home-description': 'seo_home_description',
    'setting-seo-products-title': 'seo_products_title',
    'setting-seo-products-description': 'seo_products_description'
  };

  function loadSettings() {
    var s = getSettings();
    Object.keys(ID_TO_KEY).forEach(function (id) {
      var el = document.getElementById(id);
      var val = s[ID_TO_KEY[id]];
      if (el && val != null && val !== '') el.value = val;
    });
    var paytrEnabled = document.getElementById('setting-paytr-enabled');
    var havaleEnabled = document.getElementById('setting-havale-enabled');
    var efaturaAuto = document.getElementById('setting-efatura-auto');
    if (paytrEnabled) paytrEnabled.checked = s.paytr_enabled !== false;
    if (havaleEnabled) havaleEnabled.checked = !!s.havale_enabled;
    if (efaturaAuto) efaturaAuto.checked = !!s.efatura_auto;
    togglePaytrBody();
    toggleHavaleBody();
    toggleEfaturaExtra();
  }

  function togglePaytrBody() {
    var enabled = document.getElementById('setting-paytr-enabled');
    var body = document.getElementById('paytr-settings');
    if (body) body.classList.toggle('disabled', !enabled?.checked);
  }

  function toggleHavaleBody() {
    var enabled = document.getElementById('setting-havale-enabled');
    var body = document.getElementById('havale-settings');
    if (body) body.classList.toggle('disabled', !enabled?.checked);
  }

  function toggleEfaturaExtra() {
    var enabled = document.getElementById('setting-efatura-auto');
    var extra = document.getElementById('efatura-extra');
    if (extra) extra.style.display = enabled?.checked ? 'block' : 'none';
  }

  function showSavedToast() {
    var toast = document.getElementById('settings-saved-toast');
    if (toast) {
      toast.classList.add('visible');
      clearTimeout(window._settingsToastTimer);
      window._settingsToastTimer = setTimeout(function () {
        toast.classList.remove('visible');
      }, 2500);
    }
  }

  function saveSettings() {
    var s = {
      firm: document.getElementById('setting-firm')?.value || '',
      email: document.getElementById('setting-email')?.value || '',
      phone: document.getElementById('setting-phone')?.value || '',
      kdv: parseInt(document.getElementById('setting-kdv')?.value || '18', 10),
      currency: document.getElementById('setting-currency')?.value || 'TRY',
      paytr_enabled: document.getElementById('setting-paytr-enabled')?.checked !== false,
      paytr_merchant: (document.getElementById('setting-paytr-merchant')?.value || '').trim(),
      paytr_key: (document.getElementById('setting-paytr-key')?.value || '').trim(),
      paytr_salt: (document.getElementById('setting-paytr-salt')?.value || '').trim(),
      havale_enabled: document.getElementById('setting-havale-enabled')?.checked || false,
      havale_bank: document.getElementById('setting-havale-bank')?.value || '',
      havale_iban: document.getElementById('setting-havale-iban')?.value || '',
      havale_account: document.getElementById('setting-havale-account')?.value || '',
      havale_branch: document.getElementById('setting-havale-branch')?.value || '',
      efatura_auto: document.getElementById('setting-efatura-auto')?.checked || false,
      efatura_prefix: document.getElementById('setting-efatura-prefix')?.value || '',
      ciro_gunluk: parseInt(document.getElementById('setting-ciro-gunluk')?.value || '0', 10),
      ciro_haftalik: parseInt(document.getElementById('setting-ciro-haftalik')?.value || '0', 10),
      ciro_aylik: parseInt(document.getElementById('setting-ciro-aylik')?.value || '0', 10),
      ciro_rapor_donem: document.getElementById('setting-ciro-rapor-donem')?.value || 'aylik',
      ciro_mesai_baslangic: document.getElementById('setting-ciro-mesai-baslangic')?.value || '06:00',
      whatsapp: document.getElementById('setting-whatsapp')?.value || '',
      social_facebook: (document.getElementById('setting-social-facebook')?.value || '').trim(),
      social_instagram: (document.getElementById('setting-social-instagram')?.value || '').trim(),
      social_twitter: (document.getElementById('setting-social-twitter')?.value || '').trim(),
      social_linkedin: (document.getElementById('setting-social-linkedin')?.value || '').trim(),
      social_youtube: (document.getElementById('setting-social-youtube')?.value || '').trim(),
      seo_site_name: (document.getElementById('setting-seo-site-name')?.value || '').trim(),
      seo_global_description: (document.getElementById('setting-seo-global-description')?.value || '').trim(),
      seo_og_image: (document.getElementById('setting-seo-og-image')?.value || '').trim(),
      seo_home_title: (document.getElementById('setting-seo-home-title')?.value || '').trim(),
      seo_home_description: (document.getElementById('setting-seo-home-description')?.value || '').trim(),
      seo_products_title: (document.getElementById('setting-seo-products-title')?.value || '').trim(),
      seo_products_description: (document.getElementById('setting-seo-products-description')?.value || '').trim(),
      admin_password: (function () {
        var v = document.getElementById('setting-admin-password')?.value || '';
        return v ? v : (getSettings().admin_password || '');
      })()
    };
    setSettings(s);
    showSavedToast();

    // PayTR bilgilerini sunucuya da gönder (ödeme token için sunucu bu dosyayı okuyor)
    if (s.paytr_merchant || s.paytr_key || s.paytr_salt) {
      var apiBase = typeof window.getDinamikApiBase === 'function' ? window.getDinamikApiBase() : (window.API_BASE || '');
      var paytrBody = { merchant_id: s.paytr_merchant, merchant_key: s.paytr_key, merchant_salt: s.paytr_salt };
      fetch(apiBase + '/api/csrf-token')
        .then(function (r) { return r.json(); })
        .then(function (csrf) {
          paytrBody.csrf_token = csrf.token;
          var token = (csrf && csrf.token) ? csrf.token : '';
          return fetch(apiBase + '/api/settings/paytr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
            body: JSON.stringify(paytrBody)
          });
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok) console.log('PayTR ayarları sunucuya kaydedildi.');
        })
        .catch(function () {});
    }

    // SEO ayarlarini sunucuya da kaydet ve HTML dosyalarina uygula
    if (s.seo_site_name || s.seo_global_description || s.seo_og_image || s.seo_home_title || s.seo_home_description || s.seo_products_title || s.seo_products_description) {
      var apiBaseSeo = typeof window.getDinamikApiBase === 'function' ? window.getDinamikApiBase() : (window.API_BASE || '');
      var seoBody = {
        seo_site_name: s.seo_site_name,
        seo_global_description: s.seo_global_description,
        seo_og_image: s.seo_og_image,
        seo_home_title: s.seo_home_title,
        seo_home_description: s.seo_home_description,
        seo_products_title: s.seo_products_title,
        seo_products_description: s.seo_products_description
      };
      fetch(apiBaseSeo + '/api/csrf-token')
        .then(function (r) { return r.json(); })
        .then(function (csrf) {
          seoBody.csrf_token = csrf.token;
          var token = (csrf && csrf.token) ? csrf.token : '';
          return fetch(apiBaseSeo + '/api/settings/seo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
            body: JSON.stringify(seoBody)
          });
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok) console.log('SEO ayarlari sunucuya kaydedildi.');
        })
        .catch(function () {});
    }
  }

  document.getElementById('btn-save-settings')?.addEventListener('click', function () {
    saveSettings();
  });

  /** Site görseli yükle (logo / kapak) — sitede saklanır */
  function setupSiteImageUpload(fileInputId, statusId, type) {
    var fileInput = document.getElementById(fileInputId);
    var statusEl = document.getElementById(statusId);
    if (!fileInput) return;
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var apiBase = typeof window.getDinamikApiBase === 'function' ? window.getDinamikApiBase() : (window.API_BASE || '');
      if (statusEl) { statusEl.style.display = ''; statusEl.textContent = 'Yükleniyor…'; }
      fetch(apiBase + '/api/csrf-token')
        .then(function (r) { return r.text().then(function (t) { var d; try { d = t && t.trim().indexOf('<') !== 0 ? JSON.parse(t) : {}; } catch (e) { d = {}; } return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error('Güvenlik jetonu alınamadı');
          var fd = new FormData();
          fd.append('file', file);
          fd.append('type', type);
          return fetch(apiBase + '/api/upload/site-image', {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': (res.data && res.data.token) || '' },
            body: fd
          });
        })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Yükleme hatası'); return d; }); })
        .then(function (data) {
          if (statusEl) { statusEl.textContent = (data.url ? 'Kaydedildi: ' + data.url : 'Yüklendi.'); statusEl.style.display = ''; }
          fileInput.value = '';
        })
        .catch(function (err) {
          if (statusEl) { statusEl.textContent = err.message || 'Yükleme başarısız (Node sunucusu gerekir).'; statusEl.style.display = ''; }
          fileInput.value = '';
        });
    });
  }
  setupSiteImageUpload('setting-logo-file', 'setting-logo-status', 'logo');
  setupSiteImageUpload('setting-hero-file', 'setting-hero-status', 'hero');

  var saveIds = [
    'setting-firm', 'setting-email', 'setting-phone', 'setting-whatsapp', 'setting-admin-password',
    'setting-kdv', 'setting-currency',
    'setting-ciro-gunluk', 'setting-ciro-haftalik', 'setting-ciro-aylik',
    'setting-ciro-rapor-donem', 'setting-ciro-mesai-baslangic',
    'setting-paytr-merchant', 'setting-paytr-key', 'setting-paytr-salt',
    'setting-havale-bank', 'setting-havale-iban', 'setting-havale-account', 'setting-havale-branch',
    'setting-efatura-prefix',
    'setting-social-facebook', 'setting-social-instagram', 'setting-social-twitter',
    'setting-social-linkedin', 'setting-social-youtube',
    'setting-seo-site-name', 'setting-seo-global-description', 'setting-seo-og-image',
    'setting-seo-home-title', 'setting-seo-home-description',
    'setting-seo-products-title', 'setting-seo-products-description'
  ];
  saveIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', saveSettings);
  });

  document.getElementById('setting-paytr-enabled')?.addEventListener('change', function () {
    togglePaytrBody();
    saveSettings();
  });
  document.getElementById('setting-havale-enabled')?.addEventListener('change', function () {
    toggleHavaleBody();
    saveSettings();
  });
  document.getElementById('setting-efatura-auto')?.addEventListener('change', function () {
    toggleEfaturaExtra();
    saveSettings();
  });

  document.getElementById('btn-reset-cart')?.addEventListener('click', function () {
    if (confirm('Sepeti temizlemek istediğinize emin misiniz?')) {
      localStorage.removeItem('dinamik_cart');
      alert('Sepet temizlendi.');
    }
  });

  document.getElementById('btn-reset-products')?.addEventListener('click', function () {
    if (confirm('Ürünler varsayılan listeye dönecek. Emin misiniz?')) {
      localStorage.removeItem('dinamik_products');
      localStorage.removeItem('dinamik_category_labels');
      alert('Ürünler varsayılana döndürüldü.');
    }
  });

  document.getElementById('btn-reset-all')?.addEventListener('click', function () {
    if (confirm('Tüm veriler (sepet, ürünler, siparişler, kampanyalar, ayarlar) silinecek. Emin misiniz?')) {
      localStorage.removeItem('dinamik_cart');
      localStorage.removeItem('dinamik_products');
      localStorage.removeItem('dinamik_category_labels');
      localStorage.removeItem('dinamik_orders');
      localStorage.removeItem('dinamik_campaigns');
      localStorage.removeItem('dinamik_settings');
      alert('Tüm veriler temizlendi.');
    }
  });

  loadSettings();
})();
