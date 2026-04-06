/**
 * Tema değiştirici - Koyu / Açık
 * localStorage ile tercih saklanır
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dinamik_theme';

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'light';
  }

  function setTheme(theme) {
    theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleButtons(theme);
  }

  function updateToggleButtons(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      var target = btn.getAttribute('data-theme-toggle');
      btn.setAttribute('aria-pressed', target === theme ? 'true' : 'false');
      btn.classList.toggle('active', target === theme);
    });
  }

  setTheme(getTheme());

  document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-theme-toggle]');
      if (btn) {
        e.preventDefault();
        setTheme(btn.getAttribute('data-theme-toggle'));
      }
    });
  });
})();
