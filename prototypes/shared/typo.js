/* ==========================================================================
   Typo — line-end rules for the whole portfolio.

   1. No hanging short words: after a preposition, article or conjunction the
      space becomes non-breaking, so the short word moves to the next line with
      the word after it. Amounts ("4 099 696 kr") and short numbers with their
      word ("5 developers") never break either.
   2. No lonely word at the end: the last line never holds a single word.
   3. No lonely word at the start: the first word never stays alone on the first
      line while the rest of the sentence has moved to the second.

   2 and 3 use CSS first (text-wrap: pretty for text, balance for headings and
   short labels) and, for browsers without it, bind the first two and the last
   two words of every text block of four words or more. Short labels and buttons
   are left alone, so they never turn into one long unbreakable line.

   Typo.fix(root)    fixes the text under root once
   Typo.watch(root)  fixes it now and again whenever the content changes
                     (the prototypes redraw their screens all the time)
   ========================================================================== */
(function () {
  var NB = ' ';
  var SHORT = [
    // English
    'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'as', 'or', 'and', 'nor', 'but', 'if', 'so', 'is', 'it', 'its',
    'no', 'not', 'up', 'my', 'our', 'your', 'via', 'per', 'with', 'from', 'into', 'onto', 'than', 'that', 'this', 'I', 'we', 'be', 'do',
    // Swedish (the sign-in flow has a Swedish version)
    'i', 'på', 'av', 'en', 'ett', 'och', 'att', 'för', 'med', 'om', 'till', 'som', 'är', 'du', 'din', 'ditt', 'dina', 'vi', 'det', 'den'
  ];
  var WORDS = new RegExp('(^|[\\s\\u00A0(“"‘\'])(' + SHORT.join('|') + ') (?=\\S)', 'gi');
  var DIGITS = /(\d) (?=\d{3}(?!\d))/g;                            // 4 099 696
  var UNIT = /(\d) (?=(kr|SEK|EUR|%|€)(?![A-Za-z]))/g;             // 696 kr
  var COUNT = /(^|[\s (])(\d{1,3}) (?=[A-Za-zÅÄÖåäö])/g;     // 5 developers, 12 screens
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1, OPTION: 1 };
  var INLINE = { B: 1, STRONG: 1, I: 1, EM: 1, SPAN: 1, A: 1, SMALL: 1, SUP: 1, SUB: 1, MARK: 1, U: 1, S: 1, ABBR: 1, LABEL: 1 };
  var MIN_WORDS = 4, MAX_JOIN = 26;   // blocks shorter than 4 words are labels; never glue more than ~26 characters

  /* CSS does most of the work where the browser supports it */
  function addStyle() {
    if (document.getElementById('typo-css')) return;
    var css = document.createElement('style');
    css.id = 'typo-css';
    css.textContent = 'body{text-wrap:pretty}' +
      'h1,h2,h3,h4,h5,figcaption,button,.btn,.pb-title,.pb-step__t,.type-page-title,.type-section-title,.type-subheading,.type-body-strong,.type-value,.type-label,.badge{text-wrap:balance}';
    (document.head || document.documentElement).appendChild(css);
  }

  function fixString(s) {
    if (s.indexOf(' ') < 0) return s;
    var t = s.replace(WORDS, '$1$2' + NB).replace(WORDS, '$1$2' + NB);   // twice: "in a way" has two in a row
    return t.replace(DIGITS, '$1' + NB).replace(UNIT, '$1' + NB).replace(COUNT, '$1$2' + NB);
  }
  function skipped(n) {
    var p = n.parentNode;
    return !p || SKIP[p.nodeName] || p.isContentEditable;
  }
  function fixNode(n) {
    if (skipped(n)) return;
    var v = n.nodeValue, w = fixString(v);
    if (w !== v) n.nodeValue = w;
  }

  /* the text block a text node belongs to: its nearest ancestor that isn't laid out inline */
  function blockOf(n) {
    var el = n.parentNode;
    while (el && el.nodeType === 1 && INLINE[el.nodeName] && el.parentNode) {
      var d = window.getComputedStyle(el).display;
      if (d !== 'inline') break;
      el = el.parentNode;
    }
    return el && el.nodeType === 1 ? el : null;
  }

  /* glue the first two and the last two words of a block of 4+ words */
  var TYPED = '[data-field],.ai-input__field,.field__input,[contenteditable],[role=textbox]';   // text that is typed letter by letter
  function edges(block) {
    if (block.closest && block.closest(TYPED)) return;
    var nodes = [], walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null), n, text = '';
    while ((n = walker.nextNode())) {
      if (skipped(n) || blockOf(n) !== block) continue;        // text of nested blocks is handled with them
      nodes.push({ node: n, start: text.length });
      text += n.nodeValue;
    }
    var trimmed = text.replace(/^\s+|\s+$/g, '');
    if (!trimmed || trimmed.split(/[\s ]+/).length < MIN_WORDS) return;
    var lead = text.length - text.replace(/^\s+/, '').length, end = lead + trimmed.length;
    var tokens = [], re = /[^\s ]+/g, m;                   // words with their positions
    while ((m = re.exec(text))) tokens.push({ i: m.index, j: m.index + m[0].length });
    if (tokens.length < 2) return;
    function glue(pos, from, to) {                              // pos: index of the gap between two words
      if (text.charAt(pos) !== ' ' || to - from > MAX_JOIN) return;
      for (var k = nodes.length - 1; k >= 0; k--) {
        if (pos >= nodes[k].start && pos < nodes[k].start + nodes[k].node.nodeValue.length) {
          var nd = nodes[k].node, o = pos - nodes[k].start;
          nd.nodeValue = nd.nodeValue.slice(0, o) + NB + nd.nodeValue.slice(o + 1);
          text = text.slice(0, pos) + NB + text.slice(pos + 1);
          return;
        }
      }
    }
    // first word: from the end of word 1 to the end of the next breakable chunk
    var a = tokens[0], b = tokens[1];
    if (a.j < end) glue(a.j, a.i, b.j);
    // last word: the gap before the last word
    var y = tokens[tokens.length - 2], z = tokens[tokens.length - 1];
    if (z.i > lead) glue(z.i - 1, y.i, z.j);
  }

  function fix(root) {
    root = root || document.body;
    if (!root) return;
    var blocks = new Set();
    function take(n) { fixNode(n); if (!skipped(n) && /\S/.test(n.nodeValue)) { var b = blockOf(n); if (b) blocks.add(b); } }
    if (root.nodeType === 3) take(root);
    else { var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n; while ((n = walker.nextNode())) take(n); }
    blocks.forEach(edges);
  }
  function watch(root) {
    root = root || document.body;
    addStyle();
    fix(root);
    if (!window.MutationObserver) return;
    var busy = false;
    new MutationObserver(function (list) {
      if (busy) return;                                         // our own edits don't trigger another pass
      busy = true;
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === 'characterData') fix(m.target);
        else for (var k = 0; k < m.addedNodes.length; k++) fix(m.addedNodes[k]);
      }
      busy = false;
    }).observe(root, { childList: true, subtree: true, characterData: true });
  }
  window.Typo = { fix: fix, watch: watch, string: fixString };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { watch(document.body); });
  else watch(document.body);
})();
