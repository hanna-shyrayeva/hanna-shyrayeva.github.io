/* ==========================================================================
   System keyboard on the phone, for the Njorda app case prototypes (her ask, 16 Nov).
   Ported from the work prototype (njorda-app-prototype/app/proto.js), iOS look only.
   A tap on a text field in Mobile mode brings up the keyboard inside the phone: the screen
   shrinks to the space above it, the action button rides on top of it, the field scrolls into
   view. Keys type into the field; return / Done, or a tap outside, closes it. Numeric fields
   get the number pad. Web mode and read-only fields (pickers) are left alone.
   ========================================================================== */
(function () {
  var KB_H = 336;   // keyboard + suggestion bar + home area, as on an iPhone
  var kb = null, screen = null, field = null, shift = false;

  function isText(el) {
    if (!el || el.readOnly || el.disabled) return false;
    if (el.tagName === 'TEXTAREA') return true;
    return el.tagName === 'INPUT' && /^(text|email|password|search|tel|number|url|)$/.test(el.type || '');
  }
  function phoneOf(el) { var s = el && el.closest && el.closest('.pb-screen'); return s && s.getAttribute('data-mode') === 'mob' ? s : null; }
  function numeric(el) { return /^(decimal|numeric)$/.test(el.getAttribute('inputmode') || '') || el.type === 'number' || el.type === 'tel'; }
  function key(label, cls, act) { return '<button type="button" tabindex="-1" class="kb__key' + (cls ? ' ' + cls : '') + '" data-k="' + (act || label) + '">' + label + '</button>'; }
  function letters() {
    var email = field && field.type === 'email';
    var rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map(function (r) { return r.split('').map(function (c) { var l = shift ? c.toUpperCase() : c; return key(l, '', l); }).join(''); });
    var ret = field && field.type === 'search' ? 'search' : 'return';
    return '<div class="kb__row">' + rows[0] + '</div><div class="kb__row kb__row--mid">' + rows[1] + '</div>' +
      '<div class="kb__row">' + key('⇧', 'kb__key--fn' + (shift ? ' is-on' : ''), 'shift') + rows[2] + key('⌫', 'kb__key--fn', 'back') + '</div>' +
      '<div class="kb__row">' + key('123', 'kb__key--fn kb__key--wide', 'noop') + (email ? key('@', 'kb__key--fn', '@') : '') +
      key('space', 'kb__key--space', ' ') + (email ? key('.', 'kb__key--fn', '.') : '') + key(ret, 'kb__key--fn kb__key--wide kb__key--ret', 'done') + '</div>';
  }
  function numbers() {
    var k = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(function (n) { return key(n, 'kb__key--num', n); }).join('');
    return '<div class="kb__pad">' + k + key(',', 'kb__key--num kb__key--fn', ',') + key('0', 'kb__key--num', '0') + key('⌫', 'kb__key--num kb__key--fn', 'back') + '</div>' +
      '<div class="kb__row">' + key('Done', 'kb__key--fn kb__key--ret kb__key--done', 'done') + '</div>';
  }
  function draw() { kb.innerHTML = '<div class="kb__bar"></div>' + (numeric(field) ? numbers() : letters()) + '<div class="kb__home"></div>'; }

  function open(el, s) {
    if (screen && screen !== s) close();
    field = el; screen = s; shift = false;
    // the app redraws its screen on a state change: the keyboard lives in the screen, so it comes back with it
    kb = s.querySelector(':scope > .kb');
    if (!kb) {
      kb = document.createElement('div'); kb.className = 'kb'; kb.setAttribute('aria-hidden', 'true'); s.appendChild(kb);
      kb.addEventListener('mousedown', function (e) { e.preventDefault(); });   // keep the focus in the field
      kb.addEventListener('click', press);
    }
    s.style.setProperty('--kb-h', KB_H + 'px');
    draw();
    void kb.offsetHeight;   // a keyboard just made starts below the screen, so it slides in too
    s.setAttribute('data-keyboard', '');
    reveal();
    setTimeout(reveal, 340);   // once the screen has shrunk, a last nudge if the scroll couldn't reach yet
  }
  /* the field glides to the middle of the space left above the keyboard. Only the phone's own scroll
     moves: scrollIntoView would scroll the case page too, and on the case page a scroll steps the prototype */
  function reveal() {
    if (!field || !field.isConnected || !screen) return;
    var ph = field.closest('.phone'); if (!ph) return;
    var scale = screen.getBoundingClientRect().height / screen.offsetHeight || 1;
    var f = field.getBoundingClientRect(), p = ph.getBoundingClientRect();
    var mid = ((f.top + f.bottom) / 2 - p.top) / scale, want = (screen.offsetHeight - KB_H) / 2;   // where the screen ends up, not where it is mid-slide
    if (Math.abs(mid - want) > 2) ph.scrollTo({ top: ph.scrollTop + mid - want, behavior: 'smooth' });
  }
  function close() { if (screen) screen.removeAttribute('data-keyboard'); field = null; screen = null; }

  function press(e) {
    var b = e.target.closest('[data-k]'); if (!b || !field) return;
    var k = b.getAttribute('data-k'), v = field.value;
    var s = field.selectionStart != null ? field.selectionStart : v.length, en = field.selectionEnd != null ? field.selectionEnd : v.length;
    if (k === 'noop') return;
    if (k === 'shift') { shift = !shift; draw(); return; }
    if (k === 'done') { field.blur(); close(); return; }
    if (k === 'back') { if (s === en && s > 0) s--; field.value = v.slice(0, s) + v.slice(en); try { field.setSelectionRange(s, s); } catch (x) {} }
    else { field.value = v.slice(0, s) + k + v.slice(en); try { field.setSelectionRange(s + k.length, s + k.length); } catch (x) {} if (shift) { shift = false; draw(); } }
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* on a real phone its own keyboard comes up: the drawn one is for a computer only */
  var realPhone = window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  if (realPhone) return;
  document.addEventListener('focusin', function (e) { var s = phoneOf(e.target); if (s && isText(e.target)) open(e.target, s); else if (screen) close(); });
  document.addEventListener('focusout', function () { setTimeout(function () { var a = document.activeElement; if (!(isText(a) && phoneOf(a))) close(); }, 0); });
  // Web / Mobile, Light / Dark or another state: the field is gone, so is the keyboard
  new MutationObserver(function () { if (field && !field.isConnected) close(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
