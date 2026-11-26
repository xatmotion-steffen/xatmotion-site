document.addEventListener('DOMContentLoaded', function () {
  var navbar = document.getElementById('mainNavbar');
  var header = document.getElementById('site-header');
  var scrollTopBtn = document.getElementById('scrollTopBtn');
  var navToggle = document.getElementById('navToggle');
  var navbarNav = document.getElementById('navbarNav');

  function heroHeight() {
    return header ? header.offsetHeight - navbar.offsetHeight : 0;
  }

  function onScroll() {
    if (window.scrollY > heroHeight()) {
      navbar.classList.add('is-fixed');
    } else {
      navbar.classList.remove('is-fixed');
    }

    if (window.scrollY > 400) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', onScroll);
  onScroll();

  scrollTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      navbarNav.classList.toggle('open');
    });
  }

  // Dropdown toggle on mobile tap
  document.querySelectorAll('.navbar-nav > li.has-dropdown > a').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (window.innerWidth <= 991) {
        var parent = link.parentElement;
        // Allow anchor-only links (#...) to still navigate/scroll after toggling
        if (link.getAttribute('href').indexOf('#') === 0) {
          e.preventDefault();
        }
        parent.classList.toggle('open');
      }
    });
  });

  // Close mobile menu after clicking a normal link
  document.querySelectorAll('.navbar-nav a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 991 && link.parentElement.parentElement === navbarNav) {
        navbarNav.classList.remove('open');
      }
    });
  });

  // FAQ-Akkordeon (wiederverwendbar auf allen Unterseiten)
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        openItem.classList.remove('open');
      });
      if (!wasOpen) {
        item.classList.add('open');
      }
    });
  });

  // Bild-Slider mit Pfeilen (z.B. "Perspektiven"-Bereich)
  document.querySelectorAll('[data-slider]').forEach(function (slider) {
    var img = slider.querySelector('[data-slider-img]');
    var prev = slider.querySelector('.slider-arrow.prev');
    var next = slider.querySelector('.slider-arrow.next');
    if (!img) return;
    var sources = (img.getAttribute('data-slider-images') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!sources.length) return;
    var current = 0;
    function show(index) {
      current = (index + sources.length) % sources.length;
      img.setAttribute('src', sources[current]);
    }
    if (next) next.addEventListener('click', function () { show(current + 1); });
    if (prev) prev.addEventListener('click', function () { show(current - 1); });
  });

  // Kontaktformular: Versand per AJAX an mail.php, ohne Seiten-Reload
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    var msgBox = document.getElementById('formMessage');
    var submitBtn = contactForm.querySelector('.contact-submit');

    // Zeitstempel beim Laden des Formulars merken (Zeit-Falle gegen Bots, die sofort absenden)
    var formTsInput = document.getElementById('formTs');
    if (formTsInput) formTsInput.value = Date.now();

    // Leistung per Link vorbelegen, z. B. kontakt/?leistung=Luftaufnahmen
    var wunsch = new URLSearchParams(window.location.search).get('leistung');
    var sel = document.getElementById('leistung');
    if (wunsch && sel) {
      Array.prototype.forEach.call(sel.options, function (o) { if (o.value === wunsch) sel.value = wunsch; });
    }

    // Paket per Link vorbelegen, z. B. ?paket=M (nur S, M, L, XL erlaubt)
    var paketWunsch = (new URLSearchParams(window.location.search).get('paket') || '').toUpperCase();
    var paketInput = document.getElementById('paket');
    var paketNote = document.getElementById('paketNote');
    var paketNoteText = document.getElementById('paketNoteText');
    if (['S', 'M', 'L', 'XL'].indexOf(paketWunsch) !== -1 && paketInput) {
      paketInput.value = paketWunsch;
      if (paketNote && paketNoteText) {
        paketNoteText.textContent = 'Paket ' + paketWunsch;
        paketNote.hidden = false;
      }
    }

    // Falls die Seite nach einem klassischen (Non-JS) POST mit Status-Parameter neu lädt
    var params = new URLSearchParams(window.location.search);
    var status = params.get('status');
    if (status === 'success' && msgBox) {
      showMessage('success', 'Vielen Dank für Ihre Nachricht! Wir melden uns in der Regel innerhalb von 48 Stunden bei Ihnen.');
    } else if (status === 'error' && msgBox) {
      showMessage('error', 'Beim Versand ist leider ein Fehler aufgetreten. Bitte prüfen Sie Ihre Angaben oder schreiben Sie uns direkt an formulare@xatmotion.de.');
    }

    function showMessage(type, text) {
      if (!msgBox) return;
      msgBox.textContent = text;
      msgBox.classList.remove('success', 'error', 'show');
      msgBox.classList.add(type, 'show');
      msgBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Wird gesendet …'; }

      fetch(contactForm.getAttribute('action'), {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          showMessage(data.success ? 'success' : 'error', data.message);
          if (data.success) { contactForm.reset(); window.location.href = 'danke/'; }
        })
        .catch(function () {
          showMessage('error', 'Beim Versand ist leider ein Fehler aufgetreten. Bitte schreiben Sie uns direkt an formulare@xatmotion.de.');
        })
        .finally(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Absenden'; }
        });
    });
  }
  // Pfeile der Kundenleiste (ersetzt frühere Inline-onclick-Handler, wegen Content-Security-Policy)
  document.querySelectorAll('[data-scroll-target]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var t = document.getElementById(btn.getAttribute('data-scroll-target'));
      if (t) t.scrollBy({ left: parseInt(btn.getAttribute('data-scroll-by'), 10) || 0, behavior: 'smooth' });
    });
  });
  // Teilen-Buttons: Link kopieren und Teilen-Menü des Geräts (rein lokal, keine Anfragen an Dritte)
  document.querySelectorAll('[data-share-copy]').forEach(function (btn) {
    var label = btn.querySelector('span');
    var icon = btn.querySelector('i');
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-url') || window.location.href;
      function done() {
        if (label) label.textContent = 'Link kopiert';
        if (icon) icon.className = 'fa-solid fa-check';
        setTimeout(function () {
          if (label) label.textContent = 'Link kopieren';
          if (icon) icon.className = 'fa-solid fa-link';
        }, 2000);
      }
      function legacy() {
        var ta = document.createElement('textarea');
        ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { if (document.execCommand('copy')) done(); } catch (e) {}
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, legacy);
      } else {
        legacy();
      }
    });
  });
  if (navigator.share) {
    document.querySelectorAll('[data-share-native]').forEach(function (btn) {
      btn.hidden = false;
      btn.addEventListener('click', function () {
        navigator.share({ title: btn.getAttribute('data-title') || document.title, url: btn.getAttribute('data-url') || window.location.href }).catch(function () {});
      });
    });
  }
});
