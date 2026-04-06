/**
 * Form Security - Input sanitization & validation
 * Prepares for CSRF/XSS protection
 */

(function () {
  'use strict';

  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  function sanitizePhone(str) {
    return (str || '').replace(/\D/g, '').slice(0, 15);
  }

  function sanitizeEmail(str) {
    return (str || '').replace(/[<>"']/g, '').trim().slice(0, 254);
  }

  window.DinamikFormSecurity = {
    sanitize: sanitize,
    sanitizePhone: sanitizePhone,
    sanitizeEmail: sanitizeEmail
  };
})();
