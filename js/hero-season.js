/* Hero-Saison: Nov-Feb Winter, sonst Sommer. Test: ?saison=winter | ?saison=sommer */
(function () {
  var hero = document.querySelector('#site-header .hero-bg');
  var video = hero && hero.querySelector('video');
  if (!video) return;

  var season = null;
  try {
    var q = new URLSearchParams(window.location.search).get('saison');
    if (q === 'winter' || q === 'sommer') season = q;
  } catch (e) {}
  if (!season) {
    var m = new Date().getMonth() + 1; // 1-12
    season = (m >= 11 || m <= 2) ? 'winter' : 'sommer';
  }

  var src = {
    winter: ['assets/videos/hero-winter-web.mp4', 'assets/images/hero-winter-poster.jpg'],
    sommer: ['assets/videos/hero-background-web.mp4', 'assets/images/hero-background-poster.jpg']
  }[season];

  hero.classList.add('is-' + (season === 'winter' ? 'winter' : 'summer'));
  video.setAttribute('poster', src[1]);
  video.setAttribute('src', src[0]);
  var p = video.play && video.play();
  if (p && p.catch) p.catch(function () {});
})();
