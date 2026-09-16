/* Homepage interactions: carousel + Popular Searches toggle */
(function () {
  'use strict';

  /* ---------- Carousel (arrow-only, no auto-advance) ---------- */
  var carousel = document.getElementById('carousel');
  if (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll('.slide'));
    var index = 0;

    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        s.classList.toggle('is-active', n === index);
      });
    }

    var nextBtn = carousel.querySelector('.carousel-arrow.next');
    var prevBtn = carousel.querySelector('.carousel-arrow.prev');
    if (nextBtn) nextBtn.addEventListener('click', function () { show(index + 1); });
    if (prevBtn) prevBtn.addEventListener('click', function () { show(index - 1); });
  }

  /* ---------- Popular Searches dropdown ---------- */
  var pop = document.getElementById('fsaPop');
  var bar = document.getElementById('fsaPopBar');
  if (pop && bar) {
    function toggle() {
      var collapsed = pop.classList.toggle('collapsed');
      bar.setAttribute('aria-expanded', String(!collapsed));
    }
    bar.addEventListener('click', toggle);
    bar.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  }
})();
