/* The case pages' prototype deck: the arrows and dots stand 16 px right of the web screen, wherever
   it ends (a Njorda app screen is limited by the window height and stays narrower than the stage),
   never closer than 24 px to the window edge and the scrollbar (her ask, 16 Nov).
   The phone keeps the place of the last web screen, so the nav doesn't jump on Web / Mobile. */
(function () {
  var deck = document.querySelector('.deck'); if (!deck) return;
  var nav = deck.querySelector('.deck__nav'), stage = deck.querySelector('.deck__stage');
  var GAP = 16, EDGE = 24;
  function place() {
    if (!deck.classList.contains('is-on')) { nav.style.right = ''; return; }
    var f = deck.querySelector('iframe.block.is-active'); if (!f) return;
    var d = null; try { d = f.contentDocument.querySelector('.pb-device--web'); } catch (e) {}
    if (!d) return;
    var screenRight = f.getBoundingClientRect().left + d.getBoundingClientRect().right;
    var stageRight = stage.getBoundingClientRect().right, winRight = document.documentElement.clientWidth;
    var r = stageRight - (screenRight + GAP + nav.offsetWidth);
    r = Math.max(r, stageRight - (winRight - EDGE));   // never past 24 px from the window edge
    nav.style.right = Math.round(r) + 'px';
  }
  window.addEventListener('resize', place);
  window.addEventListener('message', function () { setTimeout(place, 0); });   // a prototype drew or resized itself
  if (window.MutationObserver) new MutationObserver(place).observe(deck, { subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('load', place);
})();

/* Narrow screens (the prototypes one after another): the iframes load lazily and grow from one window
   tall to their real height when they arrive. On a jump (a tab inside a prototype) or a fast scroll the
   ones on the way grew under the reader and the page jumped. So once the reader gets near the
   prototypes, all of them load (17 Nov) */
(function () {
  var frames = [].slice.call(document.querySelectorAll('.deck iframe.block[loading="lazy"]'));
  if (!frames.length || !window.IntersectionObserver) return;
  var io = new IntersectionObserver(function (es) {
    if (!es.some(function (e) { return e.isIntersecting; })) return;
    frames.forEach(function (f) { f.setAttribute('loading', 'eager'); });
    io.disconnect();
  }, { rootMargin: '1500px 0px' });
  document.querySelectorAll('.deck').forEach(function (d) { io.observe(d); });
})();

/* A phone: Open full screen under a prototype (17 Nov, option D3). The prototype opens over the whole page in
   its full-screen mode (#full=1, see block.js); Close, the phone's Back or Escape bring the reader back to the
   same place, and the prototype on the page moves to the state they were last on. A tab inside the app
   (Home, Overview...) opens that prototype, still full screen */
(function () {
  var ov = null, from = null, first = null, last = -1, theme = null, pushed = false;
  function frameOf(win) { return [].filter.call(document.querySelectorAll('iframe'), function (f) { return f.contentWindow === win; })[0]; }
  function open(url) {
    if (!ov) {
      ov = document.createElement('div');
      ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Prototype, full screen');
      ov.style.cssText = 'position:fixed;inset:0;z-index:1000;background:' + getComputedStyle(document.body).backgroundColor;
      ov.innerHTML = '<iframe style="display:block;width:100%;height:100%;border:0" title="Interactive prototype, full screen"></iframe>';
      document.body.appendChild(ov);
      document.documentElement.style.overflow = 'hidden';
      try { history.pushState({ pbFull: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    }
    last = -1;
    ov.firstChild.src = url;
    ov.firstChild.focus();
  }
  function close() {
    if (!ov) return;
    ov.remove(); ov = null; document.documentElement.style.overflow = '';
    if (from && from.contentWindow && last >= 0) from.contentWindow.postMessage({ type: 'pb-go', index: last }, '*');
    if (from && from.contentWindow && theme) from.contentWindow.postMessage({ type: 'pb-set-theme', theme: theme }, '*');   // the theme picked in full screen stays
    theme = null;
    if (from && from !== first) from.scrollIntoView({ block: 'start' });   // another prototype was opened from a tab: the page is there too
    from = null;
  }
  function ask() { if (pushed) { pushed = false; history.back(); } else close(); }   // Back closes it too, so the history stays clean
  window.addEventListener('popstate', function () { if (ov) { pushed = false; close(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov) ask(); });
  window.addEventListener('message', function (e) {
    var m = e.data; if (!m) return;
    var inOv = ov && e.source === ov.firstChild.contentWindow;
    if (m.type === 'pb-full' && m.url && !inOv) { from = first = frameOf(e.source); open(m.url); return; }
    // the advisor portal: a jump to another prototype (deck-go: Build portfolio, Clients...) asked from inside full screen opens that one, full screen
    if (m.type === 'deck-go' && ov && window.DECK_TO && window.DECK_TO[m.to] && e.origin === location.origin) {
      var g = document.querySelector('iframe.block[src*="' + window.DECK_TO[m.to] + '"]'); if (!g) return;
      from = g; last = -1;
      var fr = ov.firstChild, k = m.k || 0, dk = document.documentElement.getAttribute('data-theme') === 'dark';
      fr.addEventListener('load', function once() { fr.removeEventListener('load', once); setTimeout(function () { if (k && fr.contentWindow) fr.contentWindow.postMessage({ type: 'pb-go', index: k }, '*'); }, 300); });
      fr.contentWindow.location.replace(new URL(g.getAttribute('src') + '#mode=web&full=1&theme=' + (dk ? 'dark' : 'light') + (dk ? '&site=dark' : ''), location.href).href);
      return;
    }
    if (!inOv) return;
    if (m.type === 'pb-state' && typeof m.index === 'number') last = m.index;
    if (m.type === 'pb-full-close') { if (typeof m.index === 'number') last = m.index; if (m.theme) theme = m.theme; ask(); }
    if (m.type === 'pb-open' && m.proto) {   // a tab inside the app: that prototype, full screen; the page follows it on close
      var f = document.querySelector('iframe.block[src="prototypes/' + m.proto + '.html"]'); if (!f) return;
      from = f;
      var site = document.documentElement.getAttribute('data-theme') === 'dark' ? '&site=dark' : '';
      var th = '';
      try { th = ov.firstChild.contentDocument.querySelector('.pb-screen').getAttribute('data-theme'); } catch (x) {}
      // replace, not src: a new src adds a history entry, and Back would then step the frame instead of closing
      ov.firstChild.contentWindow.location.replace(new URL('prototypes/' + m.proto + '.html#mode=mob&full=1' + (m.state ? '&state=' + m.state : '') + (th ? '&theme=' + th : '') + site, location.href).href);
      last = -1;
    }
  });
})();
