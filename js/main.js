/* ============================================================
   Maria Photostudio — Interaktionen

   Designregeln, die hier umgesetzt werden:
   - Animationen sind unterbrechbar und blockieren nie die Bedienung
   - Eintritte gestaffelt (40 ms je Element), nicht alle auf einmal
   - Aktueller Abschnitt wird in der Navigation markiert
   - Fokus wird in Overlays gefangen und danach zurückgegeben
   - Formularfehler stehen am Feld, nicht nur oben
   ============================================================ */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body;

  // Läuft GSAP? Dann übernimmt js/animations.js sämtliche Bewegung und
  // diese Datei kümmert sich nur noch um Zustand und Bedienung.
  var hasGsap = document.documentElement.classList.contains("gsap");

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || null }));
  }

  /* ---------- Alte Sprungmarken auf neue umleiten (Links von außen bleiben gültig) ---------- */
  var legacyHashes = {
    "#arbeiten": "#portfolio",
    "#ueber": "#ueber-mich",
    "#about": "#ueber-mich",
    "#services": "#leistungen",
    "#contact": "#kontakt"
  };

  if (legacyHashes[window.location.hash]) {
    window.location.replace(legacyHashes[window.location.hash]);
  }

  /* ---------- Preloader: Bild-Flash-Sequenz ---------- */
  var loader = document.getElementById("loader");
  var loaderSkip = document.getElementById("loaderSkip");

  function finishLoader() {
    if (!loader || loader.classList.contains("is-done")) return;
    loader.classList.add("is-shrinking");
    window.setTimeout(function () {
      loader.classList.add("is-done");
      body.classList.add("is-ready");
      body.classList.remove("is-locked");
    }, 500);
  }

  if (loader && !hasGsap && !prefersReducedMotion) {
    body.classList.add("is-locked");
    var images = loader.querySelectorAll(".loader__img");
    var index = 0;
    var flashDelay = 160;

    var flash = function () {
      if (loader.classList.contains("is-shrinking")) return;
      if (index > 0) images[index - 1].classList.remove("is-visible");
      if (index < images.length) {
        images[index].classList.add("is-visible");
        index++;
        window.setTimeout(flash, flashDelay);
      } else {
        images[images.length - 1].classList.add("is-visible");
        window.setTimeout(finishLoader, 250);
      }
    };

    // Start, sobald das erste Bild geladen ist – spätestens nach 1 s
    var started = false;
    var start = function () {
      if (started) return;
      started = true;
      flash();
    };
    if (images.length && images[0].complete) {
      start();
    } else if (images.length) {
      images[0].addEventListener("load", start);
      images[0].addEventListener("error", start);
    }
    window.setTimeout(start, 1000);
    // Sicherheitsnetz: Loader nie länger als 4 s zeigen
    window.setTimeout(finishLoader, 4000);

    // Jederzeit überspringbar – per Button, Klick, Escape oder Scrollversuch
    if (loaderSkip) loaderSkip.addEventListener("click", finishLoader);
    loader.addEventListener("click", finishLoader);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") finishLoader();
    });
    window.addEventListener("wheel", finishLoader, { once: true, passive: true });
    window.addEventListener("touchmove", finishLoader, { once: true, passive: true });
  } else if (!hasGsap) {
    if (loader) loader.classList.add("is-done");
    body.classList.add("is-ready");
  }

  /* ---------- Navigation ---------- */
  var nav = document.getElementById("nav");
  var navLinks = document.getElementById("navLinks");
  var burger = document.getElementById("navBurger");

  window.addEventListener("scroll", function () {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
  }, { passive: true });

  function closeMenu() {
    navLinks.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Menü öffnen");
    body.classList.remove("is-locked");
    emit("maria:menu-close");
  }

  if (burger) {
    burger.addEventListener("click", function () {
      var open = navLinks.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
      body.classList.toggle("is-locked", open);
      emit(open ? "maria:menu-open" : "maria:menu-close");
    });

    navLinks.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });

    // Escape schließt das Menü – jedes Overlay braucht einen Fluchtweg
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navLinks.classList.contains("is-open")) {
        closeMenu();
        burger.focus();
      }
    });
  }

  /* ---------- Aktiven Abschnitt in der Navigation markieren ---------- */
  var navAnchors = Array.prototype.slice.call(
    document.querySelectorAll('.nav__links a[href^="#"]')
  );
  var sections = navAnchors
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(function (a) {
          a.classList.toggle(
            "is-current",
            a.getAttribute("href") === "#" + entry.target.id
          );
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Scroll-Reveal mit Staffelung ---------- */
  var revealEls = document.querySelectorAll(".reveal");

  if (hasGsap) {
    // GSAP/ScrollTrigger übernimmt die Eintritte
  } else if ("IntersectionObserver" in window && !prefersReducedMotion) {
    var io = new IntersectionObserver(function (entries) {
      // Gleichzeitig sichtbare Elemente um je 40 ms versetzt einblenden
      var visible = entries.filter(function (e) { return e.isIntersecting; });
      visible.forEach(function (entry, i) {
        entry.target.style.setProperty("--reveal-delay", Math.min(i, 5) * 40 + "ms");
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Leistungen: Flipbox ---------- */
  var serviceCards = document.querySelectorAll(".service");
  var hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

  function toggleFlip(card) {
    var flipped = card.classList.toggle("is-flipped");
    card.setAttribute("aria-pressed", String(flipped));
  }

  serviceCards.forEach(function (card) {
    card.addEventListener("click", function () {
      if (hoverQuery.matches) return; // Desktop dreht per Hover
      toggleFlip(card);
    });

    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleFlip(card);
      }
    });
  });

  /* ---------- Portfolio-Filter ---------- */
  var chips = document.querySelectorAll(".chip");
  var cards = document.querySelectorAll(".card");

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) {
        c.classList.remove("is-active");
        c.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("is-active");
      chip.setAttribute("aria-pressed", "true");

      emit("maria:filter-before");

      var filter = chip.dataset.filter;
      cards.forEach(function (card) {
        var show = filter === "all" || card.dataset.type === filter;
        card.classList.toggle("is-hidden", !show);
      });

      emit("maria:filter", { filter: filter });
    });
  });

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxCaption = document.getElementById("lightboxCaption");
  var lightboxClose = document.getElementById("lightboxClose");
  var lightboxPrev = document.getElementById("lightboxPrev");
  var lightboxNext = document.getElementById("lightboxNext");
  var currentIndex = 0;
  var lastFocused = null;

  function visibleCards() {
    return Array.prototype.filter.call(cards, function (c) {
      return !c.classList.contains("is-hidden");
    });
  }

  function openLightbox(card) {
    var list = visibleCards();
    lastFocused = document.activeElement;
    currentIndex = list.indexOf(card);
    showLightbox(list[currentIndex]);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    body.classList.add("is-locked");
    emit("maria:lightbox-open", { card: card });
    lightboxClose.focus();
  }

  function showLightbox(card) {
    lightboxImg.src = card.getAttribute("href");
    lightboxImg.alt = card.dataset.title || "";
    lightboxCaption.textContent =
      (card.dataset.title || "") + " — " + (card.dataset.cat || "");
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    body.classList.remove("is-locked");
    emit("maria:lightbox-close");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function stepLightbox(dir) {
    var list = visibleCards();
    if (!list.length) return;
    currentIndex = (currentIndex + dir + list.length) % list.length;
    showLightbox(list[currentIndex]);
  }

  // Portfolio-Karten verlinken direkt auf YouTube – keine Lightbox mehr abfangen.

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", function () { stepLightbox(-1); });
  lightboxNext.addEventListener("click", function () { stepLightbox(1); });

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);

    // Fokus im Overlay halten
    if (e.key === "Tab") {
      // Reihenfolge wie im DOM, damit der Zyklus geschlossen ist
      var focusable = [lightboxClose, lightboxPrev, lightboxNext];
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------- Kontaktformular: Validierung am Feld ---------- */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");

  if (form) {
    var fields = Array.prototype.slice.call(
      form.querySelectorAll("input[required], textarea[required]")
    );

    var messages = {
      name: "Bitte tragen Sie Ihren Namen ein, damit ich Sie ansprechen kann.",
      email: "Bitte prüfen Sie die E-Mail-Adresse – ohne sie kann ich nicht antworten.",
      message: "Beschreiben Sie kurz Ihr Vorhaben, zwei Sätze genügen."
    };

    function errorBox(field) {
      return document.getElementById("err-" + field.name);
    }

    function validate(field) {
      var box = errorBox(field);
      var ok = field.checkValidity();
      field.setAttribute("aria-invalid", ok ? "false" : "true");
      if (box) box.textContent = ok ? "" : messages[field.name] || "Bitte prüfen Sie diese Angabe.";
      return ok;
    }

    fields.forEach(function (field) {
      // Erst nach dem Verlassen prüfen, nicht bei jedem Tastendruck
      field.addEventListener("blur", function () { validate(field); });
      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") validate(field);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstInvalid = null;
      fields.forEach(function (field) {
        if (!validate(field) && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        status.textContent = "Bitte ergänzen Sie die markierten Felder.";
        firstInvalid.focus();
        return;
      }

      var data = new FormData(form);
      var subject = encodeURIComponent("Projektanfrage von " + data.get("name"));
      var bodyText = encodeURIComponent(
        data.get("message") + "\n\n— " + data.get("name") + " (" + data.get("email") + ")"
      );
      window.location.href =
        "mailto:hallo@maria-photostudio.de?subject=" + subject + "&body=" + bodyText;
      status.textContent = "Ihr E-Mail-Programm öffnet sich – vielen Dank!";
    });
  }
})();
