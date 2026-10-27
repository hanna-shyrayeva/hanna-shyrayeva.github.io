/* ==========================================================================
   App shell — markup helpers shared by every prototype block:
   icons, number format, web sidebar, mobile status bar / tab bar, AI chat
   pieces and the confirm modal. All markup uses the design-system classes
   from ds/components; data comes from window.NJ (shared/data.js).
   ========================================================================== */
(function () {
  var D = window.NJ;

  function icon(name, cls) {
    var i = (window.ICONS || {})[name];
    if (!i) return '';
    return '<svg viewBox="' + i.vb + '" fill="none" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + i.inner + '</svg>';
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function kr(x) { return (x < 0 ? '−' : '') + Math.round(Math.abs(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' kr'; }
  function pct(x, d) { return Math.abs(x).toFixed(d == null ? 2 : d) + '%'; }

  /* ---------- web ---------- */
  var NAV = [
    ['home', 'Home', 'home'], ['overview', 'Overview', 'overview'], ['assets', 'Assets', 'accounts'],
    ['banks', 'Banks', 'banks'], ['spread', 'Risk and spread', 'shield'],
    ['goals', 'Goals', 'goals'], ['monitors', 'Monitors', 'monitors'], ['profile', 'My profile', 'user']
  ];
  // menu items that have a prototype of their own: on the case page they open it, on their own they load it
  var PROTO = { home: 'home', overview: 'overview', spread: 'risk-spread', goals: 'goals', monitors: 'monitors' };
  var sideCollapsed = false;   // the burger folds the menu to its icons; kept while the screen redraws

  /* this year's value: a random walk that drifts up (performance this year is positive), lightly smoothed and drawn as a curve */
  function spark() {
    var n = 52, seed = 11, v = 0, raw = [];
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < n; i++) { v += 0.5 + (rnd() - 0.5) * 2.6 + (i > 30 && i < 36 ? -1.1 : 0); raw.push(v); }   // a small dip late in the year
    var pts = raw.map(function (x, i) { var a = raw[Math.max(0, i - 1)], b = raw[Math.min(n - 1, i + 1)]; return (a + 2 * x + b) / 4; });
    var w = 240, h = 64, lo = Math.min.apply(0, pts), hi = Math.max.apply(0, pts);
    var xy = pts.map(function (y, i) { return [i / (n - 1) * (w - 8) + 2, 6 + (1 - (y - lo) / (hi - lo)) * (h - 14)]; });
    var d = 'M' + xy[0][0].toFixed(1) + ' ' + xy[0][1].toFixed(1);
    for (var k = 0; k < n - 1; k++) {   // Catmull-Rom through the points, as cubic curves
      var p0 = xy[Math.max(0, k - 1)], p1 = xy[k], p2 = xy[k + 1], p3 = xy[Math.min(n - 1, k + 2)];
      d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    var end = xy[n - 1];
    return '<svg class="web-perf__spark" viewBox="0 0 240 64" aria-hidden="true"><defs><linearGradient id="web-perf-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".28"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="web-perf__area" d="' + d + ' L' + end[0].toFixed(1) + ' 64 L2 64 Z"/><path class="web-perf__line" d="' + d + '"/></svg>';
  }

  function webSide(active) {
    var t = D.totals;
    if (active === 'risk' || active === 'diversification') active = 'spread';   // the old two pages now live in one
    return '<aside class="web-side' + (sideCollapsed ? ' is-collapsed' : '') + '">' +
      '<button type="button" class="web-side__burger" data-side aria-label="' + (sideCollapsed ? 'Expand the menu' : 'Collapse the menu') + '" aria-expanded="' + !sideCollapsed + '">' + icon('menu') + '</button>' +
      '<div class="web-perf">' +
        '<div class="web-perf__group"><div class="web-perf__item"><span class="web-perf__label">Total assets</span><span class="web-perf__big">' + kr(t.totalAssets) + '</span></div>' + spark() + '</div>' +
        '<div class="web-perf__group">' +
          '<div class="web-perf__item"><span class="web-perf__label">Net worth</span><span class="web-perf__value">' + kr(t.netWorth) + '</span></div>' +
          '<div class="web-perf__item"><span class="web-perf__label">This year</span><span class="web-perf__row"><span class="web-perf__value">' + kr(t.ytdSek) + '</span><span class="web-perf__up">▲ ' + pct(t.ytdPct) + '</span></span></div>' +
        '</div>' +
      '</div>' +
      sideMenu(active) +
    '</aside>';
  }
  // the menu itself: the sections, then Njorda AI and Add assets (the web side menu, and the phone's More menu)
  function sideMenu(active) {
    return '<nav class="web-nav">' + NAV.map(function (n) {
        var go = PROTO[n[0]] && n[0] !== active;
        return '<button type="button" class="web-nav__item web-nav__item--' + n[0] + (n[0] === active ? ' is-active' : '') + '" title="' + n[1] + '"' +
          (go ? ' data-proto="' + PROTO[n[0]] + '"' : ' aria-disabled="true" tabindex="-1"') + '>' + icon(n[2]) + '<span class="web-nav__label">' + n[1] + '</span></button>';
      }).join('') + '</nav>' +
      '<div class="web-side__actions">' +
        '<button type="button" class="btn btn--ai-menu" data-act="ai" title="Njorda AI">' + icon('ai-triangle', 'btn__icon') + '<span class="btn__label">Njorda AI</span></button>' +
        '<button type="button" class="btn btn--menu" data-act="add" data-proto="assets" title="Add assets">' + icon('plus', 'btn__icon') + '<span class="btn__label">Add assets</span></button>' +
      '</div>';
  }

  document.addEventListener('click', function (e) {
    var p = e.target.closest && e.target.closest('[data-proto]');
    if (!p || location.pathname.slice(-(p.getAttribute('data-proto').length + 6)) === p.getAttribute('data-proto') + '.html') return;   // this page: its own handler (Add assets inside the assets flow)
    e.preventDefault(); e.stopPropagation();   // first, before the page's own handlers on the same button
    var mode = document.querySelector('.pb-device--mob') ? 'mob' : 'web';   // the next prototype opens on the same device
    var stateId = p.getAttribute('data-proto-state'), goal = p.getAttribute('data-proto-goal');   // e.g. a goal card: Goals, its details
    if (window.parent !== window) parent.postMessage({ type: 'pb-open', proto: p.getAttribute('data-proto'), mode: mode, state: stateId, goal: goal }, '*');
    else location.href = p.getAttribute('data-proto') + '.html#mode=' + mode + (stateId ? '&state=' + stateId : '') + (goal ? '&goal=' + encodeURIComponent(goal) : '');
  }, true);

  // a card that works as a link (Overview's goals and monitors) opens with Enter too
  document.addEventListener('keydown', function (e) { var c = e.key === 'Enter' && e.target.closest && e.target.closest('[data-proto][role=link]'); if (c) c.click(); });

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-side]');
    if (!b) return;
    sideCollapsed = !sideCollapsed;
    document.querySelectorAll('.web-side').forEach(function (x) { x.classList.toggle('is-collapsed', sideCollapsed); });
    document.querySelectorAll('[data-side]').forEach(function (x) { x.setAttribute('aria-expanded', String(!sideCollapsed)); x.setAttribute('aria-label', sideCollapsed ? 'Expand the menu' : 'Collapse the menu'); });
  });

  /* a phone's row of cards scrolls sideways with a finger; with a mouse it is dragged. While dragging the
     row follows the mouse exactly (no snapping); let go, it glides to the nearest card, or to the next
     one in the direction of a clear drag, and only then snaps again, so nothing jumps. A drag is not a
     click, so a card that was dragged doesn't also open. The screen is scaled, so the mouse's move is
     scaled back to the row's own pixels */
  document.addEventListener('pointerdown', function (e) {
    var row = e.pointerType === 'mouse' && e.button === 0 && e.target.closest && e.target.closest('.stat-scroller');
    if (!row || row.scrollWidth <= row.clientWidth) return;
    var x0 = e.clientX, l0 = row.scrollLeft, k = row.getBoundingClientRect().width / row.offsetWidth || 1, dx = 0;
    e.preventDefault();   // no text selection while dragging
    clearTimeout(row.__settle);
    row.classList.add('is-dragging');
    function move(ev) { dx = (ev.clientX - x0) / k; row.scrollLeft = l0 - dx; }
    function up() {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      var max = row.scrollWidth - row.clientWidth, first = row.children[0].offsetLeft;
      var stops = [].map.call(row.children, function (c) { return Math.min(max, c.offsetLeft - first); });
      var at = row.scrollLeft, i = 0;
      stops.forEach(function (s, j) { if (Math.abs(s - at) < Math.abs(stops[i] - at)) i = j; });
      if (Math.abs(dx) > 40) {   // a clear drag moves at least one card that way
        if (dx < 0 && stops[i] <= l0) i = Math.min(stops.length - 1, i + 1);
        if (dx > 0 && stops[i] >= l0) i = Math.max(0, i - 1);
      }
      row.scrollTo({ left: stops[i], behavior: 'smooth' });
      row.__settle = setTimeout(function () { row.classList.remove('is-dragging'); }, 450);   // snap back on once it has arrived
      if (Math.abs(dx) > 3) document.addEventListener('click', function stop(ev) { ev.stopPropagation(); ev.preventDefault(); document.removeEventListener('click', stop, true); }, true);
    }
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  });

  /* performance charts: points [x, y] → a curve through them; long periods (many points) are lightly averaged first, short ones keep every move */
  function curve(xy) {
    var n = xy.length, avg = n > 100;
    var sm = !avg ? xy : xy.map(function (q, i) { return i === 0 || i === n - 1 ? q : [q[0], (xy[i - 1][1] + 2 * q[1] + xy[i + 1][1]) / 4]; });
    var d = 'M' + sm[0][0].toFixed(1) + ' ' + sm[0][1].toFixed(1);
    for (var k = 0; k < n - 1; k++) {
      var p0 = sm[Math.max(0, k - 1)], p1 = sm[k], p2 = sm[k + 1], p3 = sm[Math.min(n - 1, k + 2)];
      d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return { d: d, xy: sm };
  }
  function walk(o) {
    var seed = o.seed || 1, n = o.n, sig = 0.009 * Math.sqrt(o.step), L = [0];
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    function gauss() { return Math.sqrt(-2 * Math.log(rnd() || 1e-6)) * Math.cos(2 * Math.PI * rnd()); }
    function shut(x) { return (o.closed || []).some(function (c) { return x > c[0] && x <= c[1]; }); }   // market closed (a weekend): the line stays flat
    var open = [0];
    for (var i = 1; i < n; i++) {
      var x = i / (n - 1), r = shut(x) ? 0 : sig * gauss();
      (o.dips || []).forEach(function (d) { if (x > d[0] && x <= d[1]) r += d[2] / ((d[1] - d[0]) * (n - 1)); });
      L.push(L[i - 1] + r); open.push(open[i - 1] + (shut(x) ? 0 : 1));
    }
    var bend = Math.log(o.end / o.start) - L[n - 1];
    return L.map(function (l, i) { return o.start * Math.exp(l + bend * open[i] / open[n - 1]); });
  }
  var chartFill = '<defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".26"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>';

  /* ---------- mobile ---------- */
  function statusbar() {
    return '<div class="statusbar"><span class="statusbar__time">9:41</span><span class="statusbar__icons" aria-hidden="true">' +
      '<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>' +
      '<svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 1.6c2.7 0 5.2 1 7.1 2.8a.6.6 0 0 1 0 .9l-.6.6a.6.6 0 0 1-.8 0A8 8 0 0 0 8.5 3.7 8 8 0 0 0 2.8 5.9a.6.6 0 0 1-.8 0l-.6-.6a.6.6 0 0 1 0-.9A10.2 10.2 0 0 1 8.5 1.6Zm0 3.6c1.7 0 3.3.6 4.5 1.8a.6.6 0 0 1 0 .9l-.7.6a.6.6 0 0 1-.8 0 4.4 4.4 0 0 0-6 0 .6.6 0 0 1-.8 0l-.7-.6a.6.6 0 0 1 0-.9A6.5 6.5 0 0 1 8.5 5.2Zm0 3.5c.8 0 1.6.3 2.1.9a.6.6 0 0 1 0 .8l-1.7 1.7a.6.6 0 0 1-.9 0L6.4 10.4a.6.6 0 0 1 0-.8 3 3 0 0 1 2.1-.9Z"/></svg>' +
      '<svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0.5" y="0.5" width="23" height="12" rx="3.6" stroke="currentColor" opacity="0.35"/><rect x="2" y="2" width="18" height="9" rx="2.2" fill="currentColor"/><path d="M25.2 4.3c.8.3.8 4.1 0 4.4V4.3Z" fill="currentColor" opacity="0.4"/></svg>' +
      '</span></div>';
  }

  var TABS = [['home', 'Home', 'home'], ['overview', 'Overview', 'overview'], ['assets', 'Assets', 'accounts'], ['more', 'More', 'more']];
  /* active = null → the "button" composition: action + home indicator, no tab bar (form screens) */
  function tabbar(active, actionHtml) {
    var pill = active == null ? '' : '<div class="tabbar__pill" role="tablist">' + TABS.map(function (t) {
      return '<button class="tabbar__tab' + (t[0] === active ? ' tabbar__tab--active' : '') + '" type="button" role="tab">' + icon(t[2]) + '<span>' + t[1] + '</span></button>';
    }).join('') + '</div>';
    return '<div class="tabbar">' + (actionHtml || '') + pill + '<div class="tabbar__home" aria-hidden="true"></div></div>';
  }

  /* ---------- AI chat ---------- */
  function aiTurn(html) {
    return '<div class="chat-ai"><span class="chat-ai__avatar">' + icon('ai-chat') + '</span><div class="chat-ai__block type-body-lg">' + html + '</div></div>';
  }
  function userTurn(text) {
    return '<div class="chat-user"><div class="chat-user__bubble type-body-lg">' + esc(text) + '</div></div>';
  }
  function thinking(text) {
    return '<div class="njorda-loader"><span class="njorda-icon-drift"></span><span class="text-shimmer-bloom">' + esc(text || 'Thinking…') + '</span></div>';
  }
  function chatDock(placeholder) {
    return '<div class="chat-dock">' +
      '<div class="ai-input ai-input--alt"><div class="ai-input__field" data-field data-ph="' + esc(placeholder) + '" style="color:var(--color-fg-secondary)">' + esc(placeholder) + '</div>' +
      '<div class="ai-input__row"><button type="button" class="ai-input__send" data-send aria-label="Send">' + icon('arrow-up') + '</button></div></div>' +
      '<p class="chat-disclaimer type-caption tone-secondary">Njorda AI can make mistakes. Check important info.</p></div>';
  }

  /* type a prompt into the dock, then resolve (used by scripted flows) */
  function typeInto(root, text, done) {
    var f = root.querySelector('[data-field]'), b = root.querySelector('[data-send]'), i = 0;
    f.style.color = 'var(--color-fg-primary)';
    f.textContent = '';
    var t = setInterval(function () {
      f.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(t); b.classList.add('is-active'); if (done) done(); }
    }, 28);
    return function () { clearInterval(t); };
  }
  function clearDock(root) {
    var f = root.querySelector('[data-field]'), b = root.querySelector('[data-send]');
    f.textContent = f.getAttribute('data-ph'); f.style.color = 'var(--color-fg-secondary)'; b.classList.remove('is-active');
  }

  /* ---------- confirm modal (destructive actions only) ---------- */
  function confirmModal(screen, title, body, actionLabel, onYes) {
    var wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><div class="modal__head"><h3 class="modal__title type-section-title">' + esc(title) + '</h3>' +
      '<button type="button" class="modal__close" aria-label="Close">' + icon('close') + '</button></div>' +
      '<p class="modal__body type-body-lg tone-secondary">' + esc(body) + '</p>' +
      '<div class="modal__actions"><button type="button" class="btn btn--h40 btn--neutral-2" data-no>Cancel</button><button type="button" class="btn btn--h40 btn--negative" data-yes>' + esc(actionLabel) + '</button></div></div>';
    function close() { wrap.remove(); }
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    wrap.querySelector('.modal__close').onclick = close;
    wrap.querySelector('[data-no]').onclick = close;
    wrap.querySelector('[data-yes]').onclick = function () { close(); onYes(); };
    screen.appendChild(wrap);
  }

  /* short "Saved" pill above the bottom dock */
  function confirmPill(screen, text, bottom) {
    var host = document.createElement('div');
    host.className = 'confirm-host';
    if (bottom != null) host.style.bottom = bottom + 'px';
    host.innerHTML = '<div class="confirm">' + icon('checkmark') + esc(text) + '</div>';
    screen.appendChild(host);
    setTimeout(function () { host.remove(); }, 2500);
  }

  window.App = { D: D, icon: icon, esc: esc, kr: kr, pct: pct, webSide: webSide, curve: curve, walk: walk, chartFill: chartFill, statusbar: statusbar, tabbar: tabbar,
    aiTurn: aiTurn, userTurn: userTurn, thinking: thinking, chatDock: chatDock, typeInto: typeInto, clearDock: clearDock,
    confirmModal: confirmModal, confirmPill: confirmPill, sideMenu: sideMenu };
})();
