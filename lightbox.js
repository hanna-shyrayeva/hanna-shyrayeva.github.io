/* ==========================================================================
   Lightbox for the case pages: every picture in a figure.fig opens larger.

   - Click (or Enter) on a picture: it opens over the page, as wide as fits.
   - Click on it again, the +/− button or the + and − keys: zoom in or out;
     a zoomed picture is moved with the scrollbars, the wheel or by dragging.
   - A picture can open a series instead of itself: data-full="a.png|b.png|c.png"
     with data-full-alt="…|…|…" (e.g. each screen of a two-window picture, whole).
     Arrows on screen and on the keyboard move through the series.
   - Esc, the × button or a click beside the picture closes it.

   Slides: a figure.fig--slides holds several pictures (only the first shown, the
   rest with the hidden attribute) and gets a row of small previews under it to
   switch between them. Each picture's data-caption becomes the caption. Opened
   larger, the series is every screen of every slide, from the one clicked.
   ========================================================================== */
(function () {
  /* slides first, so the lightbox below sees the pictures with their previews in place */
  [].forEach.call(document.querySelectorAll('figure.fig--slides'), function (fig) {
    var slides = [].slice.call(fig.querySelectorAll('.fig__slides > img'));
    var cap = fig.querySelector('figcaption');
    var row = document.createElement('div');
    row.className = 'fig__thumbs'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Pictures');
    function go(i) {
      slides.forEach(function (s, k) { s.hidden = k !== i; });
      [].forEach.call(row.children, function (b, k) { b.setAttribute('aria-current', String(k === i)); });
      if (cap && slides[i].getAttribute('data-caption')) cap.textContent = slides[i].getAttribute('data-caption');
    }
    slides.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'fig__thumb';
      b.setAttribute('aria-label', 'Show picture ' + (i + 1) + ' of ' + slides.length + (s.getAttribute('data-thumb-label') ? ': ' + s.getAttribute('data-thumb-label') : ''));
      b.innerHTML = '<img src="' + s.getAttribute('src') + '" alt="">';
      b.addEventListener('click', function () { go(i); });
      row.appendChild(b);
    });
    fig.insertBefore(row, cap);
    go(0);
  });

  var figs = [].slice.call(document.querySelectorAll('figure.fig img')).filter(function (el) { return !el.closest('.fig__thumbs'); });
  if (!figs.length) return;

  var css = document.createElement('style');
  css.textContent = [
    'figure.fig { position: relative; }',
    'figure.fig img { cursor: zoom-in; }',
    /* a small magnifier on the picture: on hover, or always where there is no hover */
    '.lb-hint { position: absolute; top: 14px; right: 14px; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: rgba(27, 29, 28, .72); color: #fff; opacity: 0; transition: opacity .2s; pointer-events: none; }',
    '.lb-hint svg { width: 18px; height: 18px; }',
    'figure.fig:hover .lb-hint, figure.fig img:focus-visible ~ .lb-hint { opacity: 1; }',
    '@media (hover: none) { .lb-hint { opacity: 1; } }',
    'figure.fig img:focus-visible { outline: 2px solid var(--accent, #2b8040); outline-offset: 4px; }',
    /* the previews under a figure with several slides; a hidden slide stays hidden (.fig img sets display) */
    '.fig__slides > img[hidden] { display: none; }',
    '.fig__thumbs { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }',
    '.fig__thumb { width: 132px; padding: 3px; border: 2px solid transparent; border-radius: 12px; background: none; cursor: pointer; opacity: .6; transition: opacity .15s, border-color .15s; }',
    '.fig__thumb:hover { opacity: 1; }',
    '.fig__thumb[aria-current="true"] { opacity: 1; border-color: var(--accent, #2b8040); }',
    '.fig__thumb:focus-visible { outline: 2px solid var(--accent, #2b8040); outline-offset: 2px; }',
    'figure.fig .fig__thumb img { display: block; width: 100%; height: auto; border-radius: 8px; cursor: pointer; }',
    '@media (max-width: 600px) { .fig__thumb { width: 96px; } }',
    '.lb { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; background: rgba(12, 14, 13, .94); color: #fff; font: 500 14px/1.4 "Funnel Sans", system-ui, sans-serif; }',
    '.lb[hidden] { display: none; }',
    '.lb__bar { flex: none; display: flex; align-items: center; gap: 8px; padding: 12px 16px; }',
    '.lb__count { margin-right: auto; color: #b9bfbb; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.lb__btn { width: 40px; height: 40px; border: 0; border-radius: 10px; background: rgba(255, 255, 255, .08); color: #fff; display: grid; place-items: center; cursor: pointer; }',
    '.lb__btn:hover { background: rgba(255, 255, 255, .16); }',
    '.lb__btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }',
    '.lb__btn[disabled] { opacity: .3; cursor: default; }',
    '.lb__btn svg { width: 20px; height: 20px; }',
    '.lb__view { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; display: grid; padding: 0 16px 24px; cursor: zoom-in; }',
    '.lb__view.is-zoomed { cursor: grab; }',
    '.lb__view.is-dragging { cursor: grabbing; user-select: none; }',
    '.lb__img { display: block; margin: auto; max-width: none; height: auto; border-radius: 8px; background: #fff; }',
    '.lb__nav { position: absolute; top: 50%; transform: translateY(-50%); }',
    '.lb__nav--prev { left: 16px; } .lb__nav--next { right: 16px; }',
    '.lb__nav[hidden] { display: none; }',
    '@media (max-width: 600px) { .lb__view { padding: 0 8px 16px; } .lb__nav { top: auto; bottom: 16px; transform: none; } }'
  ].join('\n');
  document.head.appendChild(css);

  var ICON = {
    zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8.5 11h5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'
  };

  var box = document.createElement('div');
  box.className = 'lb'; box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Picture, larger');
  box.innerHTML = '<div class="lb__bar"><span class="lb__count" aria-live="polite"></span>' +
    '<button type="button" class="lb__btn lb__zoom" aria-label="Zoom in">' + ICON.zoom + '</button>' +
    '<button type="button" class="lb__btn lb__close" aria-label="Close">' + ICON.close + '</button></div>' +
    '<div class="lb__view"><img class="lb__img" alt=""></div>' +
    '<button type="button" class="lb__btn lb__nav lb__nav--prev" aria-label="Previous picture">' + ICON.prev + '</button>' +
    '<button type="button" class="lb__btn lb__nav lb__nav--next" aria-label="Next picture">' + ICON.next + '</button>';
  document.body.appendChild(box);
  var view = box.querySelector('.lb__view'), img = box.querySelector('.lb__img'), count = box.querySelector('.lb__count');
  var zoomBtn = box.querySelector('.lb__zoom'), prevBtn = box.querySelector('.lb__nav--prev'), nextBtn = box.querySelector('.lb__nav--next');

  var list = [], at = 0, zoomed = false, opener = null, lastOverflow = '';

  /* fit: as wide as the window allows (never larger than the picture itself); zoom: the picture's
     own size, or twice the fit when that is hardly bigger */
  function size(keep) {
    if (!img.naturalWidth) return;
    var room = view.clientWidth - (window.innerWidth <= 600 ? 16 : 32);
    var fit = Math.min(img.naturalWidth, room);
    var big = Math.max(img.naturalWidth, fit * 1.8);
    var w = zoomed ? big : fit;
    var cx = keep ? keep.x : 0.5, cy = keep ? keep.y : 0;
    img.style.width = Math.round(w) + 'px';
    view.classList.toggle('is-zoomed', zoomed);
    zoomBtn.innerHTML = zoomed ? ICON.out : ICON.zoom;
    zoomBtn.setAttribute('aria-label', zoomed ? 'Zoom out' : 'Zoom in');
    if (keep) {   // keep the point that was clicked under the pointer
      view.scrollLeft = img.offsetLeft + cx * img.offsetWidth - keep.px;
      view.scrollTop = img.offsetTop + cy * img.offsetHeight - keep.py;
    }
  }

  function show(i) {
    at = (i + list.length) % list.length; zoomed = false;
    var it = list[at];
    img.style.width = '';
    img.onload = function () { size(); view.scrollTop = 0; view.scrollLeft = 0; };
    img.src = it.src; img.alt = it.alt;
    count.textContent = (list.length > 1 ? (at + 1) + ' / ' + list.length + '   ' : '') + (it.label || '');
    prevBtn.hidden = nextBtn.hidden = list.length < 2;
  }

  function screensOf(el) {
    var full = el.getAttribute('data-full'), alts = (el.getAttribute('data-full-alt') || '').split('|');
    return full ? full.split('|').map(function (s, k) { return { src: s, alt: alts[k] || el.alt, label: alts[k] || '' }; })
                : [{ src: el.currentSrc || el.src, alt: el.alt, label: '' }];
  }
  function open(el) {
    /* a picture among slides opens the screens of all the slides, from its own */
    var all = el.closest('.fig--slides') ? [].slice.call(el.closest('.fig--slides').querySelectorAll('.fig__slides > img')) : [el];
    var start = 0;
    list = [];
    all.forEach(function (s) { if (s === el) start = list.length; list = list.concat(screensOf(s)); });
    opener = el;
    lastOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    box.hidden = false;
    show(start);
    box.querySelector('.lb__close').focus();
  }
  function close() {
    box.hidden = true; img.removeAttribute('src');
    document.documentElement.style.overflow = lastOverflow;
    if (opener) opener.focus();
  }
  function toggleZoom(e) {
    var r = img.getBoundingClientRect(), v = view.getBoundingClientRect();
    var keep = e && e.clientX != null && r.width
      ? { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, px: e.clientX - v.left, py: e.clientY - v.top }
      : { x: 0.5, y: (view.scrollTop + view.clientHeight / 2 - img.offsetTop) / img.offsetHeight, px: view.clientWidth / 2, py: view.clientHeight / 2 };
    zoomed = !zoomed; size(keep);
  }

  figs.forEach(function (el) {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Open larger: ' + (el.alt || 'picture'));
    var hint = document.createElement('span');
    hint.className = 'lb-hint'; hint.setAttribute('aria-hidden', 'true'); hint.innerHTML = ICON.zoom;
    if (!el.parentNode.querySelector('.lb-hint')) el.parentNode.insertBefore(hint, el.nextSibling);
    el.addEventListener('click', function () { open(el); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el); } });
  });

  /* a click on the picture zooms; a click beside it closes; a drag on a zoomed picture moves it */
  var drag = null, moved = false;
  view.addEventListener('pointerdown', function (e) {
    moved = false;
    if (!zoomed || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, l: view.scrollLeft, t: view.scrollTop };
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; view.classList.add('is-dragging'); }
    view.scrollLeft = drag.l - dx; view.scrollTop = drag.t - dy;
  });
  window.addEventListener('pointerup', function () { drag = null; view.classList.remove('is-dragging'); });
  view.addEventListener('click', function (e) {
    if (moved) return;
    if (e.target === img) toggleZoom(e); else close();
  });
  /* the page under it never scrolls (the case pages step through prototypes on the wheel) */
  box.addEventListener('wheel', function (e) { e.stopPropagation(); });

  zoomBtn.addEventListener('click', function () { toggleZoom(); });
  box.querySelector('.lb__close').addEventListener('click', close);
  prevBtn.addEventListener('click', function () { show(at - 1); });
  nextBtn.addEventListener('click', function () { show(at + 1); });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    else if (e.key === 'ArrowRight' && list.length > 1) show(at + 1);
    else if (e.key === 'ArrowLeft' && list.length > 1) show(at - 1);
    else if ((e.key === '+' || e.key === '=') && !zoomed) toggleZoom();
    else if (e.key === '-' && zoomed) toggleZoom();
    else if (e.key === 'Tab') {   // keep the focus inside
      var f = [].slice.call(box.querySelectorAll('button:not([hidden])'));
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.addEventListener('resize', function () { if (!box.hidden) size(); });
})();
