/* ==========================================================================
   Site theme — light / dark for the portfolio pages.
   The choice is remembered on this device; without one, the system setting wins.
   The early part (setting data-theme before the page paints) is inlined in each
   page's <head>; this file wires up the header switch and tells the page when the
   theme changes (event "sitetheme"), so the case page can pass it on to the prototypes.
   ========================================================================== */
(function () {
  var root = document.documentElement, KEY = 'site-theme';
  function current() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function save(t) { try { localStorage.setItem(KEY, t); } catch (e) { /* private mode: just don't remember */ } }
  function set(t) {
    root.setAttribute('data-theme', t);
    var b = document.getElementById('theme-toggle');
    if (b) {
      b.setAttribute('aria-pressed', String(t === 'dark'));
      b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      b.title = b.getAttribute('aria-label');
    }
    window.dispatchEvent(new CustomEvent('sitetheme', { detail: t }));
  }
  function init() {
    var b = document.getElementById('theme-toggle');
    if (b) b.addEventListener('click', function () { var t = current() === 'dark' ? 'light' : 'dark'; save(t); set(t); });
    set(current());
    // follow the system while the visitor hasn't chosen
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      var follow = function (e) { var saved = null; try { saved = localStorage.getItem(KEY); } catch (x) {} if (!saved) set(e.matches ? 'dark' : 'light'); };
      if (mq.addEventListener) mq.addEventListener('change', follow);
    }
  }
  window.SiteTheme = { current: current, set: set };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
