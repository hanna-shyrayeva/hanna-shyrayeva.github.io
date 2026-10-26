/* ==========================================================================
   Intro — the page title types itself in when a page opens, then the text
   under it fades up.
   The page's <head> adds html.intro-on before the first paint (not with
   prefers-reduced-motion, not when the address points into the page), so
   nothing flashes; [data-type] is the title, [data-reveal] what comes after it.
   ========================================================================== */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('intro-on')) return;

  function done() { root.classList.remove('intro-on', 'intro-run'); }

  function run() {
    var title = document.querySelector('[data-type]');
    var rest = [].slice.call(document.querySelectorAll('[data-reveal]'));
    if (!title) { done(); return; }

    // every letter in its own span: the title keeps its layout and line breaks while it types
    var chars = [], walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      Array.from(node.nodeValue).forEach(function (c) {
        var s = document.createElement('span');
        s.className = 'ch'; s.textContent = c;
        frag.appendChild(s); chars.push(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
    title.setAttribute('aria-label', title.textContent);   // read as one title, not letter by letter
    root.classList.add('intro-run');

    var step = Math.max(28, Math.min(70, 1100 / chars.length)), i = 0, last = null;
    (function next() {
      if (last) last.classList.remove('is-last');
      if (i < chars.length) {
        last = chars[i++]; last.classList.add('on', 'is-last');
        setTimeout(next, step);
        return;
      }
      // typed: the caret blinks a moment on the last letter, the rest comes up one after another
      last = chars[chars.length - 1]; last.classList.add('is-last');
      rest.forEach(function (el, k) { setTimeout(function () { el.classList.add('is-in'); }, 120 + k * 90); });
      setTimeout(function () {
        last.classList.remove('is-last');
        title.textContent = title.getAttribute('aria-label'); title.removeAttribute('aria-label');
        rest.forEach(function (el) { el.classList.remove('is-in'); });
        done();
      }, 1200 + rest.length * 90);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
