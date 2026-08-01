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

  /* ---------- Direkter Seiteneinstieg (kein Preloader mehr) ---------- */
  if (!hasGsap) body.classList.add("is-ready");

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
  var currentGroup = [];
  var lastFocused = null;

  function visibleCards() {
    return Array.prototype.filter.call(cards, function (c) {
      return !c.classList.contains("is-hidden");
    });
  }

  // Alle weiteren Lightbox-Bilder außerhalb des Portfolios (Über-mich, Collage)
  // werden über die Klasse .lb-item eingebunden. Jede Sektion bleibt eine
  // eigene Blätter-Gruppe, damit die Pfeiltasten sinnvoll navigieren.
  function groupForItem(item) {
    if (item.classList.contains("card")) return visibleCards();
    var container = item.closest(".collage, .about, section") || document.body;
    return Array.prototype.slice.call(container.querySelectorAll(".lb-item"));
  }

  function openLightbox(card) {
    currentGroup = groupForItem(card);
    lastFocused = document.activeElement;
    currentIndex = currentGroup.indexOf(card);
    showLightbox(currentGroup[currentIndex]);
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
    var list = currentGroup && currentGroup.length ? currentGroup : visibleCards();
    if (!list.length) return;
    currentIndex = (currentIndex + dir + list.length) % list.length;
    showLightbox(list[currentIndex]);
  }

  var lightboxItems = document.querySelectorAll(".card, .lb-item");
  lightboxItems.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      openLightbox(item);
    });
  });

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
      form.querySelectorAll("input[required], select[required], textarea[required]")
    );

    var messages = {
      name: "Bitte tragen Sie Ihren vollen Namen ein.",
      email: "Bitte prüfen Sie die E-Mail-Adresse – ohne sie kann ich nicht antworten.",
      phone: "Bitte tragen Sie eine Telefonnummer ein, unter der ich Sie erreichen kann.",
      topic: "Bitte wählen Sie einen Anlass aus.",
      message: "Bitte beschreiben Sie kurz Ihr Vorhaben."
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

    var formOpenedAt = Date.now();
    var submitBtn = form.querySelector("button[type='submit']");

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
      var payload = {
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        topic: data.get("topic"),
        message: data.get("message") || "",
        website: data.get("website") || "",
        ts: formOpenedAt
      };

      if (submitBtn) submitBtn.disabled = true;
      status.textContent = "Anfrage wird gesendet …";

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (resp) {
          return resp.json().then(function (body) { return { ok: resp.ok, body: body }; });
        })
        .then(function (result) {
          if (result.ok && result.body && result.body.ok) {
            form.reset();
            formOpenedAt = Date.now();
            status.textContent = "Vielen Dank! Ihre Anfrage ist eingegangen. Ich melde mich werktags innerhalb von 24 Stunden.";
          } else {
            status.textContent = "Das hat leider nicht geklappt. Bitte schreiben Sie mir direkt an henneberg883@gmail.com.";
          }
        })
        .catch(function () {
          status.textContent = "Das hat leider nicht geklappt. Bitte schreiben Sie mir direkt an henneberg883@gmail.com.";
        })
        .then(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
})();
