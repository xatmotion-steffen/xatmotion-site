/* Weihnachtspause-Hinweis: zeigt alle [data-pause]-Elemente 14 Tage vor bis zum Ende der Pause.
   Jedes Jahr nur die Werte in PAUSE anpassen. Test: ?pause=1 */
(function () {
  var PAUSE = { von: '2026-12-11', bis: '2027-01-03', vorlauf: 14 };

  function d(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var start = d(PAUSE.von), end = d(PAUSE.bis);
  var show = today >= new Date(start.getTime() - PAUSE.vorlauf * 86400000) && today <= end;
  try { if (new URLSearchParams(location.search).get('pause') === '1') show = true; } catch (e) {}

  var active = today >= start && today <= end;
  document.querySelectorAll('[data-pause]').forEach(function (el) {
    el.hidden = !show;
    if (show) el.classList.toggle('is-active', active);
  });
})();
