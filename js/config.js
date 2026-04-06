/**
 * Site genel ayarları - WhatsApp, iletişim vb.
 * Ayarlar sayfasından yapılandırılır (localStorage)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dinamik_settings';

  /**
   * TEK KAYNAK — Tüm sitedeki WhatsApp (wa.me) bu numarayı kullanır.
   * 90 ile başlayan, boşluksuz (örn. 905321234567).
   * PHP sohbet yanıtı için: api-php/config.php içindeki SITE_WHATSAPP_DEFAULT veya sunucuda data/site-whatsapp.txt / SITE_WHATSAPP ortam değişkeni aynı olmalı.
   */
  var SITE_WHATSAPP = '905322652660';

  /** Ayarlardan numara yoksa kullanılan yedek (SITE_WHATSAPP ile aynı tutun). */
  var DEFAULT_WHATSAPP = SITE_WHATSAPP;
  var DEFAULT_WHATSAPP_MESSAGE = 'Merhaba, işletmem için POS sistemi hakkında bilgi almak istiyorum.';

  /**
   * Canlı AI (FastAPI) kök URL — sonda / olmasın.
   * Buraya tek satırda yazın; boş bırakılırsa canlıda istek site üzerinden gider:
   * - Node varsa /api/dinamik-sales → proxy
   * - Sadece PHP varsa api-php/dinamik-sales/chat.php → SALES_AGENT_URL veya data/sales-agent-api-url.txt ile proxy (yoksa WhatsApp yedeği)
   *
   * Örnek: 'https://dinamikpos-agent.up.railway.app'
   *
   * Üst öncelik: sayfadan <script> window.DINAMIKPOS_SALES_AGENT_API = 'https://...'; </script>
   */
  var SALES_AGENT_PUBLIC_URL = '';

  var DINAMIKPOS_SALES_AGENT_API = (function () {
    var w = typeof window !== 'undefined' ? window : null;
    if (w && typeof w.DINAMIKPOS_SALES_AGENT_API === 'string' && w.DINAMIKPOS_SALES_AGENT_API.trim()) {
      return w.DINAMIKPOS_SALES_AGENT_API.replace(/\/+$/, '');
    }
    if (typeof SALES_AGENT_PUBLIC_URL === 'string' && SALES_AGENT_PUBLIC_URL.trim()) {
      return SALES_AGENT_PUBLIC_URL.replace(/\/+$/, '');
    }
    return '';
  })();

  function getSettings() {
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : {};
    } catch (e) {}
    return {};
  }

  /** Rakam dışını at; 0 5… / 5… / 90… formatlarını wa.me için 905XXXXXXXXX yap */
  function normalizeWhatsAppDigits(raw) {
    var s = String(raw || '').replace(/\D/g, '');
    if (!s) return '';
    if (s.length >= 12 && s.slice(0, 2) === '90') {
      return s.length > 12 ? s.slice(0, 12) : s;
    }
    if (s.length === 11 && s.charAt(0) === '0' && s.charAt(1) === '5') {
      return '90' + s.slice(1);
    }
    if ((s.length === 10 || s.length === 9) && s.charAt(0) === '5') {
      return '90' + s;
    }
    return s;
  }

  function isPlausibleWhatsApp(num) {
    return typeof num === 'string' && num.length >= 10 && num.length <= 15 && /^[0-9]+$/.test(num);
  }

  function getWhatsAppNumber() {
    var fromSettings = normalizeWhatsAppDigits(getSettings().whatsapp || '');
    if (isPlausibleWhatsApp(fromSettings)) return fromSettings;
    var fromSite = normalizeWhatsAppDigits(SITE_WHATSAPP);
    if (isPlausibleWhatsApp(fromSite)) return fromSite;
    var fallback = normalizeWhatsAppDigits(DEFAULT_WHATSAPP);
    return isPlausibleWhatsApp(fallback) ? fallback : SITE_WHATSAPP;
  }

  function getWhatsAppUrl(message) {
    var num = getWhatsAppNumber();
    var text = encodeURIComponent(message || DEFAULT_WHATSAPP_MESSAGE);
    return 'https://wa.me/' + num + '?text=' + text;
  }

  function applyWhatsAppDataLinks() {
    var cfg = window.DinamikConfig;
    if (!cfg || typeof cfg.getWhatsAppUrl !== 'function') return;
    document.querySelectorAll('[data-whatsapp]').forEach(function (a) {
      var msg = a.getAttribute('data-whatsapp-msg') || DEFAULT_WHATSAPP_MESSAGE;
      a.href = cfg.getWhatsAppUrl(msg);
    });
  }

  function mountGlobalWhatsAppCta() {
    if (document.body && document.querySelector('.global-whatsapp-cta')) return;
    if (document.body && document.body.hasAttribute('data-whatsapp-floating-disable')) return;
    if (!document.body) return;

    var link = document.createElement('a');
    link.className = 'global-whatsapp-cta';
    link.setAttribute('data-whatsapp', '');
    link.setAttribute('data-whatsapp-msg', DEFAULT_WHATSAPP_MESSAGE);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.setAttribute('aria-label', 'WhatsApp ile bize yazın');
    link.innerHTML = '<span class="global-whatsapp-cta-icon" aria-hidden="true">💬</span><span class="global-whatsapp-cta-text">WhatsApp</span>';
    document.body.appendChild(link);
    applyWhatsAppDataLinks();
  }

  function renderFooterSocial() {
    var el = document.getElementById('footer-social');
    if (!el) return;
    var s = getSettings();
    var links = [
      { key: 'social_facebook', url: s.social_facebook, label: 'Facebook', icon: 'facebook' },
      { key: 'social_instagram', url: s.social_instagram, label: 'Instagram', icon: 'instagram' },
      { key: 'social_twitter', url: s.social_twitter, label: 'X', icon: 'twitter' },
      { key: 'social_linkedin', url: s.social_linkedin, label: 'LinkedIn', icon: 'linkedin' },
      { key: 'social_youtube', url: s.social_youtube, label: 'YouTube', icon: 'youtube' }
    ].filter(function (x) { return x.url && x.url.trim(); });
    if (links.length === 0) { el.innerHTML = ''; el.style.display = 'none'; return; }
    el.style.display = '';
    el.innerHTML = links.map(function (x) {
      return '<a href="' + x.url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer" class="footer-social-link" title="' + x.label + '">' + x.label + '</a>';
    }).join('');
  }

  /**
   * Ödeme / yükleme API öneki. API_BASE doluysa onu kullanır; boşsa sayfa yolundan alt klasörü bulur
   * (örn. /magaza/urunler.html → /magaza + /api/...). Kök sitede '' kalır.
   */
  function getDinamikApiBase() {
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      return 'http://localhost:3001';
    }
    var b = window.API_BASE;
    if (b !== undefined && b !== null && String(b).trim() !== '') {
      return String(b).replace(/\/$/, '');
    }
    var path = (window.location.pathname || '/').replace(/\/[^/]+\.html?$/i, '').replace(/\/$/, '') || '';
    if (!path || path === '/') return '';
    return path;
  }
  window.getDinamikApiBase = getDinamikApiBase;

  window.DinamikConfig = {
    getWhatsAppNumber: getWhatsAppNumber,
    getWhatsAppUrl: getWhatsAppUrl,
    getSettings: getSettings,
    renderFooterSocial: renderFooterSocial,
    getDinamikApiBase: getDinamikApiBase,
    normalizeWhatsAppDigits: normalizeWhatsAppDigits,
    applyWhatsAppDataLinks: applyWhatsAppDataLinks
  };

  function bootFooterAndWhatsApp() {
    mountGlobalWhatsAppCta();
    renderFooterSocial();
    applyWhatsAppDataLinks();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootFooterAndWhatsApp);
  } else {
    bootFooterAndWhatsApp();
  }

  var agentBase = (typeof DINAMIKPOS_SALES_AGENT_API === 'string' ? DINAMIKPOS_SALES_AGENT_API : '').replace(/\/+$/, '');
  if (typeof window.DINAMIKPOS_CHAT_API_BASE === 'string' && String(window.DINAMIKPOS_CHAT_API_BASE).trim()) {
    window.DINAMIKPOS_CHAT_API_BASE = String(window.DINAMIKPOS_CHAT_API_BASE).trim().replace(/\/+$/, '');
  } else if (agentBase) {
    window.DINAMIKPOS_CHAT_API_BASE = agentBase;
  } else {
    var sitePath = typeof window.getDinamikApiBase === 'function' ? window.getDinamikApiBase() : '';
    sitePath = String(sitePath || '').replace(/\/+$/, '');
    window.DINAMIKPOS_CHAT_API_BASE = (sitePath ? sitePath : '') + '/api/dinamik-sales';
  }
})();
