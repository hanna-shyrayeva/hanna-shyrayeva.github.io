/* ==========================================================================
   Prototype block — builds the story column (title, the states as a
   one-per-line list with the active note underneath, Web / Mobile and
   Light / Dark switches) and a scaled device for the app.

   Block({
     el, eyebrow, title, intro, hint,
     states: [{ id, label, note }],
     webOnly,      // optional: no Web / Mobile switch (a page that only makes sense on the web)
     themes,       // optional: false = no Light / Dark switch (an app with a light theme only)
     webMin,       // optional: narrowest web width for this app (default 1024)
     webH,         // optional: web screen height (default 1080); with fill, the smallest height
     fill,         // optional: true = a web app at width webMin (wider up to 1440 when there's room) fills the stage, its height grows to the room
     open(state),  // optional: a web-only app's own page for that state; on a phone the block links to it
     keep,         // optional: true = a state change keeps the device; render() swaps the app inside it
     render(ctx)   // ctx: { mode: 'web'|'mob', theme, state, screen, go(id), note(text), setTheme(t) }
   })
   returns { go(id), mark(id) }: mark moves the list to a state the app reached by itself, without a redraw
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
  var EMBED = window.parent !== window, VH = null, VH_W = 0, siteTheme = null, PINNED = false;   // PINNED: the case page holds this prototype in place while the page scrolls
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
    /* #full=1: the prototype alone on a phone's whole screen (opened from the case page, 17 Nov): a bar with the
       title and Close on top, the app in the middle, the states and the note underneath (option D3) */
    var FULL = q.get('full') === '1';
    if (FULL) { if (cfg.webOnly || !q.get('mode')) st.mode = cfg.webOnly ? 'web' : 'mob'; document.documentElement.classList.add('pb-full'); }

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
    if (cfg.fill) root.classList.add('pb--fill');

    var stage = h('div', { class: 'pb-stage' });

    /* a phone (17 Nov, her pick, option A): the title and intro, then one window-tall area: the states as tabs, the
       state's note (always shown whole) and the device. Tabs and note keep one height for every state, so the device
       never changes size. On the screen's corner: the theme and full screen. #full=1 (the prototype alone on the
       whole screen) is the same area, with Exit full screen in the corner */
    var swrap = h('div', { class: 'pb-swrap' }), sbox = h('div', { class: 'pb-sbox' });
    var fpanel = h('div', { class: 'pb-fpanel' }, '<div class="pb-frow"><div class="pb-fchips" role="group" aria-label="Screen states"></div></div><p class="pb-fnote"></p>');
    var fchips = fpanel.querySelector('.pb-fchips'), fnote = fpanel.querySelector('.pb-fnote');
    cfg.states.forEach(function (s) { var b = h('button', { type: 'button', class: 'pb-fchip' }); b.textContent = s.label; b.addEventListener('click', function () { go(s.id); }); fchips.appendChild(b); });
    var ICON = {"phone":"<rect x=\"7\" y=\"3\" width=\"10\" height=\"18\" rx=\"2\"/><path d=\"M11 18h2\"/>","monitor":"<rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 20h8M12 16v4\"/>","moon":"<path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z\"/>","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4\"/>","max":"<path d=\"M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4\"/>","min":"<path d=\"M8 4v4H4M16 4v4h4M8 20v-4H4M16 20v-4h4\"/>"};
    function svg(k) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>'; }
    var ficons = h('div', { class: 'pb-ficons' });
    var iTheme = h('button', { type: 'button', class: 'pb-ficon' }), iFull = h('button', { type: 'button', class: 'pb-ficon' }), iDev = h('button', { type: 'button', class: 'pb-ficon' });
    // the left column: the theme, and under it Web / Mobile for an app that has both (her ask, 17 Nov); full screen: only Exit
    var fleft = h('div', { class: 'pb-ficons__l' });
    if (cfg.themes !== false && !FULL) fleft.appendChild(iTheme);
    if (!cfg.webOnly && !FULL) { fleft.appendChild(iDev); root.classList.add('pb--dev'); }
    if (fleft.children.length) ficons.appendChild(fleft);
    ficons.appendChild(iFull);
    iDev.addEventListener('click', function () { st.mode = st.mode === 'web' ? 'mob' : 'web'; draw(); report(); });
    iTheme.addEventListener('click', function () { st.theme = st.theme === 'dark' ? 'light' : 'dark'; draw(); });
    iFull.addEventListener('click', function () {
      if (FULL) { if (EMBED) parent.postMessage({ type: 'pb-full-close', index: index(), theme: st.theme }, '*'); else history.back(); return; }
      openFull();
    });
    function openFull() {
      var u = location.pathname + '#state=' + st.state + '&mode=' + st.mode + '&theme=' + st.theme + '&full=1' + (siteTheme === 'dark' ? '&site=dark' : '');
      if (EMBED) parent.postMessage({ type: 'pb-full', url: u }, '*'); else location.href = u;
    }
    function drawIcons() {
      var web = st.mode === 'web';
      iDev.innerHTML = svg(web ? 'phone' : 'monitor'); iDev.setAttribute('aria-label', web ? 'Mobile version' : 'Web version'); iDev.title = iDev.getAttribute('aria-label');
      var dark = st.theme === 'dark';
      iTheme.innerHTML = svg(dark ? 'sun' : 'moon'); iTheme.setAttribute('aria-label', dark ? 'Light theme' : 'Dark theme'); iTheme.title = iTheme.getAttribute('aria-label');
      iFull.innerHTML = svg(FULL ? 'min' : 'max') + (FULL ? '<span>Exit</span>' : ''); iFull.setAttribute('aria-label', FULL ? 'Exit full screen' : 'Full screen'); iFull.title = iFull.getAttribute('aria-label');
    }
    function oneScreen() { return FULL || root.classList.contains('pb--b'); }
    function drawPager() {
      drawIcons();
      if (!oneScreen()) return;
      var i = index(), s = cfg.states[i];
      [].forEach.call(fchips.children, function (b, k) { if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      var c = fchips.children[i]; if (c) fchips.scrollLeft = Math.max(0, c.offsetLeft - (fchips.clientWidth - c.offsetWidth) / 2);   // not scrollIntoView: it would scroll the case page too
      fnote.innerHTML = noteEl ? noteEl.innerHTML : (s.note || '');
      // a note the app writes itself can be longer than any in the list: the room only grows, so it changes size once at most
      var nh = fnote.offsetHeight; if (nh > (parseFloat(fnote.style.minHeight) || 0)) fnote.style.minHeight = nh + 'px';
    }
    /* the area's height: the window under the case page's top bar (the page sends both); full screen: the whole window */
    var TOPBAR = 0;
    function sizeArea() { if (!FULL && oneScreen()) root.style.setProperty('--pb-sh', Math.max(420, Math.round((VH || window.innerHeight) - TOPBAR - 12)) + 'px'); }

    root.appendChild(story);
    if (FULL) root.classList.add('pb--full');
    sbox.appendChild(stage);
    // the icons: at the end of the tabs row on the page, so the phone stays centred (her ask, 17 Nov); over the app's corner in full screen
    // the icons: the two top corners of the screen's area on the page (theme left, full screen right, her pick 17 Nov),
    // so the phone stays centred; full screen: one Exit pill at the top centre, where the phone's island is
    sbox.appendChild(ficons);
    swrap.appendChild(fpanel);
    swrap.appendChild(sbox);
    root.appendChild(swrap);

    /* one scroll on the case page: while the page holds the prototype in place, the wheel always moves
       the page, which steps through the states; the screen inside shows each state from its top.
       Only the story column, when it is taller than the window, still scrolls itself */
    if (EMBED) document.addEventListener('wheel', function (e) {
      if (!PINNED || e.ctrlKey) return;   // prototypes stacked one after another (narrow window): the page scrolls as usual
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   // sideways rows scroll as usual
      if (!(e.target.closest && e.target.closest('.pb-device'))) {
        for (var el = e.target; el && el.nodeType === 1 && el !== document.body; el = el.parentElement) {
          var oy = getComputedStyle(el).overflowY;
          if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1 &&
              (e.deltaY > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0)) return;   // it can still scroll: it takes the wheel
        }
      }
      e.preventDefault();
      parent.postMessage({ type: 'pb-wheel', dy: e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewH() : 1) }, '*');
    }, { passive: false });

    var noteEl = null;
    function drawSteps() {
      /* built once; a state change only moves the marker, so the text never redraws (no flicker, no re-wrap) */
      var items = steps.querySelectorAll('.pb-step');
      if (items.length === cfg.states.length) {
        cfg.states.forEach(function (s, i) {
          var b = items[i], d = b.querySelector('.pb-step__d');
          if (s.id === st.state) { b.setAttribute('aria-current', 'step'); noteEl = d; } else b.removeAttribute('aria-current');
          if (d.hasAttribute('data-changed')) { d.innerHTML = s.note || ''; d.removeAttribute('data-changed'); }   // a note the app changed goes back
        });
        return;
      }
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

    /* stacked (a phone or a tablet): the story sits above the device, so a longer or shorter note would move
       the device and everything below it. The list keeps the height of its longest note */
    function lockNotes(el, cap) {
      el.style.minHeight = ''; var keep = el.innerHTML, max = 0;
      cfg.states.forEach(function (s) { el.innerHTML = s.note || ''; max = Math.max(max, el.offsetHeight); });
      el.innerHTML = keep; if (max) el.style.minHeight = (cap ? Math.min(max, cap) : max) + 'px';
    }
    function lockSteps() {
      steps.style.minHeight = '';
      if (oneScreen()) { lockNotes(fnote); return; }
      if (!root.classList.contains('is-stacked')) return;
      var items = steps.querySelectorAll('.pb-step'), cur = steps.querySelector('.pb-step[aria-current]'), max = 0;
      items.forEach(function (b) {
        if (cur) cur.removeAttribute('aria-current');
        b.setAttribute('aria-current', 'step'); max = Math.max(max, steps.offsetHeight); b.removeAttribute('aria-current');
      });
      if (cur) cur.setAttribute('aria-current', 'step');
      if (max) steps.style.minHeight = max + 'px';
    }
    var lockW = -1;
    function relock() { var w = root.clientWidth; if (w !== lockW) { lockW = w; lockSteps(); } }

    function drawControls() {
      controls.innerHTML = '';
      if (!st.narrow && !cfg.webOnly) controls.appendChild(seg('Platform', [['web', 'Web'], ['mob', 'Mobile']], st.mode, function (m) { st.mode = m; draw(); }));
      if (cfg.themes !== false) controls.appendChild(seg('Theme', [['light', 'Light'], ['dark', 'Dark']], st.theme, function (t) { st.theme = t; draw(); }));
    }

    /* the whole device always fits the browser window: the window height sets the scale.
       web: the app is fluid, so its width (1024–1440) is picked to fill the room at that scale */
    // the stage's own padding (a fill block sets it in its page); other blocks keep the fixed values
    function padV() { var cs = getComputedStyle(stage); return parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom); }
    function pad() { if (oneScreen()) { var cs = getComputedStyle(stage); return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight); } if (!cfg.fill) return st.narrow ? 32 : 48; var cs = getComputedStyle(stage); return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight); }
    function room() { return stage.clientWidth - pad() - (st.mode === 'mob' && !FULL ? 20 : 0) - (root.classList.contains('pb--b') && st.mode === 'mob' ? 88 : 0); }   // full screen has no phone frame; a phone keeps 44 px each side for the corner icons
    function heightScale(h, chrome) {
      // the stage is as tall as the window (minus the page padding); stacked layouts fall back to the window
      var avail = root.classList.contains('is-stacked') && !oneScreen() ? viewH() * 0.86 : stage.clientHeight - (oneScreen() ? padV() : pad());
      return Math.min(1, (avail - chrome) / h);
    }
    function webSize() {
      if (cfg.fill && root.classList.contains('is-stacked')) {
        /* one column (a tablet or a phone): a fixed 1024 or webMin wide picture of the app; on a phone it can
           be opened full screen (cfg.open) */
        var wt = st.narrow ? 1024 : (cfg.webMin || SIZE.web[0]);
        return [wt, Math.max(cfg.webH || 0, Math.round(wt * 0.68))];   // never below webH: the Njorda app's side menu needs 920
      }
      if (cfg.fill) {
        /* the app keeps its width (webMin) and fills the stage's width; it gets as tall as the room
           left (at least webH), so the device fills the stage both ways, with no bands around it */
        var w0 = Math.round(Math.min(SIZE.web[0], Math.max(cfg.webMin || SIZE.web[0], room()))), sw = Math.min(1, room() / w0);   // wider, up to 1440, when the stage has the room at full size
        // a tall block the case page doesn't pin (touch screens): no window to fill, the 4:3 cap below sets the height
        var avail = root.classList.contains('is-tall') && root.classList.contains('is-free') ? Infinity : (root.classList.contains('is-stacked') ? viewH() * 0.86 : stage.clientHeight - pad()) - 28;
        // never taller than a 4:3 screen: on a tall, narrow window (a tablet held upright) the app would turn into a long strip
        return [w0, Math.max(cfg.webH || 600, Math.min(Math.round(w0 * 0.75), Math.round(avail / sw)))];
      }
      var s = heightScale(cfg.webH || SIZE.web[1], 28);
      var w = Math.round(Math.max(cfg.webMin || WEB_MIN, Math.min(SIZE.web[0], room() / s)));
      return [w, cfg.webH || SIZE.web[1]];
    }
    // full screen: the app takes the whole window at its real size, no frame (her ask, 17 Nov)
    function sizeNow() {
      if (FULL) {
        var W = stage.clientWidth || window.innerWidth, H = stage.clientHeight || window.innerHeight;
        // a web app: the narrowest layout (1024), never taller than 696 (a laptop's shape) and not shorter than 576, scaled to fit (her ask, 17 Nov: short screens)
        if (st.mode === 'web' && !cfg.webOnly && cfg.webH) return [WEB_MIN, Math.max(696, cfg.webH)];   // the Njorda app: its side menu needs webH (920), as on the page
        if (st.mode === 'web') return [WEB_MIN, Math.round(Math.min(696, Math.max(576, H * WEB_MIN / W)))];
        return [W, H];
      }
      return st.mode === 'web' ? webSize() : SIZE.mob;
    }

    var screen, clip;
    function drawDevice() {
      stage.innerHTML = '';
      var size = sizeNow();
      var device = h('div', { class: 'pb-device pb-device--' + st.mode });
      if (st.mode === 'web') device.appendChild(h('div', { class: 'pb-bar', 'aria-hidden': 'true' }, '<i></i><i></i><i></i>'));
      clip = h('div', { class: 'pb-clip' });
      screen = h('div', { class: 'pb-screen', 'data-theme': st.theme, 'data-mode': st.mode });
      screen.style.width = size[0] + 'px';
      screen.style.height = size[1] + 'px';
      clip.appendChild(screen);
      device.appendChild(clip);
      stage.appendChild(device);
      // a desktop-only app on a phone is a picture: tapping it opens the real thing full screen
      var thumb = !!(st.narrow && st.mode === 'web' && !FULL && (cfg.webOnly || root.classList.contains('pb--b')));   // a real boolean: toggle(name, undefined) would flip the class on every draw
      root.classList.toggle('pb--thumb', thumb);
      if (thumb && root.classList.contains('pb--b')) device.addEventListener('click', openFull);
      else if (thumb && cfg.open) {
        var a = h('a', { class: 'pb-open', href: cfg.open(st.state), target: '_blank', rel: 'noopener' }, 'Open the prototype');
        stage.appendChild(a);
        device.addEventListener('click', function () { window.open(a.href, '_blank', 'noopener'); });
      }
      fit();
    }

    function fit() {
      if (!screen) return;
      var size = sizeNow();
      screen.style.width = size[0] + 'px';
      screen.style.height = size[1] + 'px';
      screen.classList.toggle('is-narrow', st.mode === 'web' && size[0] < 1300);
      var s = Math.min(1, room() / size[0]);
      if (st.mode === 'web') { if (!root.classList.contains('pb--b')) s = Math.min(s, heightScale(size[1], FULL ? 0 : 28)); }   // a phone's web screen: by width only, its area is as tall as the screen
      else s = Math.min(s, heightScale(size[1], FULL ? 0 : oneScreen() ? 12 : 20), oneScreen() ? 1 : 0.9);
      screen.style.transform = 'scale(' + s + ')';
      clip.style.width = Math.round(size[0] * s) + 'px';
      clip.style.height = Math.round(size[1] * s) + 'px';
      /* a phone's corners follow its scale (an iPhone screen is about 55 px round at full size): at 60 % fixed corners looked too round (her note, 17 Nov) */
      if (st.mode === 'mob' && oneScreen() && !FULL) { var r = Math.round(55 * s); clip.style.borderRadius = r + 'px'; clip.parentNode.style.borderRadius = (r + 6) + 'px'; }
    }

    // the app itself can change the theme (a setting inside the prototype): the switch follows, no redraw
    function setTheme(t) { st.theme = t; drawControls(); drawIcons(); if (screen) screen.setAttribute('data-theme', t); }

    function setNote(text) { if (noteEl) { noteEl.textContent = text || ''; noteEl.setAttribute('data-changed', ''); } drawPager(); }

    /* each draw is a new generation: timers left over from an earlier state (a typing demo, an auto
       step) can't change the note, the theme or the state any more */
    var gen = 0;
    function draw() {
      var my = ++gen;
      function live(fn) { return function () { if (my === gen) return fn.apply(null, arguments); }; }
      drawSteps(); drawPager(); relock();
      drawControls();
      // keep: the device stays and the app swaps its own content (see shared/pb-frame.js); else a new device
      var size = sizeNow();
      if (!(cfg.keep && screen && screen.isConnected && screen.getAttribute('data-mode') === st.mode &&
            screen.style.width === size[0] + 'px' && screen.style.height === size[1] + 'px')) drawDevice();
      else screen.setAttribute('data-theme', st.theme);   // a kept device: the Light / Dark switch still reaches it
      var open = stage.querySelector('.pb-open'); if (open && cfg.open) open.href = cfg.open(st.state);   // a kept device: its link follows the state
      cfg.render({ mode: st.mode, theme: st.theme, state: st.state, screen: screen, go: live(go), note: live(setNote), setTheme: live(setTheme) });
    }

    function index() { for (var i = 0; i < cfg.states.length; i++) if (cfg.states[i].id === st.state) return i; return 0; }
    function go(id) { st.state = id; draw(); report(); if (EMBED) parent.postMessage({ type: 'pb-state', index: index() }, '*'); }
    /* the app got to another state by itself (a click inside it): only the list follows, the screen stays as it is */
    function mark(id) {
      if (id === st.state || !cfg.states.some(function (s) { return s.id === id; })) return;
      st.state = id; drawSteps(); drawPager(); report();
      if (EMBED) parent.postMessage({ type: 'pb-state', index: index() }, '*');
    }

    /* a tall window (a tablet held upright): the story goes on top, in two columns, and the device gets the full width below (her call, 11 Nov) */
    function isTall(w) { return !!cfg.fill && w >= 860 && (VH || window.innerHeight) > w; }
    function bMode(narrow) { var on = narrow && !FULL; if (on !== root.classList.contains('pb--b')) { root.classList.toggle('pb--b', on); lockW = -1; }
      sizeArea(); }
    function layout() {
      var w = root.clientWidth;
      var narrow = w < 560, tall = isTall(w);
      bMode(narrow);
      root.classList.toggle('is-stacked', w < 860);
      if (tall !== root.classList.contains('is-tall')) { root.classList.toggle('is-tall', tall); draw(); return; }
      if (narrow !== st.narrow) {
        st.narrow = narrow;
        if (narrow && !cfg.webOnly && !FULL) st.mode = 'mob';   // a web-only app stays in the browser frame, as a small picture
        draw();
      } else fit();
      relock();
    }

    st.narrow = root.clientWidth < 560;
    if (st.narrow && !cfg.webOnly && !FULL) st.mode = 'mob';   // full screen keeps the mode it was opened in
    bMode(st.narrow);
    root.classList.toggle('is-stacked', root.clientWidth < 860);
    root.classList.toggle('is-tall', isTall(root.clientWidth));
    draw();
    if (window.ResizeObserver) new ResizeObserver(layout).observe(root);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lockW = -1; relock(); fit(); });   // the web font changes how the notes wrap
    window.addEventListener('resize', layout);   // the window height changes the scale too
    if (EMBED) {
      document.documentElement.classList.add('pb-embed');
      var hintEl = story.querySelector('.pb-hint');
      window.addEventListener('message', function (e) {
        var m = e.data; if (!m) return;
        if (m.type === 'pb-vh') {
          /* not pinned (a phone): the browser's address bar shows and hides while the page scrolls, and the
             window height with it. The device scale must not follow, or every prototype above changes height
             and the page jumps (her report, 17 Nov). Keep the smallest height for this width (the bar shown) */
          var nh = m.h, ww = window.innerWidth;
          if (!m.pin && VH && ww === VH_W && nh > VH) nh = VH;
          VH_W = ww;
          VH = nh; PINNED = !!m.pin; if (typeof m.top === 'number') TOPBAR = m.top; root.classList.toggle('is-free', EMBED && !PINNED); document.documentElement.style.setProperty('--pb-vh', VH + 'px'); layout(); report();
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
        if (m.type === 'pb-set-theme' && (m.theme === 'light' || m.theme === 'dark') && m.theme !== st.theme) { st.theme = m.theme; draw(); }
        if (m.type === 'pb-go' && cfg.states[m.index] && m.index !== index()) { window.PB_HINT = null; st.state = cfg.states[m.index].id; draw(); report(); }   // scrolling: the states as they are, no hint from an earlier jump
        if (m.type === 'pb-mode' && (m.mode === 'web' || m.mode === 'mob') && m.mode !== st.mode && !st.narrow && !cfg.webOnly) { st.mode = m.mode; draw(); report(); }   // opened from another prototype's menu
        if (m.type === 'pb-open-state') {   // opened from another prototype: this state, drawn again even if it is the current one (a different goal)
          window.PB_HINT = m.hint || null;
          var k = -1; cfg.states.forEach(function (x, j) { if (x.id === m.state) k = j; });
          if (k < 0) k = 0;
          st.state = cfg.states[k].id; draw(); report();
          parent.postMessage({ type: 'pb-state-index', index: k }, '*');
        }
      });
      if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
      parent.postMessage({ type: 'pb-ready', n: cfg.states.length, index: index(), labels: cfg.states.map(function (s) { return s.label; }) }, '*');
    }

    return { go: go, mark: mark };
  };
})();
