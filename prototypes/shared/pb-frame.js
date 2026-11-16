/* ==========================================================================
   Portfolio Builder blocks: the app (pb/app.html) runs in an iframe inside the
   block's screen. A new state loads in a second, hidden iframe on top of the
   current one; once it has loaded and its fonts are in, it fades in and the old
   one goes. So switching states never shows a blank screen or a font swap.

   PBFrame(screen, url, title)   used from Block({ keep: true, render })
   ========================================================================== */
(function () {
  // every document of the app (the shell and its panes) has its fonts in
  function ready(f) {
    var docs = [];
    try {
      var d = f.contentDocument;
      docs.push(d);
      [].forEach.call(d.querySelectorAll('iframe'), function (x) { if (x.contentDocument) docs.push(x.contentDocument); });
    } catch (e) {}
    return Promise.all(docs.map(function (d) { return d.fonts ? d.fonts.ready : null; }))
      .then(function () { return new Promise(function (r) { setTimeout(r, 60); }); });   // a beat to lay out (not rAF: it pauses in hidden frames)
  }

  window.PBFrame = function (screen, url, title) {
    var f = document.createElement('iframe');
    f.className = 'pb-app';
    f.title = title;
    f.src = url;
    var shown = screen.querySelector('.pb-app.is-shown');
    screen._latest = f;
    if (!shown) {   // the first one: no fade
      f.classList.add('is-shown');
      screen.appendChild(f);
      return;
    }
    screen.appendChild(f);   // hidden until ready (CSS: .pb-app without .is-shown)
    f.addEventListener('load', function () {
      ready(f).then(function () {
        if (screen._latest !== f) { f.remove(); return; }   // a newer state came in meanwhile
        f.classList.add('is-shown');
        setTimeout(function () {
          [].forEach.call(screen.querySelectorAll('.pb-app'), function (x) { if (x !== f) x.remove(); });
        }, 220);
      });
    });
  };
})();
