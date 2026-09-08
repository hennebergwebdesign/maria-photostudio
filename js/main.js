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

  /* ---------- Portfolio: Filter + Seiten ----------
     Das Raster zeigt immer höchstens PAGE_SIZE Bilder. Der Filter bestimmt,
     welche Karten überhaupt in Frage kommen, die Seitenzahl schneidet daraus
     den sichtbaren Ausschnitt. Beide Schritte laufen über dieselben Events
     wie zuvor der Filter, damit die Flip-Animation weiter greift. */
  var PAGE_SIZE = 12;
  var filterChips = document.querySelectorAll(".work__filter .chip");
  var cards = document.querySelectorAll(".card");
  var workGrid = document.getElementById("workGrid");
  var workPager = document.getElementById("workPager");
  var workStatus = document.getElementById("workStatus");
  var activeFilter = "all";
  var currentPage = 1;
  var switchToken = 0;

  /* ---------- Bilder: Ladezustand am Platzhalter ----------
     Solange ein Bild lädt, steht ein ruhiger Platzhalter im Raster; erst
     danach blendet das Bild auf. Die Klassen setzt bewusst JavaScript –
     ohne JS bleiben die Bilder ganz normal sichtbar. */
  function isLoaded(img) {
    return !!img && img.complete && img.naturalWidth > 0;
  }

  function trackMedia(img) {
    var frame = img && img.parentNode;
    if (!frame || frame.tagName !== "PICTURE" || frame.dataset.tracked) return;
    frame.dataset.tracked = "1";

    function ready() {
      frame.classList.remove("is-loading");
      frame.classList.add("is-ready");
    }

    if (isLoaded(img)) {
      frame.classList.add("is-ready");
      return;
    }

    frame.classList.add("is-loading");
    img.addEventListener("load", ready, { once: true });
    // Auch ein fehlendes Bild darf den Platzhalter nicht dauerhaft festhalten
    img.addEventListener("error", ready, { once: true });
  }

  Array.prototype.forEach.call(cards, function (card) {
    var img = card.querySelector("img");
    if (img) trackMedia(img);
  });

  /* Bilder einer Karten-Liste anstoßen und auf sie warten. Nach spätestens
     `timeout` ms geht es weiter – ein langsames Bild darf das Blättern nicht
     blockieren, der Platzhalter fängt es dann auf. */
  function preloadCards(list, timeout) {
    var pending = [];

    list.forEach(function (card) {
      var img = card.querySelector("img");
      if (!img) return;
      // Karten außerhalb des Sichtfelds sind lazy und laden sonst nie,
      // solange sie über display:none aus dem Layout genommen sind.
      if (img.loading === "lazy") img.loading = "eager";
      if ("fetchPriority" in img) img.fetchPriority = "high";
      if (!isLoaded(img)) pending.push(img);
    });

    if (!pending.length) return Promise.resolve();

    var all = Promise.all(pending.map(function (img) {
      return new Promise(function (resolve) {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }));

    return Promise.race([
      all,
      new Promise(function (resolve) { window.setTimeout(resolve, timeout || 1200); })
    ]);
  }

  function matchingCards() {
    return Array.prototype.filter.call(cards, function (card) {
      return activeFilter === "all" || card.dataset.type === activeFilter;
    });
  }

  function pageCount() {
    return Math.max(1, Math.ceil(matchingCards().length / PAGE_SIZE));
  }

  function renderGrid(initial) {
    var onPage = pageCards();

    cards.forEach(function (card) {
      card.classList.toggle("is-hidden", onPage.indexOf(card) === -1);
    });

    // Ohne GSAP blendet CSS die Karten über .is-in ein. Karten auf späteren
    // Seiten haben ihren Scroll-Trigger nie erreicht und blieben sonst leer.
    // Beim ersten Aufbau bleibt der Eintritt dem Scroll-Reveal überlassen.
    if (!initial) onPage.forEach(function (card) { card.classList.add("is-in"); });
  }

  function pagerButton(label, aria) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = label;
    if (aria) button.setAttribute("aria-label", aria);
    return button;
  }

  function renderPager() {
    if (!workPager) return;
    var total = pageCount();

    workPager.textContent = "";
    workPager.hidden = total < 2;
    if (workStatus) {
      workStatus.textContent = total < 2
        ? ""
        : "Seite " + currentPage + " von " + total;
    }
    if (total < 2) return;

    var prev = pagerButton("← Zurück", "Vorherige Seite");
    prev.classList.add("chip--step");
    prev.disabled = currentPage === 1;
    prev.addEventListener("click", function () { goToPage(currentPage - 1); });
    workPager.appendChild(prev);

    for (var i = 1; i <= total; i++) {
      (function (page) {
        var button = pagerButton(String(page), "Seite " + page);
        button.classList.add("chip--page");
        if (page === currentPage) {
          button.classList.add("is-active");
          button.setAttribute("aria-current", "true");
        }
        button.addEventListener("click", function () { goToPage(page); });
        workPager.appendChild(button);
      })(i);
    }

    var next = pagerButton("Weiter →", "Nächste Seite");
    next.classList.add("chip--step");
    next.disabled = currentPage === total;
    next.addEventListener("click", function () { goToPage(currentPage + 1); });
    workPager.appendChild(next);
  }

  // Karten, die die aktuelle Auswahl zeigen würde – auch bevor das Raster
  // umgebaut ist. Grundlage für das Vorladen.
  function pageCards() {
    var matches = matchingCards();
    var from = (currentPage - 1) * PAGE_SIZE;
    return matches.slice(from, from + PAGE_SIZE);
  }

  function setBusy(busy) {
    if (!workGrid) return;
    workGrid.classList.toggle("is-switching", busy);
    if (busy) workGrid.setAttribute("aria-busy", "true");
    else workGrid.removeAttribute("aria-busy");
  }

  function commit() {
    emit("maria:filter-before");
    renderGrid();
    renderPager();
    emit("maria:filter", { filter: activeFilter, page: currentPage });
  }

  // Wer Daten sparen will oder auf einer schmalen Leitung sitzt, bekommt
  // keine Bilder auf Vorrat – das Vorladen ist Komfort, keine Grundfunktion.
  function saveData() {
    var net = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!net) return false;
    if (net.saveData) return true;
    return /2g/.test(net.effectiveType || "");
  }

  // Die Bilder der Folgeseite in einer ruhigen Minute holen, damit
  // Weiterblättern sich sofort anfühlt.
  function preloadAhead() {
    if (saveData()) return;
    var matches = matchingCards();
    var from = currentPage * PAGE_SIZE;
    var next = matches.slice(from, from + PAGE_SIZE);
    if (!next.length) return;

    var run = function () {
      next.forEach(function (card) {
        var img = card.querySelector("img");
        if (!img || isLoaded(img)) return;
        if (img.loading === "lazy") img.loading = "eager";
        if ("fetchPriority" in img) img.fetchPriority = "low";
      });
    };

    if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 2000 });
    else window.setTimeout(run, 900);
  }

  /* Erst die Bilder der neuen Auswahl holen, dann umbauen. Vorher flogen
     leere Kästen ins Raster und füllten sich Sekunden später einzeln. */
  function update(options) {
    var token = ++switchToken;
    var upcoming = pageCards();

    // Ist alles schon da, kommt es gar nicht erst zum Wartezustand.
    var slow = window.setTimeout(function () {
      if (token === switchToken) setBusy(true);
    }, 120);

    preloadCards(upcoming, 1400).then(function () {
      window.clearTimeout(slow);
      if (token !== switchToken) return;   // inzwischen wurde weitergeklickt
      setBusy(false);
      commit();
      if (options && options.scrollToTop) scrollToGridHead();
      preloadAhead();
    });
  }

  function scrollToGridHead() {
    // Nach dem Blättern oben im Raster anfangen, sonst steht man
    // mitten in den neuen Bildern.
    var head = document.querySelector(".work__filter") || workGrid;
    if (!head) return;
    head.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start"
    });
  }

  function goToPage(page) {
    var total = pageCount();
    page = Math.min(Math.max(page, 1), total);
    if (page === currentPage) return;
    currentPage = page;
    update({ scrollToTop: true });
  }

  filterChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      filterChips.forEach(function (c) {
        c.classList.remove("is-active");
        c.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("is-active");
      chip.setAttribute("aria-pressed", "true");

      activeFilter = chip.dataset.filter;
      currentPage = 1;   // ein neuer Filter beginnt wieder auf Seite eins
      update();
    });
  });

  // Ein Kategorie-Teaser verlinkt z. B. auf portfolio.html#business – der
  // passende Filter-Chip übernimmt das gleich beim Laden der Seite.
  if (workGrid && location.hash) {
    var hashFilter = location.hash.slice(1);
    var matchingChip = Array.prototype.filter.call(filterChips, function (chip) {
      return chip.dataset.filter === hashFilter;
    })[0];
    if (matchingChip) {
      filterChips.forEach(function (c) {
        c.classList.remove("is-active");
        c.setAttribute("aria-pressed", "false");
      });
      matchingChip.classList.add("is-active");
      matchingChip.setAttribute("aria-pressed", "true");
      activeFilter = hashFilter;
    }
  }

  if (workGrid) {
    renderGrid(true);
    renderPager();

    // Die zweite Seite liegt bereit, bevor jemand darauf klickt
    if ("IntersectionObserver" in window) {
      var aheadWatch = new IntersectionObserver(function (entries, obs) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        obs.disconnect();
        preloadAhead();
      }, { rootMargin: "300px 0px" });
      aheadWatch.observe(workGrid);
    }
  }

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxStage = document.getElementById("lightboxStage");
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

  /* Der Weg vom Rasterbild zum großen Bild ---------------------------------
     Das kleine Bild ist längst geladen. Es liefert Seitenverhältnis und eine
     unscharfe Vorschau, damit der Rahmen sofort steht und gefüllt ist, statt
     erst leer zu sein und dann zu springen. Ein Zähler sorgt dafür, dass ein
     spät eintreffendes Bild nicht ein inzwischen weitergeblättertes überschreibt. */
  var lightboxToken = 0;

  function showLightbox(card) {
    var token = ++lightboxToken;
    var thumb = card.querySelector("img");
    var full = card.getAttribute("href");

    lightboxCaption.textContent =
      (card.dataset.title || "") + " · " + (card.dataset.cat || "");

    if (lightboxStage) {
      lightboxStage.classList.remove("is-ready");
      // Nur ein fertig geladenes Rasterbild taugt als Vorschau – ein halb
      // aufgebautes würde im Rahmen sichtbar nachladen.
      var preview = isLoaded(thumb) ? (thumb.currentSrc || thumb.src) : "";
      lightboxStage.style.setProperty(
        "--lb-thumb",
        preview ? 'url("' + preview + '")' : "none"
      );
    }

    // Maße aus dem Rasterbild: gleiches Motiv, gleiches Seitenverhältnis
    if (thumb && thumb.naturalWidth) {
      lightboxImg.width = thumb.naturalWidth;
      lightboxImg.height = thumb.naturalHeight;
    } else {
      lightboxImg.removeAttribute("width");
      lightboxImg.removeAttribute("height");
    }

    lightboxImg.alt = card.dataset.title || "";

    var loader = new Image();
    loader.decoding = "async";

    function done() {
      if (token !== lightboxToken) return;   // längst ein anderes Bild im Rahmen
      lightboxImg.src = full;
      if (lightboxStage) lightboxStage.classList.add("is-ready");
      preloadNeighbours();
    }

    loader.addEventListener("load", done, { once: true });
    // Auch ein Fehlschlag muss den Spinner beenden – sonst dreht er ewig
    loader.addEventListener("error", done, { once: true });
    loader.src = full;

    // Bereits im Cache: dann gar nicht erst blenden lassen
    if (loader.complete) done();
  }

  function preloadNeighbours() {
    var list = currentGroup && currentGroup.length ? currentGroup : visibleCards();
    if (list.length < 2) return;
    [1, -1].forEach(function (dir) {
      var item = list[(currentIndex + dir + list.length) % list.length];
      var href = item && item.getAttribute("href");
      if (href) new Image().src = href;
    });
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

  /* Wischen am Telefon: die Pfeile sitzen in der Daumenzone, aber
     die naheliegende Geste soll trotzdem funktionieren. */
  var touchStartX = 0;
  var touchStartY = 0;
  var touching = false;

  lightbox.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { touching = false; return; }
    touching = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  lightbox.addEventListener("touchend", function (e) {
    if (!touching) return;
    touching = false;
    var touch = e.changedTouches[0];
    var dx = touch.clientX - touchStartX;
    var dy = touch.clientY - touchStartY;
    // Nur eindeutig waagerechte Gesten, sonst kollidiert es mit dem Scrollen
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    stepLightbox(dx < 0 ? 1 : -1);
  }, { passive: true });

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
      email: "Bitte prüfen Sie die E-Mail-Adresse, ohne sie kann ich nicht antworten.",
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
            status.textContent = "Das hat leider nicht geklappt. Bitte schreiben Sie mir direkt an henneberg883@icloud.com.";
          }
        })
        .catch(function () {
          status.textContent = "Das hat leider nicht geklappt. Bitte schreiben Sie mir direkt an henneberg883@icloud.com.";
        })
        .then(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
})();
