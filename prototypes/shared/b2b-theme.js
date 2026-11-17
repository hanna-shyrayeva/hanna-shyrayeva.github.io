/* Light / dark for the advisor portal prototypes (17 Nov). Loaded in <head>, so the page never flashes light.
   The theme comes from #theme=dark in the address (the case page block puts it there), else from the
   frame this page sits in (the Portfolio builder's panes). window.B2BTheme(t) switches it live, and passes
   it on to the frames inside. data-app on this script tag: pb or hc (whose accent tokens differ), hc-own
   (Holdings collection, which has its own dark theme and a theme variable of its own) */
(function () {
  var me = document.currentScript, app = me && me.getAttribute('data-app'), html = document.documentElement;
  if (app) html.setAttribute('data-b2b', app);
  function initial() {
    var m = /(?:^|[#&])theme=(dark|light)/.exec(location.hash);
    if (m) return m[1];
    try { if (window.parent !== window) return parent.document.documentElement.getAttribute('data-theme') || 'light'; } catch (e) {}
    return 'light';
  }
  function set(t) {
    if (t !== 'dark') t = 'light';
    html.setAttribute('data-theme', t);
    if (app === 'hc-own' && typeof window.theme === 'string') window.theme = t;   // its own Display switch reads this
    [].forEach.call(document.querySelectorAll('iframe'), function (f) {
      try { if (f.contentWindow && f.contentWindow.B2BTheme) f.contentWindow.B2BTheme(t); } catch (e) {}
    });
  }
  window.B2BTheme = set;
  set(initial());
  window.addEventListener('message', function (e) { var m = e.data; if (m && m.type === 'b2b-theme') set(m.theme); });
})();
