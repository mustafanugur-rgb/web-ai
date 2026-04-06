/**
 * Sticky Mobile CTA - Show on scroll for mobile
 */

(function () {
  'use strict';

  const stickyCta = document.getElementById('sticky-cta');
  if (!stickyCta) return;

  const BREAKPOINT = 768;
  const SCROLL_THRESHOLD = 400;

  function isMobile() {
    return window.innerWidth <= BREAKPOINT;
  }

  function onScroll() {
    if (!isMobile()) {
      stickyCta.style.opacity = '0';
      stickyCta.style.pointerEvents = 'none';
      return;
    }
    if (window.scrollY > SCROLL_THRESHOLD) {
      stickyCta.style.opacity = '1';
      stickyCta.style.pointerEvents = 'auto';
    } else {
      stickyCta.style.opacity = '0';
      stickyCta.style.pointerEvents = 'none';
    }
  }

  stickyCta.style.transition = 'opacity 0.25s ease';
  stickyCta.style.opacity = '0';

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
