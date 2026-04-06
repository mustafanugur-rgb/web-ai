/**
 * SEO runtime overrides from admin settings.
 * Note: Dynamic meta updates are best-effort for client side.
 */
(function () {
  'use strict';

  function getSettings() {
    try {
      var raw = localStorage.getItem('dinamik_settings');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function upsertMeta(attr, key, content) {
    if (!content) return;
    var selector = 'meta[' + attr + '="' + key + '"]';
    var el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  var settings = getSettings();
  var path = (window.location.pathname || '/').toLowerCase();
  var title = '';
  var description = '';

  if (path === '/' || path.endsWith('/index.html')) {
    title = settings.seo_home_title || '';
    description = settings.seo_home_description || '';
  } else if (path.endsWith('/urunler.html')) {
    title = settings.seo_products_title || '';
    description = settings.seo_products_description || '';
  }

  if (!description) {
    description = settings.seo_global_description || '';
  }

  if (title) document.title = title;
  if (description) {
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:description', description);
    upsertMeta('name', 'twitter:description', description);
  }
  if (title) {
    upsertMeta('property', 'og:title', title);
    upsertMeta('name', 'twitter:title', title);
  }
  if (settings.seo_site_name) {
    upsertMeta('property', 'og:site_name', settings.seo_site_name);
  }
  if (settings.seo_og_image) {
    upsertMeta('property', 'og:image', settings.seo_og_image);
    upsertMeta('name', 'twitter:image', settings.seo_og_image);
  }
})();
