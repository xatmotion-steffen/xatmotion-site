/* Hero-Saison per Datum. Test: ?saison=sommer | winter | weihnachten | heiligabend | silvester
   1.3.-31.10. Sommer | Nov, 3.1.-Feb Winter | 1.-23.12. Weihnachten (Advent)
   24.-26.12. Heiligabend | 27.-30.12. Weihnachten (Feiertage) | 31.12.-2.1. Silvester */
(function () {
  var hero = document.querySelector('#site-header .hero-bg');
  var video = hero && hero.querySelector('video');
  if (!video) return;

  var V = 'assets/videos/', P = 'assets/images/';
  var sets = {
    sommer:      { v: V + 'hero-background-web.mp4',  p: P + 'hero-background-poster.jpg',  cls: 'is-summer' },
    winter:      { v: V + 'hero-winter-web.mp4',      p: P + 'hero-winter-poster.jpg',      cls: 'is-winter', bright: true },
    weihnachten: { v: V + 'hero-weihnachten-web.mp4', p: P + 'hero-weihnachten-poster.jpg', cls: 'is-xmas' },
    heiligabend: { v: V + 'hero-heiligabend-web.mp4', p: P + 'hero-heiligabend-poster.jpg', cls: 'is-xmas-eve', bright: true },
    silvester:   { v: V + 'hero-silvester-web.mp4',   p: P + 'hero-silvester-poster.jpg',   cls: 'is-nye' }
  };

  var now = new Date();
  var m = now.getMonth() + 1, d = now.getDate(), y = now.getFullYear();
  var season, greeting = '';

  if (m === 12) {
    if (d <= 23)      { season = 'weihnachten'; greeting = 'Eine schöne Adventszeit!'; }
    else if (d <= 26) { season = 'heiligabend'; greeting = 'Frohe Weihnachten!'; }
    else if (d <= 30) { season = 'weihnachten'; greeting = 'Schöne Feiertage!'; }
    else              { season = 'silvester';   greeting = 'Guten Rutsch!'; }
  } else if (m === 1 && d <= 2) {
    season = 'silvester'; greeting = 'Ein gesundes neues Jahr ' + y + '!';
  } else if (m === 11 || m === 1 || m === 2) {
    season = 'winter';
  } else {
    season = 'sommer';
  }

  try {
    var q = new URLSearchParams(window.location.search).get('saison');
    if (q && sets[q]) {
      season = q;
      greeting = {
        weihnachten: 'Eine schöne Adventszeit!',
        heiligabend: 'Frohe Weihnachten!',
        silvester: 'Guten Rutsch!'
      }[q] || '';
    }
  } catch (e) {}

  var s = sets[season];
  hero.classList.add(s.cls);
  if (s.bright) hero.classList.add('is-bright');

  /* Das Skript steht im Header, der Gruss-Absatz kommt erst weiter unten im Dokument. */
  function showGreeting() {
    var g = document.getElementById('heroGreeting');
    if (g && greeting) { g.textContent = greeting; g.hidden = false; }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showGreeting);
  } else {
    showGreeting();
  }

  video.setAttribute('poster', s.p);
  video.setAttribute('src', s.v);
  var p = video.play && video.play();
  if (p && p.catch) p.catch(function () {});
})();
