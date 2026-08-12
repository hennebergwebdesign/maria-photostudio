/* ============================================================
   Maria Photostudio — Bewegung (GSAP + ScrollTrigger + Flip)

   Diese Datei enthält ausschließlich Motion. Zustand und Logik
   (Menü, Filter, Lightbox, Formular) liegen in js/main.js und
   melden sich über CustomEvents:

     maria:filter          → Portfolio wurde gefiltert (Flip)
     maria:lightbox-open   → Bildansicht öffnet (detail.card)
     maria:lightbox-close  → Bildansicht schließt

   Läuft GSAP nicht (blockiert, Fehler), übernimmt main.js die
   CSS-Fallbacks – die Seite bleibt in jedem Fall bedienbar.
   ============================================================ */

(function () {
  "use strict";

  if (!window.gsap) return;

  gsap.registerPlugin(ScrollTrigger, Flip);

  // Signal an CSS und an main.js: Bewegung kommt ab hier von GSAP
  document.documentElement.classList.add("gsap");

  gsap.defaults({ ease: "power2.out", duration: 0.6 });

  var body = document.body;
  var mm = gsap.matchMedia();
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Live abfragen: Ereignis-Handler werden nur einmal registriert, die
  // Einstellung kann sich zur Laufzeit aber ändern.
  function reduced() { return reduceQuery.matches; }

  /* ============================================================
     1. Seiteneinstieg – Preloader ist entfernt, Hero startet direkt
     ============================================================ */
  function releasePage() {
    body.classList.add("is-ready");
    body.classList.remove("is-locked");
    document.dispatchEvent(new CustomEvent("maria:intro-done"));
    ScrollTrigger.refresh();
  }

  /* ============================================================
     2. Hero – Eintritt nach dem Preloader
     ============================================================ */
  function heroIntro(reduceMotion) {
    var lines = gsap.utils.toArray(".hero__title .line span");
    var targets = [
      ".hero__kicker",
      ".hero__sub",
      ".hero__actions",
      ".hero__trust li"
    ];

    if (reduceMotion) {
      gsap.set(lines.concat(gsap.utils.toArray(targets)), { clearProps: "all", autoAlpha: 1, y: 0 });
      return;
    }

    gsap.set(".hero__kicker, .hero__sub, .hero__actions, .hero__trust li", { autoAlpha: 0, y: 16 });
    gsap.set(lines, { yPercent: 110, y: 0 });

    var tl = gsap.timeline({ paused: true, defaults: { duration: 0.7 } });
    tl.to(".hero__kicker", { autoAlpha: 1, y: 0, duration: 0.5 })
      .to(lines, { yPercent: 0, stagger: 0.08, ease: "power3.out" }, "-=0.25")
      .to(".hero__sub", { autoAlpha: 1, y: 0 }, "-=0.4")
      .to(".hero__actions", { autoAlpha: 1, y: 0 }, "-=0.45")
      .to(".hero__trust li", { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.45 }, "-=0.4")
      .from(".hero__wash", { scale: 1.15, duration: 1.4, ease: "none" }, 0);

    document.addEventListener("maria:intro-done", function () { tl.play(); }, { once: true });
    if (body.classList.contains("is-ready")) tl.play();
  }

  /* ============================================================
     3. Abschnitte – gestaffelte Eintritte beim Scrollen
     ============================================================ */
  function reveals(reduceMotion) {
    var els = gsap.utils.toArray(".reveal");
    if (!els.length) return;

    if (reduceMotion) {
      gsap.set(els, { autoAlpha: 1, y: 0 });
      return;
    }

    gsap.set(els, { autoAlpha: 0, y: 24 });

    ScrollTrigger.batch(els, {
      start: "top 88%",
      once: true,
      interval: 0.08,
      batchMax: 6,
      onEnter: function (batch) {
        gsap.to(batch, {
          autoAlpha: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.08,
          overwrite: true
        });
      }
    });
  }

  /* ============================================================
     4. Portfolio – sanfter Parallax im Bildausschnitt
     ============================================================ */
  function cardParallax() {
    gsap.utils.toArray(".card").forEach(function (card) {
      var img = card.querySelector("img");
      if (!img) return;
      // Im Portfolio-Raster stehen alle Kacheln im gleichen 4:5-Rahmen. Dort
      // ruht der Parallax: er würde die ohnehin knappe Bildhöhe nur weiter
      // beschneiden. Karten außerhalb des Rasters behalten ihn.
      if (card.closest("#workGrid")) return;
      // ±4 % passen in den Überstand aus style.css (Bild 110 % hoch, -5 % oben).
      gsap.fromTo(img,
        { yPercent: -4 },
        {
          yPercent: 4,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        }
      );
    });
  }

  /* Der Zoom beim Überfahren gehört hierher, sobald GSAP läuft: der Parallax
     schreibt eine eigene transform auf dasselbe Bild, eine zweite Quelle in
     CSS würde sie überschreiben. overwrite:"auto" räumt nur die Skalierung
     weg, der laufende Parallax bleibt unangetastet.
     Einmalig registriert – die Prüfung auf echte Zeigergeräte passiert erst
     beim Ereignis, sonst hingen die Listener am Breakpoint. */
  function cardHover() {
    var pointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    gsap.utils.toArray(".card").forEach(function (card) {
      var img = card.querySelector("img");
      if (!img) return;

      function zoom(scale) {
        if (!pointer.matches || reduced()) return;
        gsap.to(img, { scale: scale, duration: 0.6, ease: "power2.out", overwrite: "auto" });
      }

      card.addEventListener("mouseenter", function () { zoom(1.04); });
      card.addEventListener("mouseleave", function () { zoom(1); });
      card.addEventListener("focusin", function () { zoom(1.04); });
      card.addEventListener("focusout", function () { zoom(1); });
    });
  }

  /* ============================================================
     5. Kennzahlen – zählen beim Erscheinen hoch
     ============================================================ */
  function counters(reduceMotion) {
    gsap.utils.toArray(".about__facts strong").forEach(function (el) {
      var match = /^(\d+)(.*)$/.exec(el.textContent.trim());
      if (!match) return;

      var target = parseInt(match[1], 10);
      var suffix = match[2];

      if (reduceMotion) return;

      var obj = { value: 0 };
      gsap.to(obj, {
        value: target,
        duration: 1.2,
        ease: "power1.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: function () {
          el.textContent = Math.round(obj.value) + suffix;
        }
      });
    });
  }

  /* ============================================================
     6. Laufband – läuft immer mit konstantem Tempo vollständig durch,
        pausiert oder wechselt nie die Richtung (auch nicht bei Hover
        oder Scroll-Stillstand).
     ============================================================ */
  function marquee(reduceMotion) {
    var track = document.querySelector(".hero__marquee-track");
    if (!track || reduceMotion) return;

    // CSS-Animation abschalten, GSAP übernimmt die Kontrolle
    track.style.animation = "none";

    gsap.to(track, {
      xPercent: -50,
      repeat: -1,
      duration: 22,
      ease: "none"
    });
  }

  /* ============================================================
     6b. Ablauf – Pfad füllt sich beim Scrollen, Schritte werden aktiv
     ============================================================ */
  function processPath(reduceMotion) {
    var path = document.querySelector(".process__path");
    var fill = document.querySelector(".process__spine-fill, .process__line-fill");
    var steps = gsap.utils.toArray(".process__step");
    if (!path || !fill || !steps.length) return;

    if (reduceMotion) {
      gsap.set(fill, { scaleY: 1 });
      steps.forEach(function (step) {
        step.classList.add("is-active");
        step.classList.add("is-in");
      });
      return;
    }

    gsap.set(fill, { scaleY: 0 });
    gsap.to(fill, {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: path,
        start: "top 70%",
        end: "bottom 60%",
        scrub: true
      }
    });

    steps.forEach(function (step) {
      ScrollTrigger.create({
        trigger: step,
        start: "top 78%",
        onEnter: function () {
          step.classList.add("is-in");
          step.classList.add("is-active");
        },
        onLeaveBack: function () {
          step.classList.remove("is-in");
          step.classList.remove("is-active");
        }
      });
    });
  }

  /* ============================================================
     7. FAQ – Höhe weich auf- und zuklappen
     ============================================================ */
  function faq() {
    gsap.utils.toArray(".faq__item").forEach(function (item) {
      var summary = item.querySelector("summary");
      var panel = item.querySelector(".faq__answer");
      if (!summary || !panel) return;

      // Die CSS-Einblendung würde sich mit GSAP überlagern
      panel.style.animation = "none";

      summary.addEventListener("click", function (e) {
        // Bei reduzierter Bewegung das native Auf-/Zuklappen nicht abfangen
        if (reduced()) return;
        e.preventDefault();

        if (item.open) {
          gsap.to(panel, {
            height: 0,
            autoAlpha: 0,
            duration: 0.3,
            ease: "power2.in",
            onComplete: function () {
              item.open = false;
              gsap.set(panel, { clearProps: "all" });
            }
          });
        } else {
          item.open = true;
          gsap.fromTo(panel,
            { height: 0, autoAlpha: 0 },
            {
              height: "auto",
              autoAlpha: 1,
              duration: 0.4,
              ease: "power2.out",
              onComplete: function () {
                gsap.set(panel, { clearProps: "height" });
                ScrollTrigger.refresh();
              }
            }
          );
        }
      });
    });
  }

  /* ============================================================
     8. Filter – Flip animiert das Umsortieren des Rasters
     ============================================================ */
  function filterFlip() {
    var grid = document.getElementById("workGrid");
    if (!grid) return;

    var stateBefore = null;
    var heightBefore = 0;

    // Karten auf einer späteren Seite haben ihren Reveal-Trigger nie erreicht
    // und stehen deshalb noch auf opacity 0 / visibility hidden. Nach jedem
    // Filter- oder Seitenwechsel gilt: was im Raster steht, ist auch sichtbar.
    // visibility wird bewusst ausgeschrieben statt über autoAlpha gesetzt –
    // autoAlpha merkt sich den Ausgangswert und stellt sonst "hidden" wieder her.
    function showCurrentCards() {
      var shown = grid.querySelectorAll(".card:not(.is-hidden)");
      if (shown.length) gsap.set(shown, { opacity: 1, visibility: "inherit", y: 0 });
    }

    document.addEventListener("maria:filter", function () {
      showCurrentCards();
      // Bei aktiver Flip-Animation räumt deren onComplete auf; ohne sie
      // müssen die Scroll-Trigger hier neu vermessen werden.
      if (reduced()) ScrollTrigger.refresh();
    });

    document.addEventListener("maria:filter-before", function () {
      if (reduced()) return;
      stateBefore = Flip.getState(grid.querySelectorAll(".card"));
      heightBefore = grid.offsetHeight;
    });

    document.addEventListener("maria:filter", function () {
      if (reduced() || !stateBefore) return;

      // Flip stellt die Karten kurzzeitig absolut – ohne reservierte Höhe
      // fiele das Raster auf 0 zusammen und die Karten flögen über die
      // Überschrift. Deshalb die Höhe mitanimieren.
      var heightAfter = grid.offsetHeight;
      gsap.set(grid, { height: heightBefore });

      Flip.from(stateBefore, {
        duration: 0.55,
        ease: "power2.inOut",
        absolute: true,
        scale: true,
        stagger: 0.03,
        onEnter: function (els) {
          return gsap.fromTo(els,
            { opacity: 0, scale: 0.92, visibility: "inherit" },
            { opacity: 1, scale: 1, duration: 0.45 }
          );
        },
        onLeave: function (els) {
          // Nur ausblenden, nicht verstecken: dieselben Karten kommen beim
          // Zurückblättern wieder und dürfen kein visibility:hidden behalten.
          return gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.3 });
        },
        onComplete: function () {
          gsap.set(grid, { clearProps: "height" });
          showCurrentCards();
          ScrollTrigger.refresh();
        }
      });

      gsap.to(grid, {
        height: heightAfter,
        duration: 0.55,
        ease: "power2.inOut"
      });
    });
  }

  /* ============================================================
     9. Lightbox – öffnet aus der angeklickten Karte heraus
     ============================================================ */
  function lightbox() {
    var box = document.getElementById("lightbox");
    var figure = box && box.querySelector(".lightbox__figure");
    if (!box || !figure) return;

    var controls = box.querySelectorAll(".lightbox__close, .lightbox__arrow");

    document.addEventListener("maria:lightbox-open", function (e) {
      if (reduced()) {
        gsap.set(box, { autoAlpha: 1 });
        return;
      }

      var card = e.detail && e.detail.card;
      var origin = card ? card.getBoundingClientRect() : null;
      var target = figure.getBoundingClientRect();

      gsap.set(box, { autoAlpha: 1 });

      var tl = gsap.timeline();
      tl.fromTo(box, { backgroundColor: "rgba(252, 246, 240, 0)" },
                     { backgroundColor: "rgba(252, 246, 240, 0.97)", duration: 0.35 }, 0);

      if (origin) {
        // Räumlicher Zusammenhang: die Ansicht wächst aus der Karte
        tl.from(figure, {
          x: origin.left + origin.width / 2 - (target.left + target.width / 2),
          y: origin.top + origin.height / 2 - (target.top + target.height / 2),
          scale: Math.max(0.3, origin.width / Math.max(target.width, 1)),
          autoAlpha: 0,
          duration: 0.45,
          ease: "power3.out"
        }, 0);
      } else {
        tl.from(figure, { scale: 0.9, autoAlpha: 0, duration: 0.4 }, 0);
      }

      // opacity statt autoAlpha: autoAlpha würde die Buttons kurz auf
      // visibility:hidden setzen – dann lässt sich der Schließen-Button
      // im selben Tick nicht fokussieren.
      tl.from(controls, { opacity: 0, y: 8, stagger: 0.04, duration: 0.25 }, 0.2);
    });

    document.addEventListener("maria:lightbox-close", function () {
      if (reduced()) {
        gsap.set(box, { autoAlpha: 0, clearProps: "backgroundColor" });
        return;
      }
      gsap.to(box, {
        autoAlpha: 0,
        duration: 0.28,
        ease: "power2.in",
        onComplete: function () {
          gsap.set(box, { clearProps: "all" });
          gsap.set(figure, { clearProps: "all" });
        }
      });
    });
  }

  /* ============================================================
     10. Mobilmenü – Links laufen gestaffelt ein
     ============================================================ */
  function menu() {
    var links = gsap.utils.toArray("#navLinks a");
    if (!links.length) return;

    document.addEventListener("maria:menu-open", function () {
      if (reduced()) return;
      gsap.fromTo(links,
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.35, delay: 0.1, overwrite: true }
      );
    });

    document.addEventListener("maria:menu-close", function () {
      gsap.set(links, { clearProps: "all" });
    });
  }

  /* ============================================================
     Aufbau

     Einmalig: Intro und alle Interaktionen, die document-Listener
     registrieren – sonst hätte man nach jedem Breakpoint-Wechsel
     doppelte Handler.

     Über matchMedia: alles Scroll-Gebundene, damit ScrollTrigger bei
     Breakpoint-Wechsel sauber zurückgesetzt und neu vermessen wird.
     Wichtig: die Bedingungen müssen so gewählt sein, dass immer
     mindestens eine zutrifft – sonst läuft der Handler nie.
     ============================================================ */
  /* ============================================================
     11. Story – gepinnte Bild-Erzählung mit Frame-Wechsel
     ============================================================ */
  function storyStage(reduceMotion) {
    var stage = document.getElementById("storyStage");
    if (!stage) return;
    var frames = gsap.utils.toArray(".story__frame");
    var panels = gsap.utils.toArray(".story__panel");
    if (!frames.length || !panels.length) return;

    if (reduceMotion) {
      frames.forEach(function (f, i) { f.classList.toggle("is-active", i === 0); });
      return;
    }

    panels.forEach(function (panel, i) {
      ScrollTrigger.create({
        trigger: panel,
        start: "top 60%",
        end: "bottom 40%",
        onEnter: function () { activate(i); },
        onEnterBack: function () { activate(i); }
      });
    });

    function activate(idx) {
      frames.forEach(function (f, i) { f.classList.toggle("is-active", i === idx); });
    }
  }

  /* ============================================================
     12. Nav-Fortschrittsbalken
     ============================================================ */
  function navProgress(reduceMotion) {
    var fill = document.getElementById("navProgressFill");
    if (!fill || reduceMotion) return;
    gsap.to(fill, {
      width: "100%",
      ease: "none",
      scrollTrigger: {
        start: 0,
        end: function () { return document.documentElement.scrollHeight - window.innerHeight; },
        scrub: 0.3
      }
    });
  }

  /* ============================================================
     13. CTA-Banner – sanfter Ken-Burns-Parallax
     ============================================================ */
  function ctaParallax(reduceMotion) {
    var bg = document.querySelector(".cta-banner__bg img");
    if (!bg || reduceMotion) return;
    gsap.fromTo(bg,
      { yPercent: -8, scale: 1.08 },
      {
        yPercent: 8,
        scale: 1.02,
        ease: "none",
        scrollTrigger: {
          trigger: ".cta-banner",
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      }
    );
  }

  /* ============================================================
     14. Collage – gestaffelter Eintritt der Bilder
     ============================================================ */
  function collageIn(reduceMotion) {
    var items = gsap.utils.toArray(".collage figure");
    if (!items.length || reduceMotion) return;
    gsap.set(items, { autoAlpha: 0, y: 40, scale: 0.94 });
    ScrollTrigger.batch(items, {
      start: "top 92%",
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          autoAlpha: 1, y: 0, scale: 1,
          duration: 0.7, stagger: 0.08, ease: "power3.out"
        });
      }
    });
  }

  /* ============================================================
     15. Persona-Karten – Tilt beim Hover
     ============================================================ */
  function personaTilt(reduceMotion) {
    if (reduceMotion) return;
    var cards = gsap.utils.toArray(".persona__card");
    cards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
        gsap.to(card, { rotateX: rx, rotateY: ry, transformPerspective: 900, duration: 0.4, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", function () {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5, ease: "power2.out" });
      });
    });
  }

  heroIntro(reduced());
  releasePage();
  faq();
  filterFlip();
  cardHover();
  lightbox();
  menu();

  mm.add(
    {
      reduceMotion: "(prefers-reduced-motion: reduce)",
      fullMotion: "(prefers-reduced-motion: no-preference)",
      isDesktop: "(min-width: 769px)"
    },
    function (context) {
      var reduce = context.conditions.reduceMotion;
      var desktop = context.conditions.isDesktop;

      reveals(reduce);
      counters(reduce);
      processPath(reduce);
      storyStage(reduce);
      navProgress(reduce);
      ctaParallax(reduce);
      collageIn(reduce);

      // Parallax und Laufband nur dort, wo genug Platz und Leistung ist
      if (desktop && !reduce) {
        cardParallax();
        marquee(reduce);
        personaTilt(reduce);
      }
    }
  );

  // Nach dem Laden der Bilder stimmen die Trigger-Positionen erst wirklich
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
