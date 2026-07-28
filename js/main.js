/* ============================================================
   Maria Photostudio — Interaktionen
   ============================================================ */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Preloader: Bild-Flash-Sequenz ---------- */
  var loader = document.getElementById("loader");
  var body = document.body;

  function finishLoader() {
    if (!loader || loader.classList.contains("is-done")) return;
    loader.classList.add("is-shrinking");
    setTimeout(function () {
      loader.classList.add("is-done");
      body.classList.add("is-ready");
      body.classList.remove("is-locked");
    }, 900);
  }

  if (loader && !prefersReducedMotion) {
    body.classList.add("is-locked");
    var images = loader.querySelectorAll(".loader__img");
    var index = 0;
    var flashDelay = 220;

    var flash = function () {
      if (index > 0) images[index - 1].classList.remove("is-visible");
      if (index < images.length) {
        images[index].classList.add("is-visible");
        index++;
        setTimeout(flash, flashDelay);
      } else {
        // Letztes Bild stehen lassen, dann herunterskalieren und Seite freigeben
        images[images.length - 1].classList.add("is-visible");
        setTimeout(finishLoader, 350);
      }
    };

    // Start, sobald das erste Bild geladen ist – spätestens nach 1,5 s
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
    setTimeout(start, 1500);
    // Sicherheitsnetz: Loader nie länger als 6 s zeigen
    setTimeout(finishLoader, 6000);
  } else {
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

  if (burger) {
    burger.addEventListener("click", function () {
      var open = navLinks.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
    });
    navLinks.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        navLinks.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Scroll-Reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Portfolio-Filter ---------- */
  var chips = document.querySelectorAll(".chip");
  var cards = document.querySelectorAll(".card");

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      var filter = chip.dataset.filter;
      cards.forEach(function (card) {
        var show = filter === "all" || card.dataset.type === filter;
        card.classList.toggle("is-hidden", !show);
      });
    });
  });

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxCaption = document.getElementById("lightboxCaption");
  var currentIndex = 0;

  function visibleCards() {
    return Array.prototype.filter.call(cards, function (c) {
      return !c.classList.contains("is-hidden");
    });
  }

  function openLightbox(card) {
    var list = visibleCards();
    currentIndex = list.indexOf(card);
    showLightbox(list[currentIndex]);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    body.classList.add("is-locked");
  }

  function showLightbox(card) {
    lightboxImg.src = card.getAttribute("href");
    lightboxImg.alt = card.dataset.title || "";
    lightboxCaption.textContent = (card.dataset.title || "") + " — " + (card.dataset.cat || "");
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    body.classList.remove("is-locked");
  }

  function stepLightbox(dir) {
    var list = visibleCards();
    if (!list.length) return;
    currentIndex = (currentIndex + dir + list.length) % list.length;
    showLightbox(list[currentIndex]);
  }

  cards.forEach(function (card) {
    card.addEventListener("click", function (e) {
      e.preventDefault();
      openLightbox(card);
    });
  });

  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrev").addEventListener("click", function () { stepLightbox(-1); });
  document.getElementById("lightboxNext").addEventListener("click", function () { stepLightbox(1); });

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });

  /* ---------- Kontaktformular ---------- */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
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
