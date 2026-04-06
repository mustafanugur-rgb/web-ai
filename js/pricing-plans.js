/**
 * Ana sayfa yazılım paketleri — ürünler gibi localStorage (dinamik_pricing_plans)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dinamik_pricing_plans';

  var PRICING_PLANS_DEFAULT = [
    {
      id: 'starter',
      name: 'Başlangıç',
      priceMonthly: 499,
      billingLabel: '/ Ay',
      isCustomPrice: false,
      customPriceText: 'Özel Teklif',
      featured: false,
      features: ['POS + Adisyon takibi', '1 kasa / 2 kullanıcı', 'Temel raporlar', 'E-posta destek'],
      primaryBtnLabel: 'Ödemeye geç (Starter)',
      primaryHref: 'checkout.html?plan=starter',
      secondaryBtnLabel: 'Teklif Al',
      secondaryHref: '#ai-sales-assistant'
    },
    {
      id: 'growth',
      name: 'Profesyonel',
      priceMonthly: 899,
      billingLabel: '/ Ay',
      isCustomPrice: false,
      customPriceText: 'Özel Teklif',
      featured: true,
      features: ['POS + CRM + WhatsApp', '5 kasa / 10 kullanıcı', 'Sadakat programı', '7/24 destek'],
      primaryBtnLabel: 'Ödemeye geç (Growth)',
      primaryHref: 'checkout.html?plan=growth',
      secondaryBtnLabel: 'Teklif Al',
      secondaryHref: '#ai-sales-assistant'
    },
    {
      id: 'enterprise',
      name: 'Zincir',
      priceMonthly: 0,
      billingLabel: '',
      isCustomPrice: true,
      customPriceText: 'Özel Teklif',
      featured: false,
      features: ['Çok şube', 'Özel entegrasyon', 'SLA', 'Saha kurulum'],
      primaryBtnLabel: 'Kurumsal teklif iste',
      primaryHref: '#demo',
      secondaryBtnLabel: 'AI ile ön değerlendirme',
      secondaryHref: '#ai-sales-assistant'
    }
  ];

  function normalizePlan(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var id = String(raw.id || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!id) return null;
    var features = raw.features;
    if (typeof features === 'string') {
      features = features.split(/[\n,]/).map(function (s) { return s.trim(); }).filter(Boolean);
    }
    if (!Array.isArray(features)) features = [];
    return {
      id: id,
      name: String(raw.name || '').trim() || id,
      priceMonthly: Math.max(0, parseInt(raw.priceMonthly, 10) || 0),
      billingLabel: String(raw.billingLabel != null ? raw.billingLabel : '/ Ay'),
      isCustomPrice: !!raw.isCustomPrice,
      customPriceText: String(raw.customPriceText || 'Özel Teklif').trim(),
      featured: !!raw.featured,
      features: features,
      primaryBtnLabel: String(raw.primaryBtnLabel || 'Devam').trim(),
      primaryHref: String(raw.primaryHref || '#').trim(),
      secondaryBtnLabel: String(raw.secondaryBtnLabel || 'İletişim').trim(),
      secondaryHref: String(raw.secondaryHref || '#').trim()
    };
  }

  function getPricingPlans() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) return PRICING_PLANS_DEFAULT.slice();
      var arr = JSON.parse(stored);
      if (!Array.isArray(arr)) return PRICING_PLANS_DEFAULT.slice();
      if (arr.length === 0) return [];
      var out = arr.map(normalizePlan).filter(Boolean);
      return out.length ? out : [];
    } catch (e) {
      return PRICING_PLANS_DEFAULT.slice();
    }
  }

  function setPricingPlans(arr) {
    if (!Array.isArray(arr)) return;
    var cleaned = arr.map(normalizePlan).filter(Boolean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  /**
   * Ödeme sayfası: sadece aylık fiyatı olan paketler
   */
  function getCheckoutPlansObject() {
    var fallback = {
      starter: {
        name: 'Starter',
        price: 499,
        features: ['POS + Adisyon takibi', '1 kasa / 2 kullanıcı', 'Temel raporlar', 'E-posta destek']
      },
      growth: {
        name: 'Growth',
        price: 899,
        features: ['POS + CRM + WhatsApp', '5 kasa / 10 kullanıcı', 'Sadakat programı', '7/24 destek']
      }
    };
    var list = getPricingPlans();
    var out = {};
    list.forEach(function (p) {
      if (!p || p.isCustomPrice) return;
      if (!(Number(p.priceMonthly) > 0)) return;
      out[p.id] = {
        name: p.name,
        price: Number(p.priceMonthly),
        features: p.features && p.features.length ? p.features.slice() : ['—']
      };
    });
    return Object.keys(out).length ? out : fallback;
  }

  function renderHomePricingPlans() {
    var root = document.getElementById('home-pricing-plans');
    if (!root) return;
    var plans = getPricingPlans();
    root.innerHTML = plans
      .map(function (p) {
        var featClass = 'premium-plan' + (p.featured ? ' featured' : '');
        var priceHtml;
        if (p.isCustomPrice) {
          priceHtml =
            '<div class="premium-price">' + escapeHtml(p.customPriceText || 'Özel Teklif') + '</div>';
        } else {
          priceHtml =
            '<div class="premium-price">' +
            escapeHtml(String(p.priceMonthly)) +
            ' TL <small>' +
            escapeHtml(p.billingLabel || '/ Ay') +
            '</small></div>';
        }
        return (
          '<article class="' +
          featClass +
          '">' +
          '<h3>' +
          escapeHtml(p.name) +
          '</h3>' +
          priceHtml +
          '<div class="premium-plan-actions">' +
          '<a href="' +
          escapeAttr(p.primaryHref) +
          '" class="btn btn-secondary btn-block">' +
          escapeHtml(p.primaryBtnLabel) +
          '</a>' +
          '<a href="' +
          escapeAttr(p.secondaryHref) +
          '" class="btn btn-primary btn-block">' +
          escapeHtml(p.secondaryBtnLabel) +
          '</a>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');
  }

  window.getPricingPlans = getPricingPlans;
  window.setPricingPlans = setPricingPlans;
  window.getCheckoutPlansObject = getCheckoutPlansObject;
  window.PRICING_PLANS_DEFAULT = PRICING_PLANS_DEFAULT;

  window.renderHomePricingPlans = renderHomePricingPlans;

  document.addEventListener('DOMContentLoaded', function () {
    renderHomePricingPlans();
  });
})();
