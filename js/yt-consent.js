/* YouTube erst nach Klick laden (Zwei-Klick-Lösung, DSGVO/TDDDG) */
(function () {
  document.querySelectorAll('.yt-consent').forEach(function (box) {
    var btn = box.querySelector('.yt-consent-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var id = box.getAttribute('data-yt');
      if (!/^[A-Za-z0-9_-]{6,20}$/.test(id || '')) return;
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?iv_load_policy=3&rel=0&autoplay=1';
      f.title = box.getAttribute('data-title') || 'YouTube-Video';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      f.setAttribute('allowfullscreen', '');
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      box.replaceWith(f);
    });
  });
})();
