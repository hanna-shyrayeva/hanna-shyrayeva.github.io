/* ==========================================================================
   Site menu — on a phone the header links fold into a menu under the header.
   The burger opens it; a link, Escape, a tap outside or a wider screen closes it.
   ========================================================================== */
(function () {
  function init() {
    var top = document.querySelector('.top'), btn = top && top.querySelector('.top__burger');
    if (!btn) return;
    function set(open) {
      top.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    btn.addEventListener('click', function () { set(!top.classList.contains('is-open')); });
    top.querySelectorAll('.top__nav a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && top.classList.contains('is-open')) { set(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!top.contains(e.target)) set(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 760) set(false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
