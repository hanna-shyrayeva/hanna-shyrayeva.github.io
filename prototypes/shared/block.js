/* ==========================================================================
   Prototype block — builds the story column (title, the states as a
   one-per-line list with the active note underneath, Web / Mobile and
   Light / Dark switches) and a scaled device for the app.

   Block({
     el, eyebrow, title, intro, hint,
     states: [{ id, label, note }],
     webOnly,      // optional: no Web / Mobile switch (a page that only makes sense on the web)
     render(ctx)   // ctx: { mode: 'web'|'mob', theme, state, screen, go(id), note(text), setTheme(t) }
   })
   ========================================================================== */
(function () {
  var SIZE = { web: [1440, 1080], mob: [393, 852] };
  var WEB_MIN = 1024;     // narrowest web layout (sidebar 312 + a usable page)

  function h(tag, attrs, html) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }

  function seg(label, options, value, onPick) {
    var box = h('div', { class: 'pb-seg', role: 'group', 'aria-label': label });
    options.forEach(function (o) {
      var b = h('button', { type: 'button', 'aria-pressed': String(o[0] === value) }, o[1]);
      b.addEventListener('click', function () { onPick(o[0]); });
      box.appendChild(b);
    });
    return box;
  }

  /* inside the case page the block lives in an iframe that grows to fit it: the page tells it
     the real window height (--pb-vh), and the block reports its own height back */
  var EMBED = window.parent !== window, VH = null, siteTheme = null, PINNED = false;   // PINNED: the case page holds this prototype in place while the page scrolls
  function viewH() { return VH || window.innerHeight; }
  function report() { if (EMBED) parent.postMessage({ type: 'pb-height', h: document.documentElement.getBoundingClientRect().height }, '*'); }

  window.Block = function (cfg) {
    var root = cfg.el;
    var st = { mode: 'web', theme: 'light', state: cfg.states[0].id, narrow: false };
    // deep link: #state=manual&mode=mob&theme=dark
    var q = new URLSearchParams(location.hash.slice(1));
    if (cfg.states.some(function (s) { return s.id === q.get('state'); })) st.state = q.get('state');
    if (q.get('mode') === 'web' || q.get('mode') === 'mob') st.mode = q.get('mode');
    if (q.get('theme') === 'light' || q.get('theme') === 'dark') st.theme = q.get('theme');

    root.classList.add('pb');
    if (q.get('bare')) document.documentElement.classList.add('pb-bare');   // only the device, for preview images
    if (q.get('bg')) document.documentElement.style.setProperty('--pb-bare-bg', '#' + q.get('bg').replace(/[^0-9a-f]/gi, ''));   // background for exported images
    if (q.get('site') === 'dark') document.documentElement.classList.add('pb-site-dark');   // dark browser frame, for the dark-site images
    var story = h('div', { class: 'pb-story' });
    var head = h('div', { class: 'pb-head' });
    if (cfg.eyebrow) head.appendChild(h('p', { class: 'pb-eyebrow' }, cfg.eyebrow));
    head.appendChild(h('h2', { class: 'pb-title' }, cfg.title));
    if (cfg.intro) head.appendChild(h('p', { class: 'pb-intro' }, cfg.intro));
    story.appendChild(head);
    var steps = h('ol', { class: 'pb-steps', 'aria-label': 'Screen states' });
    story.appendChild(steps);
    var controls = h('div', { class: 'pb-controls' });
    story.appendChild(controls);
    if (cfg.hint) story.appendChild(h('p', { class: 'pb-hint' }, cfg.hint));

    var stage = h('div', { class: 'pb-stage' });
    root.appendChild(story);
    root.appendChild(stage);

    /* two scroll areas on the case page: the page moves from one prototype to the next,
       the device only ever scrolls its own screen, and stops at the end instead of moving the page */
    if (EMBED) stage.addEventListener('wheel', function (e) {
      if (!PINNED) return;   // prototypes stacked one after another (narrow window): the page scrolls as usual
      if (!e.target.closest || !e.target.closest('.pb-device')) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   // sideways rows scroll as usual
      for (var el = e.target; el && el !== stage; el = el.parentElement) {
        var oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1 &&
            (e.deltaY > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0)) return;   // it can still scroll: it takes the wheel
      }
      e.preventDefault();
    }, { passive: false });

    var noteEl = null;
    function drawSteps() {
      steps.innerHTML = '';
      cfg.states.forEach(function (s) {
        var on = s.id === st.state;
        var b = h('button', { type: 'button', class: 'pb-step' }, '<span class="pb-step__t"></span><span class="pb-step__d" aria-live="polite"></span>');
        if (on) b.setAttribute('aria-current', 'step');
        b.querySelector('.pb-step__t').textContent = s.label;
        b.querySelector('.pb-step__d').innerHTML = s.note || '';
        if (on) noteEl = b.querySelector('.pb-step__d');
        b.addEventListener('click', function () { go(s.id); });
        var li = h('li');
        li.appendChild(b);
        steps.appendChild(li);
      });
    }

    function drawControls() {
      controls.innerHTML = '';
      if (!st.narrow && !cfg.webOnly) controls.appendChild(seg('Platform', [['web', 'Web'], ['mob', 'Mobile']], st.mode, function (m) { st.mode = m; draw(); }));
      controls.appendChild(seg('Theme', [['light', 'Light'], ['dark', 'Dark']], st.theme, function (t) { st.theme = t; draw(); }));
    }

    /* the whole device always fits the browser window: the window height sets the scale.
       web: the app is fluid, so its width (1024–1440) is picked to fill the room at that scale */
    function room() { return stage.clientWidth - (st.narrow ? 32 : 48) - (st.mode === 'mob' ? 20 : 0); }
    function heightScale(h, chrome) {
      // the stage is as tall as the window (minus the page padding); stacked layouts fall back to the window
      var avail = root.classList.contains('is-stacked') ? viewH() * 0.86 : stage.clientHeight - (st.narrow ? 32 : 48);
      return Math.min(1, (avail - chrome) / h);
    }
    function webSize() {
      var s = heightScale(SIZE.web[1], 28);
      var w = Math.round(Math.max(WEB_MIN, Math.min(SIZE.web[0], room() / s)));
      return [w, SIZE.web[1]];
    }
    function sizeNow() { return st.mode === 'web' ? webSize() : SIZE.mob; }

    var screen, clip;
    function drawDevice() {
      stage.innerHTML = '';
      var size = sizeNow();
      var device = h('div', { class: 'pb-device pb-device--' + st.mode });
      if (st.mode === 'web') device.appendChild(h('div', { class: 'pb-bar', 'aria-hidden': 'true' }, '<i></i><i></i><i></i>'));
      clip = h('div', { class: 'pb-clip' });
      screen = h('div', { class: 'pb-screen', 'data-theme': st.theme });
      screen.style.width = size[0] + 'px';
      screen.style.height = size[1] + 'px';
      clip.appendChild(screen);
      device.appendChild(clip);
      stage.appendChild(device);
      fit();
    }

    function fit() {
      if (!screen) return;
      var size = sizeNow();
      screen.style.width = size[0] + 'px';
      screen.style.height = size[1] + 'px';
      screen.classList.toggle('is-narrow', st.mode === 'web' && size[0] < 1300);
      var s = Math.min(1, room() / size[0]);
      if (st.mode === 'web') s = Math.min(s, heightScale(size[1], 28));
      else s = Math.min(s, heightScale(size[1], 20), 0.9);
      screen.style.transform = 'scale(' + s + ')';
      clip.style.width = Math.round(size[0] * s) + 'px';
      clip.style.height = Math.round(size[1] * s) + 'px';
    }

    // the app itself can change the theme (a setting inside the prototype): the switch follows, no redraw
    function setTheme(t) { st.theme = t; drawControls(); if (screen) screen.setAttribute('data-theme', t); }

    function setNote(text) { if (noteEl) noteEl.textContent = text || ''; }

    /* each draw is a new generation: timers left over from an earlier state (a typing demo, an auto
       step) can't change the note, the theme or the state any more */
    var gen = 0;
    function draw() {
      var my = ++gen;
      function live(fn) { return function () { if (my === gen) return fn.apply(null, arguments); }; }
      drawSteps();
      drawControls();
      drawDevice();
      cfg.render({ mode: st.mode, theme: st.theme, state: st.state, screen: screen, go: live(go), note: live(setNote), setTheme: live(setTheme) });
    }

    function index() { for (var i = 0; i < cfg.states.length; i++) if (cfg.states[i].id === st.state) return i; return 0; }
    function go(id) { st.state = id; draw(); report(); if (EMBED) parent.postMessage({ type: 'pb-state', index: index() }, '*'); }

    function layout() {
      var w = root.clientWidth;
      var narrow = w < 560;
      root.classList.toggle('is-stacked', w < 860);
      if (narrow !== st.narrow) {
        st.narrow = narrow;
        if (narrow) st.mode = 'mob';
        draw();
      } else fit();
    }

    st.narrow = root.clientWidth < 560;
    if (st.narrow) st.mode = 'mob';
    root.classList.toggle('is-stacked', root.clientWidth < 860);
    draw();
    if (window.ResizeObserver) new ResizeObserver(layout).observe(root);
    window.addEventListener('resize', layout);   // the window height changes the scale too
    if (EMBED) {
      document.documentElement.classList.add('pb-embed');
      var hintEl = story.querySelector('.pb-hint');
      window.addEventListener('message', function (e) {
        var m = e.data; if (!m) return;
        if (m.type === 'pb-vh') {
          VH = m.h; PINNED = !!m.pin; document.documentElement.style.setProperty('--pb-vh', VH + 'px'); layout(); report();
          /* on the case page the block sits on a coloured band: take its colour, drop the stage panel */
          if (m.bg) { document.documentElement.style.setProperty('--pb-page-bg', m.bg); document.documentElement.classList.add('pb-on-band'); }
          /* the site's light / dark theme: the portfolio chrome follows it, and so does the app inside */
          if (m.site && m.site !== siteTheme) {
            siteTheme = m.site;
            document.documentElement.classList.toggle('pb-site-dark', m.site === 'dark');
            if (st.theme !== m.site) setTheme(m.site);
          }
          /* scroll-driven page: scrolling steps through the states, so the hint says so */
          if (hintEl) hintEl.textContent = m.scrolly ? 'Scroll to step through the states, or pick one.' : cfg.hint;
        }
        if (m.type === 'pb-go' && cfg.states[m.index] && m.index !== index()) { st.state = cfg.states[m.index].id; draw(); report(); }
      });
      if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
      parent.postMessage({ type: 'pb-ready', n: cfg.states.length, index: index() }, '*');
    }

    return { go: go };
  };
})();
