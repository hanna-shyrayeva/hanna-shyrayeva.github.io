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
