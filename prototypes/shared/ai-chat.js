/* ==========================================================================
   AI chat — one panel for the whole app: the chat's name with new chat and
   history beside it, the thread, the dock, and the chats history with search,
   pin and delete. On the web it is the side panel, on a phone full screen.
   A chat that gets a question is kept in the history. Every new chat looks the
   same (the greeting and three quick actions), except when a goal or a
   monitor is being created.

   App.chatSide(ctx)  any page: Njorda AI in the side menu opens the panel beside it (web), or in the
                      More menu opens the chat full screen (phone)
   App.moreMenu(ctx, onAI, active)  phone: the More tab opens the menu, dark and full screen: the
                      web side menu without its chart; for pages that run their own chat (Home, Goals, Monitors)
   App.chatAnswer(q, beside) → { parts, title, page }   the answers, from the shared data;
                      beside: the page the answer is about is on screen next to the chat

   var chat = App.chat({
     web, screen: function () { return ctx.screen; }, draw, later,
     answer(q) → { parts: [html…], title, page, wait, delay, before() },   // title: the chat's name; before(): what the answer changes on the page
     empty() → html | null,             // optional: a new chat before the first message (null: the greeting and quick actions)
     onNew(),                           // optional: the plus started a new chat
     pages: { goals: 'Goals' },         // phone: "Show on Goals" under an answer
     onAsk(q),                          // optional: what the page does with a question before chat.ask(q)
     onShow(page), onClose()
   });
   chat.html()        the panel's content         chat.bind(root)   after every draw
   chat.ask(q)        a question, then the answer  chat.greet(html)  a new chat where the assistant speaks first
   chat.type(q)       types q in the field, then asks (the scripted examples)
   chat.reset()       a new, empty chat            chat.stop()       stops the typing (the chat closed)
   chat.s             { tab: 'chat' | 'chats', thread, hist, histTab, q }
   ========================================================================== */
(function () {
  var A = window.App, I = A.icon, esc = A.esc;
  // not in the icon set: history (past chats); a new chat is the set's plus
  var SVG = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var CLOCK = SVG('<path d="M4 12a8 8 0 1 0 2.34-5.66"/><path d="M2.8 7.2h3.8V3.4"/><path d="M12 8v4.5l3 2"/>');
  var DISCLAIMER = '<p class="chat-disclaimer type-caption tone-secondary">Njorda AI can make mistakes. Check important info.</p>';
  var HISTORY = [
    { t: 'Portfolio concentration monitor', when: '2h ago', pin: false, a: 'Your largest holding is Länsförsäkringar Global Indexnära at 33.0% of your investments. The monitor warns you above 35%.' },
    { t: 'Rebalancing, is now a good time?', when: '4h ago', pin: true, a: 'Your funds and stocks are close to the mix you chose, so there is no strong reason to rebalance this month.' },
    { t: 'ETF fees explained', when: 'Yesterday, 19:52', pin: false, a: 'An ETF charges a yearly fee taken from its value. iShares Core MSCI World UCITS ETF costs about 0.20% a year.' },
    { t: 'Pension plan, update contributions', when: '28 Jan', pin: true, a: 'Raising your monthly saving by 1 000 kr adds roughly 69 000 kr over 5 years in a normal market.' },
    { t: 'Monitor: dividend yield', when: '26 Jan', pin: false, a: 'Investor AB pays its dividend in May. I can tell you when it arrives in your ISK.' },
    { t: 'Investment taxes in Sweden', when: '23 Jan', pin: false, a: 'An ISK and a Kapitalförsäkring are taxed on a yearly standard amount, not on each sale.' },
    { t: 'Set a goal: Country escape', when: '31 Dec 2025', pin: false, a: 'Your Summer house goal is at 27%. Adding about 6 700 kr a month gets you there by 31 Dec 2031.' }
  ];

  function composer(id, placeholder) {
    return '<div class="ai-input' + (id === 'dock' ? ' ai-input--alt' : '') + '"><textarea class="ai-input__field" rows="2" data-field="' + id + '" placeholder="' + esc(placeholder) + '"></textarea>' +
      '<div class="ai-input__row"><button type="button" class="ai-input__send" data-send="' + id + '" aria-label="Send">' + I('arrow-up') + '</button></div></div>';
  }

  /* ---------- answers: built from the shared data, so every figure matches the other screens ---------- */
  var D = A.D, T = D.totals, kr = A.kr;
  var invest = D.accounts.reduce(function (a, acc) { return a.concat(acc.holdings); }, []).filter(function (h) { return ['Fund', 'Stock', 'ETF'].indexOf(h.t) > -1; });
  var TECH = invest.filter(function (h) { return h.sector === 'Technology'; });
  var techShare = D.sectors.filter(function (x) { return x.name === 'Technology'; })[0].share;
  var GAINS = invest.slice().sort(function (a, b) { return (b.value - b.value / (1 + b.ytd / 100)) - (a.value - a.value / (1 + a.ytd / 100)); }).slice(0, 2);
  // what the assistant drafts from a quick action: it waits on Monitors or Goals, outlined, to save or change
  var DRAFT = {
    monitor: { n: 'Dividends', rule: 'Notify me when a dividend is paid into any of my accounts.' },
    goal: { n: 'New car', target: 120000, date: '1 Jun 2028', monthly: 3900 }
  };
  // quick actions send a ready-made question (adopted from the live app)
  var QUICK = [['chart', 'Forecast', 'What can my portfolio be worth in 5 years?'], ['monitors', 'Set a monitor', 'Help me set up a monitor for my portfolio'], ['goals', 'Set a goal', 'Help me set a goal for my portfolio']];
  function fig(label, value, tone) { return '<div class="ac-fig"><span class="type-caption tone-secondary">' + label + '</span><span class="type-subheading' + (tone ? ' ' + tone : '') + '">' + value + '</span></div>'; }
  function topic(q) { return /monitor/i.test(q) ? 'monitors' : /goal/i.test(q) ? 'goals' : 'overview'; }   // the page an answer belongs next to
  function answer(q, beside) {
    var f = D.forecast, page = topic(q);
    if (/5 years|forecast/i.test(q)) return { page: page, title: 'Portfolio in 5 years', parts: [
      '<p>If you keep your current investments and add nothing new, in 5 years they could be worth:</p>',
      '<div class="ac-figs">' + fig('Weak market, ' + f.lowR + '% a year', kr(f.low)) + fig('Normal market, ' + f.expR + '% a year', kr(f.expected)) + fig('Strong market, ' + f.highR + '% a year', kr(f.high)) + '</div>',
      '<p>Adding 2 000 kr a month would raise the normal case by about ' + kr(Math.round(2000 * ((Math.pow(1 + 0.055 / 12, 60) - 1) / (0.055 / 12)) / 1000) * 1000) + '.</p>',
      '<p class="ac-note type-body">This is an AI-generated estimate based on past returns, not financial advice. Markets can go down as well as up.</p>'
    ] };
    if (/technology|tech/i.test(q)) return { page: page, title: 'Technology holdings', parts: [
      '<p>Three of your holdings are in technology. Together they are ' + techShare.toFixed(1) + '% of your investments:</p>',
      '<ul>' + TECH.map(function (h) { return '<li>' + esc(h.n) + ', ' + kr(h.value) + '</li>'; }).join('') + '</ul>',
      '<p>' + (beside ? 'I’ve highlighted them on the page. ' : '') + 'That share is fine for a long-term portfolio. If you want, I can tell you when it goes above 30%.</p>'
    ] };
    if (page === 'monitors') return { page: page, title: 'Monitor: ' + DRAFT.monitor.n, parts: [
      '<p>Here’s a monitor to start with. It watches all your accounts:</p>',
      '<p><b>' + DRAFT.monitor.n + ':</b> ' + DRAFT.monitor.rule + '</p>',
      beside ? '<p>It’s on Monitors now. Save it there, or tell me what to change, like which accounts it watches.</p>'
        : '<p>It’s waiting on Monitors as a draft. Save it there, or tell me what to change, like which accounts it watches.</p>'
    ] };
    if (page === 'goals') return { page: page, title: 'Goal: ' + DRAFT.goal.n, parts: [
      '<p>Let’s start with one, based on what you save today:</p>',
      '<div class="ac-figs">' + fig('Target', kr(DRAFT.goal.target)) + fig('By', DRAFT.goal.date) + fig('Each month', kr(DRAFT.goal.monthly)) + '</div>',
      '<p>“' + DRAFT.goal.n + '” is on Goals ' + (beside ? 'now' : 'as a draft') + '. Change the name, amount or date here, or save it on the page.</p>'
    ] };
    var spotify = invest.filter(function (h) { return h.n === 'Spotify Technology'; })[0];
    return { page: page, title: 'This year so far', parts: [
      '<p>Your investments are up ' + kr(T.ytdSek) + ' since 1 January.</p>',
      '<div class="ac-figs">' + fig('Investments', kr(T.investments)) + fig('This year', '+' + T.ytdPct.toFixed(2) + '%', 'tone-positive') + fig('Last week', '+' + T.weekPct.toFixed(2) + '%', 'tone-positive') + '</div>',
      '<h3 class="chat-ai__heading" style="font-size:20px;line-height:28px">What moved it</h3>',
      '<ul>' + GAINS.map(function (h) { return '<li>' + esc(h.n) + ', up ' + h.ytd.toFixed(1) + '% this year</li>'; }).join('') +
        '<li>Spotify Technology is the only holding down this year, ' + spotify.ytd.toFixed(1) + '%</li></ul>',
      '<p>Your global funds carry most of the gain, so the result is broad rather than driven by one stock.' + (beside ? ' I’ve highlighted the three on Overview.' : '') + '</p>'
    ] };
  }
  function quick() {
    return '<div class="quick-actions quick-actions--row">' + QUICK.map(function (q, i) { return '<button type="button" class="quick-action" data-quick="' + i + '">' + I(q[0]) + q[1] + '</button>'; }).join('') + '</div>';
  }
  // a new chat, the same everywhere: who the assistant is and three ideas to start from
  function greeting() {
    return '<div class="ac-empty"><span class="ac-empty__icon">' + I('ai-chat') + '</span><p class="type-section-title">Good morning, ' + esc(D.customer.first) + '</p>' +
      '<p class="type-body tone-secondary">I’m your personal Njorda Assistant.<br>Ask me an investment question or pick an idea below.</p>' + quick() + '</div>';
  }

  // the tag on a card the assistant drafted, until it is saved
  A.aiTag = function () { return '<span class="ac-tag">' + I('ai-triangle') + 'Suggested</span>'; };

  A.composer = composer;
  A.chatAnswer = answer;
  A.chatTopic = topic;
  A.chatQuick = { list: QUICK, html: quick };
  A.chatDraft = DRAFT;
  A.chat = function (o) {
    var s = { tab: 'chat', thread: [], hist: HISTORY.map(function (h) { return Object.assign({}, h); }), histTab: 'all', q: '', entry: null };
    var run = 0, typing = null, pend = 0;   // run: the current chat; pend: a typed question still to send
    var pill = function (text) { A.confirmPill(o.screen(), text, o.web ? 40 : 110); };

    function threadHtml() {
      if (!s.thread.length) return (o.empty && o.empty()) || greeting();
      return s.thread.map(function (m, i) {
        if (m.me) return A.userTurn(m.text);
        if (m.wait) return '<div>' + A.thinking(m.wait) + '</div>';
        var acts = m.done && !m.greet ? '<div class="ac-acts"><button type="button" data-act="copy" aria-label="Copy">' + I('copy') + '</button>' +
          '<button type="button" data-act="up" data-i="' + i + '" aria-label="Good answer" aria-pressed="' + (m.vote === 'up') + '">' + I('thumbs-up') + '</button>' +
          '<button type="button" data-act="down" data-i="' + i + '" aria-label="Bad answer" aria-pressed="' + (m.vote === 'down') + '">' + I('thumbs-down') + '</button></div>' : '';
        var link = m.page && m.done && !o.web && o.pages && o.pages[m.page] ? '<button type="button" class="btn btn--h40 btn--secondary btn--auto" data-act="show" data-page="' + m.page + '">Show on ' + o.pages[m.page] + '</button>' : '';
        return '<div class="chat-ai"><span class="chat-ai__avatar">' + I('ai-chat') + '</span><div class="chat-ai__block type-body-lg">' +
          m.parts.slice(0, m.shown).map(function (p, k) { return '<div' + (m.fresh && k === m.shown - 1 ? ' class="ac-reveal"' : '') + '>' + p + '</div>'; }).join('') + link + acts + '</div></div>';
      }).join('');
    }
    function historyHtml() {
      var q = s.q.toLowerCase(), list = s.hist.filter(function (h) { return (s.histTab === 'all' || h.pin) && h.t.toLowerCase().indexOf(q) > -1; });
      return '<div class="ac-history"><div class="field field--search"><span class="field__search-icon">' + I('search') + '</span><input class="field__input" type="search" placeholder="Search chats" value="' + esc(s.q) + '" data-search></div>' +
        '<div class="ac-htabs"><button type="button" class="tab' + (s.histTab === 'all' ? ' tab--active' : '') + '" data-htab="all">All</button><button type="button" class="tab' + (s.histTab === 'pin' ? ' tab--active' : '') + '" data-htab="pin">Pinned</button></div>' +
        (list.length ? '<div>' + list.map(function (h) {
          var i = s.hist.indexOf(h);
          return '<div class="ac-hist-row"><button type="button" class="ac-hist-row__open" data-openchat="' + i + '"><span class="type-body-strong">' + esc(h.t) + '</span><span class="type-caption tone-secondary">' + esc(h.when) + '</span></button>' +
            '<button type="button" class="ac-hist-row__btn" data-pin="' + i + '" aria-pressed="' + h.pin + '" aria-label="' + (h.pin ? 'Unpin' : 'Pin') + '">' + I(h.pin ? 'pin-1' : 'pin-2') + '</button>' +
            '<button type="button" class="ac-hist-row__btn" data-del="' + i + '" aria-label="Delete">' + I('delete') + '</button></div>';
        }).join('') + '</div>' : '<div class="empty-state" style="margin:48px auto 0;text-align:center"><p class="type-section-title">' + (s.histTab === 'pin' ? 'No pinned chats yet' : 'No chats found') + '</p><p class="type-body-lg tone-secondary">' + (s.histTab === 'pin' ? 'Pin a chat to keep it at the top.' : 'Try another word.') + '</p></div>') + '</div>';
    }
    // header: the chat's name, then new chat, history and close; the history has a way back instead
    function head() {
      var close = '<button type="button" class="ac-icon" data-chat-close aria-label="Close" title="Close">' + I('close') + '</button>';
      if (s.tab === 'chats') return '<div class="ac-head"><button type="button" class="ac-icon" data-chat-back aria-label="Back to the chat" title="Back">' + I('back') + '</button><p class="ac-head__title type-body-strong">Chats</p>' + close + '</div>';
      return '<div class="ac-head"><p class="ac-head__title type-body-strong">' + esc(s.entry ? s.entry.t : 'Njorda AI') + '</p>' +
        '<button type="button" class="ac-icon" data-chat-new aria-label="New chat" title="New chat"' + (s.thread.length ? '' : ' disabled') + '>' + I('plus') + '</button>' +
        '<button type="button" class="ac-icon" data-chat-hist aria-label="Chats" title="Chats">' + CLOCK + '</button>' + close + '</div>';
    }
    function html() {
      return head() +
        (s.tab === 'chats' ? historyHtml() + DISCLAIMER
          : '<div class="chat-thread" data-thread>' + threadHtml() + '</div><div class="chat-dock">' + composer('dock', 'Write a message…') + DISCLAIMER + '</div>');
    }
    // the whole panel: the side panel on the web, full screen on a phone
    function panel(open) {
      return o.web ? '<aside class="web-panel" aria-label="Njorda AI">' + html() + '</aside>' : open ? '<div class="ac-mob">' + A.statusbar() + html() + '</div>' : '';
    }

    function bind(root) {
      function on(sel, fn) { root.querySelectorAll(sel).forEach(function (b) { b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); fn(b); }; }); }
      on('[data-send]', function (b) { var f = root.querySelector('[data-field="' + b.getAttribute('data-send') + '"]'); if (f && f.value.trim()) send(f.value.trim()); else if (f) f.focus(); });
      root.querySelectorAll('[data-field]').forEach(function (f) {
        var send = root.querySelector('[data-send="' + f.getAttribute('data-field') + '"]');
        f.oninput = function () { send.classList.toggle('is-active', !!f.value.trim()); };
        f.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (f.value.trim()) send(f.value.trim()); } };
      });
      on('[data-chat-new]', function () { reset(); if (o.onNew) o.onNew(); o.draw(); });   // a new chat always starts empty
      on('[data-chat-hist]', function () { s.tab = 'chats'; o.draw(); });
      on('[data-chat-back]', function () { s.tab = 'chat'; o.draw(); });
      on('[data-chat-close]', function () { stop(); o.onClose(); });
      on('[data-quick]', function (b) { send(QUICK[+b.getAttribute('data-quick')][2]); });
      on('[data-act="copy"]', function () { pill('Copied'); });
      on('[data-act="up"], [data-act="down"]', function (b) { var m = s.thread[+b.getAttribute('data-i')], v = b.getAttribute('data-act'); m.vote = m.vote === v ? null : v; o.draw(); if (m.vote) pill('Thanks for the feedback'); });
      on('[data-act="show"]', function (b) { o.onShow(b.getAttribute('data-page')); });
      on('[data-htab]', function (b) { s.histTab = b.getAttribute('data-htab'); o.draw(); });
      on('[data-pin]', function (b) { var h = s.hist[+b.getAttribute('data-pin')]; h.pin = !h.pin; o.draw(); });
      on('[data-del]', function (b) {
        var i = +b.getAttribute('data-del');
        A.confirmModal(root, 'Delete chat?', '“' + s.hist[i].t + '” will be deleted for good.', 'Delete', function () { if (s.hist[i] === s.entry) reset(); s.hist.splice(i, 1); o.draw(); pill('Chat deleted'); });
      });
      on('[data-openchat]', function (b) {
        var h = s.hist[+b.getAttribute('data-openchat')];
        reset(); s.entry = h;
        s.thread = h.thread || [{ me: true, text: h.t }, { parts: ['<p>' + esc(h.a) + '</p>'], shown: 1, done: true }];
        h.thread = s.thread; o.draw();
      });
      var search = root.querySelector('[data-search]');
      if (search) search.oninput = function () { s.q = search.value; var pos = search.selectionStart; o.draw(); var n = o.screen().querySelector('[data-search]'); n.focus(); n.setSelectionRange(pos, pos); };
      var th = root.querySelector('[data-thread]'); if (th) th.scrollTop = th.scrollHeight;
    }

    function send(q) { (o.onAsk || ask)(q); }   // the page may open itself beside the chat first
    function reset() { run++; stop(); s.thread = []; s.entry = null; s.tab = 'chat'; }
    function stop() { pend++; if (typing) { clearInterval(typing); typing = null; } }
    function greet(htmlText) { reset(); s.thread.push({ parts: [htmlText], shown: 1, done: true, greet: true }); }
    function ask(q) {
      stop();
      s.tab = 'chat';
      var r = o.answer(q), m = { wait: r.wait || 'Thinking…' }, my = run;
      if (!s.entry) { s.entry = { t: r.title || q, when: 'Just now', pin: false }; s.hist.unshift(s.entry); }   // a chat with a question is kept, under its topic
      s.entry.thread = s.thread;
      s.thread.push({ me: true, text: q }, m);
      o.draw();
      o.later(function () {
        if (my !== run) return;
        delete m.wait; m.parts = r.parts; m.shown = 0; m.page = r.page;
        if (r.before) r.before();
        (function next() {
          if (my !== run) return;
          m.shown++; if (m.shown >= r.parts.length) m.done = true;
          m.fresh = true; o.draw(); m.fresh = false;   // only the newest part fades in
          if (!m.done) o.later(next, 420);
        })();
      }, r.delay || 1100);
    }
    // the scripted examples: the question is typed into the field, then sent
    function type(q) {
      stop();
      var f = o.screen().querySelector('[data-field]'), i = 0;
      if (!f) return;
      typing = setInterval(function () {
        if (!f.isConnected) return stop();
        f.value = q.slice(0, ++i);
        if (i >= q.length) {
          stop();
          var b = o.screen().querySelector('[data-send="' + f.getAttribute('data-field') + '"]'); if (b) b.classList.add('is-active');
          var p = pend; o.later(function () { if (p === pend) send(q); }, 400);
        }
      }, 28);
    }

    return { s: s, html: html, panel: panel, bind: bind, ask: ask, greet: greet, type: type, reset: reset, stop: stop };
  };

  /* the page redraws itself by replacing the screen's content: after each redraw, fn puts back what
     this file added (own: the classes of the nodes it adds itself, so their own changes are ignored) */
  function afterDraws(screen, key, own, fn) {
    if (screen[key]) screen[key].disconnect();
    screen[key] = new MutationObserver(function (list) {
      var mine = list.every(function (m) { return [].slice.call(m.addedNodes).concat([].slice.call(m.removedNodes)).every(function (n) { return n.classList && own.some(function (c) { return n.classList.contains(c); }); }); });
      if (!mine) fn();
    });
    screen[key].observe(screen, { childList: true });
  }

  /* phone: the More tab opens the menu, dark and full screen over the page: the web side menu without
     its chart (as on the web, the sections show where things live and don't lead anywhere) */
  A.moreMenu = function (ctx, onAI, active) {
    if (ctx.mode === 'web') return;
    var screen = ctx.screen, open = false;
    function menuHtml() {
      return A.statusbar() + '<div class="ac-more__body"><button type="button" class="ac-more__close" data-more-close aria-label="Close the menu">' + I('close') + '</button>' +
        A.sideMenu(typeof active === 'function' ? active() : active) + '</div><div class="ac-more__home" aria-hidden="true"></div>';
    }
    function paint() {
      var tabs = screen.querySelectorAll('.tabbar__tab'), more = tabs[tabs.length - 1];
      if (!more) return;   // no tab bar here (a form, a first-run step)
      var menu = screen.querySelector(':scope > .ac-more');
      if (open && !menu) { menu = document.createElement('div'); menu.className = 'ac-more'; menu.innerHTML = menuHtml(); screen.appendChild(menu); }
      if (!open && menu) menu.remove();
      more.onclick = function (e) { e.preventDefault(); e.stopPropagation(); open = true; paint(); };
      if (!menu) return;
      menu.querySelector('[data-more-close]').onclick = function (e) { e.preventDefault(); e.stopPropagation(); open = false; paint(); };
      menu.querySelector('[data-act="ai"]').onclick = function (e) { e.preventDefault(); e.stopPropagation(); open = false; paint(); onAI(); };
    }
    afterDraws(screen, '__moreMenu', ['ac-more', 'ac-mob'], paint);
    paint();
  };

  /* any page with the side menu: Njorda AI opens the same panel beside the page. The page draws as
     before; after each draw the panel is put back into it, so the page needs no other changes.
     On a phone the chat opens full screen from the More menu */
  A.chatSide = function (ctx, active) {   // active: the page, lit in the phone's menu
    if (ctx.mode !== 'web') return chatPhone(ctx, active);
    var screen = ctx.screen, open = false, timers = [];
    var chat = A.chat({
      web: true, screen: function () { return screen; }, draw: paint,
      later: function (fn, ms) { timers.push(setTimeout(fn, ms)); },
      answer: function (q) { return answer(q, false); },
      onShow: function () {}, onClose: function () { open = false; paint(); resized(); }
    });
    // charts that measure themselves redraw: the page got narrower or wider (after the 0.25s slide, or at once when the page just redrew)
    function resized(ms) { setTimeout(function () { screen.dispatchEvent(new Event('chat-panel')); }, ms == null ? 300 : ms); }
    function paint(instant) {   // instant: the page just redrew, so the panel is already there, no slide
      var box = screen.querySelector('.web');
      if (!box) return;   // a screen without the side menu (a first-run step, signed out)
      var aside = box.querySelector(':scope > .web-panel');
      if (!aside) { aside = document.createElement('aside'); aside.className = 'web-panel'; aside.setAttribute('aria-label', 'Njorda AI'); box.appendChild(aside); }
      aside.innerHTML = chat.html();
      if (instant) box.classList.add('ac-instant');
      box.classList.toggle('has-panel', open);
      screen.classList.toggle('ac-open', open);   // on the screen too, so the page's next draw is already narrow and measures its charts right
      if (instant) { void box.offsetWidth; box.classList.remove('ac-instant'); }
      chat.bind(aside);
      var btn = box.querySelector('[data-act="ai"]');
      if (btn) btn.onclick = function (e) { e.preventDefault(); e.stopPropagation(); open = !open; if (!open) chat.stop(); paint(); resized(); };
    }
    if (screen.__chatSide) screen.__chatSide.disconnect();
    screen.__chatSide = new MutationObserver(function () {   // the page redrew itself, measuring its charts without the panel
      if (screen.querySelector('.web > .web-panel')) return;
      paint(true); if (open) resized(0);
    });
    screen.__chatSide.observe(screen, { childList: true });
    paint();
  };
  function chatPhone(ctx, active) {
    var screen = ctx.screen, open = false, timers = [];
    var chat = A.chat({
      web: false, screen: function () { return screen; }, draw: paint,
      later: function (fn, ms) { timers.push(setTimeout(fn, ms)); },
      answer: function (q) { return answer(q, false); },
      onShow: function () {}, onClose: function () { open = false; paint(); }
    });
    function paint() {
      var mob = screen.querySelector(':scope > .ac-mob');
      if (open) {
        if (!mob) { mob = document.createElement('div'); mob.className = 'ac-mob'; screen.appendChild(mob); }
        mob.innerHTML = A.statusbar() + chat.html();
        chat.bind(mob);
      } else if (mob) mob.remove();
    }
    afterDraws(screen, '__chatPhone', ['ac-more', 'ac-mob'], paint);
    A.moreMenu(ctx, function () { open = true; chat.s.tab = 'chat'; paint(); }, active);
  }
})();
