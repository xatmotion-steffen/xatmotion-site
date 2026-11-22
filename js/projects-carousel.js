/* Projekte-Karussell: waagerecht scrollbar, endlos (Loop), Autoplay */
(function () {
  var track = document.getElementById('projectTrack');
  if (!track) return;
  var wrap = document.getElementById('projectCarousel');
  var originals = Array.prototype.slice.call(track.children);
  var n = originals.length;
  if (n < 2) return;

  function clone(el) {
    var c = el.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    c.querySelectorAll('a').forEach(function (a) { a.tabIndex = -1; });
    return c;
  }
  // Kopien vor und hinter den Originalen => nahtloser Loop
  originals.forEach(function (el) { track.appendChild(clone(el)); });
  originals.slice().reverse().forEach(function (el) { track.insertBefore(clone(el), track.firstChild); });

  function period() {
    return track.children[n].offsetLeft - track.children[0].offsetLeft;
  }
  function stepWidth() {
    return track.children[1].offsetLeft - track.children[0].offsetLeft;
  }
  function centerOnOriginals() {
    track.style.scrollSnapType = 'none';
    track.scrollLeft = period();
    track.style.scrollSnapType = '';
  }
  centerOnOriginals();
  window.addEventListener('resize', centerOnOriginals);
  window.addEventListener('load', centerOnOriginals);

  var ticking = false;
  track.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var p = period(), x = track.scrollLeft;
      if (x < p * 0.5 || x >= p * 1.5) {
        track.style.scrollSnapType = 'none';
        track.scrollLeft = x < p * 0.5 ? x + p : x - p;
        track.style.scrollSnapType = '';
      }
      ticking = false;
    });
  });

  function go(dir) {
    track.scrollBy({ left: dir * stepWidth(), behavior: 'smooth' });
  }
  wrap.querySelectorAll('.projects-arrow').forEach(function (btn) {
    btn.addEventListener('click', function () { go(parseInt(btn.getAttribute('data-dir'), 10)); });
  });

  // Autoplay: pausiert bei Hover/Fokus/Touch, außerhalb des Sichtfelds und bei "weniger Bewegung"
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var paused = false, visible = true, timer = null;
  function start() { stop(); timer = setInterval(function () { if (!paused && visible && !document.hidden) go(1); }, 4500); }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  ['mouseenter', 'focusin', 'touchstart'].forEach(function (ev) { wrap.addEventListener(ev, function () { paused = true; }, { passive: true }); });
  ['mouseleave', 'focusout', 'touchend'].forEach(function (ev) { wrap.addEventListener(ev, function () { paused = false; }, { passive: true }); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.2 }).observe(wrap);
  }
  start();
})();
