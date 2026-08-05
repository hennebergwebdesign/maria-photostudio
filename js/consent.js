/* ============================================================
   Maria Visuals — Cookie- & Consent-Management

   Zweck dieser Datei:
   - Setzt den Google-Consent-Mode-v2-Default (alles "denied"), noch bevor
     irgendein anderes Skript ausgeführt wird.
   - Zeigt einen Cookie-Banner (1. Ebene) und einen Einstellungen-Dialog
     (2. Ebene) passend zum bestehenden Corporate Design.
   - Speichert die Entscheidung datensparsam in localStorage.
   - Stellt ein sticky Widget bereit, über das die Auswahl jederzeit
     erneut geöffnet werden kann (zusätzlich zum Footer-Link).
   - Stellt eine kleine, wiederverwendbare API bereit, über die künftige
     Drittanbieter-Skripte/-Embeds (Google Analytics, Google Ads, Google
     Maps, Calendly, ein WhatsApp-Widget o. ä.) an die jeweilige
     Consent-Kategorie gekoppelt werden können ("Prior Blocking").

   WICHTIG: Aktuell sind in dieser Codebasis keine dieser Drittanbieter
   tatsächlich eingebunden (kein GTM, keine GA-Messungs-ID, kein Maps-
   Embed, kein Calendly-Embed, kein WhatsApp-Skript). Die Kategorien
   "Funktional", "Statistik und Analyse", "Marketing" und "Externe
   Medien" sind deshalb bewusst mit leeren Diensteliste hinterlegt und
   entsprechend gekennzeichnet. Sobald ein echter Dienst hinzukommt,
   MUSS er hier in CONFIG.categories UND in der Datenschutzerklärung
   ergänzt werden – siehe Kommentare "MANUELL PRÜFEN".
   ============================================================ */

/* ---------- Google Consent Mode v2: Default so früh wie möglich ----------
   Dieser Block läuft synchron beim Parsen dieser Datei, also bevor der
   Rest der Seite (und ein künftiger GTM-Snippet) geladen wird. Der
   Default-Status ist "denied" für alle vier Signale, bis eine aktive
   Entscheidung vorliegt. Ohne geladenen Google Tag Manager bleibt dieser
   Aufruf folgenlos (dataLayer.push landet nur in einem Array) – er ist
   aber Voraussetzung dafür, dass ein später ergänzter GTM-Container den
   Consent-Status von Anfang an korrekt vorfindet. */
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
window.gtag = window.gtag || gtag;

gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  wait_for_update: 500
});

(function () {
  "use strict";

  /* ============================================================
     Zentrale Konfiguration
     ============================================================ */
  var CONFIG = {
    // Bei inhaltlichen Änderungen an Kategorien/Diensten/Texten erhöhen –
    // löst automatisch ein erneutes Einholen der Einwilligung aus.
    version: "2026.07.30-1",
    storageKey: "mv_consent_v1",
    // MANUELL PRÜFEN (Rechtsberatung): 180 Tage als konservativer
    // Standardwert; ggf. an interne Vorgaben anpassen.
    maxAgeDays: 180,
    language: "de",
    privacyUrl: "/datenschutz.html",
    imprintUrl: "/impressum.html",

    categories: [
      {
        id: "necessary",
        name: "Technisch notwendig",
        required: true,
        description:
          "Erforderlich, damit die Website sicher und wie gewünscht funktioniert. " +
          "Diese Kategorie kann nicht deaktiviert werden.",
        services: [
          {
            name: "Cookie-Einwilligung (Consent-Speicher)",
            provider: "Maria Visuals (eigene Domain, kein Drittanbieter)",
            purpose:
              "Speichert, welche Cookie-Kategorien Sie ausgewählt haben, damit " +
              "der Banner nicht bei jedem Besuch erneut erscheint.",
            storage: "localStorage-Eintrag „mv_consent_v1“",
            duration: "180 Tage bzw. bis zum Widerruf",
            transfer: "Keine Übermittlung an Dritte",
            thirdCountry: "Keine",
            legalBasis:
              "Technisch erforderlich, § 25 Abs. 2 Nr. 2 TDDDG / Art. 6 Abs. 1 lit. f DSGVO"
          }
        ]
      },
      {
        id: "functional",
        name: "Funktionale Dienste",
        required: false,
        description:
          "Ermöglichen Komfortfunktionen, die über die reine Darstellung der " +
          "Seite hinausgehen, zum Beispiel eine aktiv aufgerufene " +
          "Terminbuchung oder ein Chat-Widget.",
        // MANUELL PRÜFEN: Aktuell kein Dienst dieser Kategorie in der
        // Codebasis gefunden (kein Calendly-Embed, kein WhatsApp-Widget-
        // Skript). Ein reiner wa.me-Link zählt NICHT hierher, siehe
        // README-Hinweis unten zu WhatsApp.
        services: []
      },
      {
        id: "statistics",
        name: "Statistik und Analyse",
        required: false,
        description:
          "Helfen zu verstehen, wie die Website genutzt wird, um sie zu " +
          "verbessern, zum Beispiel mit Google Analytics.",
        // MANUELL PRÜFEN: Aktuell keine Analyse-/Statistik-Dienste in der
        // Codebasis gefunden (kein gtag.js, kein GTM-Container).
        services: []
      },
      {
        id: "marketing",
        name: "Marketing",
        required: false,
        description:
          "Werden genutzt, um Besucherinnen und Besuchern relevante Werbung " +
          "zu zeigen und deren Wirkung zu messen, zum Beispiel Google Ads " +
          "Conversion-Tracking oder Remarketing.",
        // MANUELL PRÜFEN: Aktuell keine Marketing-/Werbe-Tags in der
        // Codebasis gefunden.
        services: []
      },
      {
        id: "media",
        name: "Externe Medien",
        required: false,
        description:
          "Binden externe Inhalte ein, die eine Verbindung zu Servern von " +
          "Drittanbietern herstellen, zum Beispiel eine eingebettete " +
          "Google-Maps-Karte oder ein Calendly-Terminkalender.",
        // MANUELL PRÜFEN: Adobe Fonts/Typekit ("The Seasons", Überschriften)
        // wird bewusst NICHT über diese Consent-Kategorie gesteuert, sondern
        // lädt direkt aus <head> von index.html bei jedem Seitenaufruf –
        // siehe Datenschutzerklärung Abschnitt 4 statt hier.
        services: []
      }
    ]
  };

  // Kategorie → Google-Consent-Mode-v2-Signal. Nur "statistics" und
  // "marketing" haben eine Google-Entsprechung; "functional" und "media"
  // steuern eigene (nicht-Google-)Einbettungen über die API unten.
  var GOOGLE_SIGNAL_MAP = {
    statistics: ["analytics_storage"],
    marketing: ["ad_storage", "ad_user_data", "ad_personalization"]
  };

  var doc = document;
  var body = doc.body;

  /* ============================================================
     Speicherung
     ============================================================ */
  function emptyDecision() {
    var categories = {};
    CONFIG.categories.forEach(function (cat) {
      categories[cat.id] = !!cat.required;
    });
    return {
      version: CONFIG.version,
      language: CONFIG.language,
      timestamp: null,
      expiresAt: null,
      categories: categories
    };
  }

  function readStoredDecision() {
    try {
      var raw = window.localStorage.getItem(CONFIG.storageKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.categories) return null;
      return parsed;
    } catch (e) {
      // localStorage nicht verfügbar (z. B. strenger privater Modus) –
      // Banner wird dann bei jedem Aufruf erneut gezeigt.
      return null;
    }
  }

  function writeStoredDecision(decision) {
    try {
      window.localStorage.setItem(CONFIG.storageKey, JSON.stringify(decision));
    } catch (e) {
      // Speichern nicht möglich – Entscheidung gilt nur für die aktuelle
      // Sitzung (im Speicher), das Banner erscheint beim nächsten Aufruf
      // erneut. Kein Blocker für die restliche Funktion.
    }
  }

  function clearStoredDecision() {
    try {
      window.localStorage.removeItem(CONFIG.storageKey);
    } catch (e) { /* siehe oben */ }
  }

  function decisionIsValid(decision) {
    if (!decision || !decision.timestamp || !decision.expiresAt) return false;
    if (decision.version !== CONFIG.version) return false;
    if (Date.now() > decision.expiresAt) return false;
    return true;
  }

  /* ============================================================
     Aktueller Zustand
     ============================================================ */
  var stored = readStoredDecision();
  var current = decisionIsValid(stored) ? stored : emptyDecision();
  var changeListeners = [];

  function pushGoogleConsent(categories) {
    var update = {};
    Object.keys(GOOGLE_SIGNAL_MAP).forEach(function (categoryId) {
      var granted = !!categories[categoryId];
      GOOGLE_SIGNAL_MAP[categoryId].forEach(function (signal) {
        update[signal] = granted ? "granted" : "denied";
      });
    });
    gtag("consent", "update", update);
  }

  function notifyChange() {
    changeListeners.forEach(function (fn) {
      try { fn(current); } catch (e) { /* ein fehlerhafter Listener darf die anderen nicht stoppen */ }
    });
  }

  // Bereits gespeicherte, gültige Entscheidung sofort an Google Consent
  // Mode melden (auch ohne dass der Nutzer in dieser Sitzung etwas tut).
  if (decisionIsValid(stored)) {
    pushGoogleConsent(current.categories);
  }

  function applyDecision(categories) {
    var previous = current;
    var next = {
      version: CONFIG.version,
      language: CONFIG.language,
      timestamp: Date.now(),
      expiresAt: Date.now() + CONFIG.maxAgeDays * 24 * 60 * 60 * 1000,
      categories: {}
    };
    CONFIG.categories.forEach(function (cat) {
      next.categories[cat.id] = cat.required ? true : !!categories[cat.id];
    });

    current = next;
    writeStoredDecision(next);
    pushGoogleConsent(next.categories);
    notifyChange();

    // Widerruf: Wenn eine zuvor aktive optionale Kategorie jetzt
    // deaktiviert wurde, kann ein bereits im Speicher initialisierter
    // Drittanbieter-Zustand (z. B. ein einmal geladenes Skript) nicht
    // zuverlässig "zurückgerufen" werden. In diesem Fall laden wir die
    // Seite kontrolliert neu, damit nichts Deaktiviertes weiterläuft.
    var previousDecided = previous && previous.timestamp;
    if (previousDecided) {
      var revoked = CONFIG.categories.some(function (cat) {
        return !cat.required && previous.categories[cat.id] && !next.categories[cat.id];
      });
      if (revoked) {
        window.setTimeout(function () { window.location.reload(); }, 50);
      }
    }
  }

  function needsBanner() {
    return !decisionIsValid(readStoredDecision());
  }

  /* ============================================================
     Kleine HTML-Hilfsfunktion (nur für unsere eigenen, statischen
     Konfigurationstexte – niemals für Nutzereingaben verwenden)
     ============================================================ */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ============================================================
     DOM: Banner (1. Ebene) – nicht-modale Leiste, Seite bleibt bedienbar
     ============================================================ */
  var banner, modal, widget;
  var lastFocused = null;

  function renderServiceList(services) {
    if (!services.length) {
      return (
        '<p class="cookie-category__empty">' +
        "Aktuell sind in dieser Kategorie keine Dienste eingebunden. " +
        "Sobald ein Dienst ergänzt wird, wird er hier mit Anbieter, Zweck, " +
        "Speicherdauer und Datenschutzlink aufgeführt." +
        "</p>"
      );
    }
    return services
      .map(function (svc) {
        return (
          '<dl class="cookie-service">' +
          "<div><dt>Name</dt><dd>" + escapeHtml(svc.name) + "</dd></div>" +
          "<div><dt>Anbieter</dt><dd>" + escapeHtml(svc.provider) + "</dd></div>" +
          "<div><dt>Zweck</dt><dd>" + escapeHtml(svc.purpose) + "</dd></div>" +
          "<div><dt>Speicherung</dt><dd>" + escapeHtml(svc.storage) + "</dd></div>" +
          "<div><dt>Speicherdauer</dt><dd>" + escapeHtml(svc.duration) + "</dd></div>" +
          "<div><dt>Datenübermittlung</dt><dd>" + escapeHtml(svc.transfer) + "</dd></div>" +
          "<div><dt>Drittlandübermittlung</dt><dd>" + escapeHtml(svc.thirdCountry) + "</dd></div>" +
          "<div><dt>Rechtsgrundlage</dt><dd>" + escapeHtml(svc.legalBasis) + "</dd></div>" +
          "</dl>"
        );
      })
      .join("");
  }

  function renderCategory(cat) {
    var checked = current.categories[cat.id] ? " checked" : "";
    var disabled = cat.required ? " disabled" : "";
    return (
      '<div class="cookie-category" data-category="' + cat.id + '">' +
      '<div class="cookie-category__head">' +
      "<h3>" + escapeHtml(cat.name) + (cat.required ? ' <span class="cookie-category__badge">immer aktiv</span>' : "") + "</h3>" +
      '<label class="cookie-switch">' +
      '<input type="checkbox" data-category-toggle="' + cat.id + '"' + checked + disabled + ">" +
      '<span class="cookie-switch__track" aria-hidden="true"></span>' +
      '<span class="sr-only">' + escapeHtml(cat.name) + (cat.required ? " (immer aktiv)" : " aktivieren") + "</span>" +
      "</label>" +
      "</div>" +
      "<p class=\"cookie-category__desc\">" + escapeHtml(cat.description) + "</p>" +
      "<details class=\"cookie-category__details\">" +
      "<summary>Details zu dieser Kategorie</summary>" +
      renderServiceList(cat.services) +
      "</details>" +
      "</div>"
    );
  }

  function buildBanner() {
    var el = doc.createElement("div");
    el.id = "cookieBanner";
    el.className = "cookie-banner";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Cookie-Hinweis");
    el.hidden = true;
    el.innerHTML =
      '<div class="cookie-banner__inner">' +
      '<div class="cookie-banner__text">' +
      '<p class="cookie-banner__title">Wir respektieren Ihre Privatsphäre</p>' +
      "<p>Diese Website nutzt nur technisch notwendige Funktionen von " +
      "der eigenen Domain. Optionale Kategorien (z. B. für künftige " +
      "Statistik-, Marketing- oder Medien-Einbindungen) sind so lange " +
      "deaktiviert, bis Sie ihnen aktiv zustimmen. Mehr dazu in der " +
      '<a href="' + CONFIG.privacyUrl + '">Datenschutzerklärung</a> und im ' +
      '<a href="' + CONFIG.imprintUrl + '">Impressum</a>.</p>' +
      "</div>" +
      '<div class="cookie-banner__actions">' +
      '<button type="button" class="btn btn--ghost" data-consent-action="open-settings">Einstellungen</button>' +
      '<button type="button" class="btn btn--ghost" data-consent-action="reject-all">Alle ablehnen</button>' +
      '<button type="button" class="btn btn--primary" data-consent-action="accept-all">Alle akzeptieren</button>' +
      "</div>" +
      "</div>";
    body.appendChild(el);
    return el;
  }

  function buildModal() {
    var el = doc.createElement("div");
    el.id = "cookieModal";
    el.className = "cookie-modal";
    el.hidden = true;
    el.innerHTML =
      '<div class="cookie-modal__backdrop" data-consent-action="dismiss"></div>' +
      '<div class="cookie-modal__dialog" role="dialog" aria-modal="true" ' +
      'aria-labelledby="cookieModalTitle" aria-describedby="cookieModalDesc">' +
      '<div class="cookie-modal__header">' +
      '<h2 id="cookieModalTitle">Cookie-Einstellungen</h2>' +
      '<button type="button" class="cookie-modal__close" data-consent-action="dismiss" aria-label="Dialog schließen">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      "</button>" +
      "</div>" +
      '<div class="cookie-modal__body">' +
      '<p id="cookieModalDesc">' +
      "Wählen Sie aus, welche Kategorien Sie zulassen möchten. „Technisch " +
      "notwendig“ ist immer aktiv, alle anderen Kategorien sind bis zu " +
      "Ihrer Zustimmung deaktiviert. Ihre Auswahl können Sie jederzeit über " +
      "den Link „Cookie-Einstellungen“ im Footer oder über das Symbol " +
      "unten rechts wieder ändern." +
      "</p>" +
      '<div class="cookie-modal__categories">' +
      CONFIG.categories.map(renderCategory).join("") +
      "</div>" +
      "</div>" +
      '<div class="cookie-modal__footer">' +
      '<button type="button" class="btn btn--ghost" data-consent-action="reject-all">Alle ablehnen</button>' +
      '<button type="button" class="btn btn--ghost" data-consent-action="accept-all">Alle akzeptieren</button>' +
      '<button type="button" class="btn btn--primary" data-consent-action="save-settings">Auswahl speichern</button>' +
      "</div>" +
      "</div>";
    body.appendChild(el);
    return el;
  }

  function buildWidget() {
    var el = doc.createElement("button");
    el.type = "button";
    el.id = "cookieWidget";
    el.className = "cookie-widget";
    el.setAttribute("aria-label", "Cookie-Einstellungen öffnen");
    el.setAttribute("data-consent-action", "open-settings");
    el.hidden = true;
    el.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 3a9 9 0 1 0 9 9c0-.5-.04-1-.11-1.47a3 3 0 0 1-3.89-3.89A9 9 0 0 0 12 3Z"/>' +
      '<circle cx="8.5" cy="10.5" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="15.5" cy="9" r="1"/>' +
      "</svg>";
    body.appendChild(el);
    return el;
  }

  /* ============================================================
     Fokus-Handling (Dialog: Fokusfalle, Rückgabe an Auslöser)
     ============================================================ */
  function focusableIn(container) {
    return Array.prototype.slice.call(
      container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function trapFocus(e, container) {
    if (e.key !== "Tab") return;
    var focusable = focusableIn(container);
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && doc.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && doc.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ============================================================
     Öffnen/Schließen
     ============================================================ */
  function refreshModalState() {
    CONFIG.categories.forEach(function (cat) {
      if (cat.required) return;
      var input = modal.querySelector('[data-category-toggle="' + cat.id + '"]');
      if (input) input.checked = !!current.categories[cat.id];
    });
  }

  function showBanner() {
    if (!needsBanner()) return;
    banner.hidden = false;
    widget.hidden = true;
  }

  function hideBanner() {
    banner.hidden = true;
    widget.hidden = false;
  }

  function openModal() {
    refreshModalState();
    lastFocused = doc.activeElement;
    modal.hidden = false;
    body.classList.add("is-locked");
    var dialog = modal.querySelector(".cookie-modal__dialog");
    var focusable = focusableIn(dialog);
    if (focusable.length) focusable[0].focus();
  }

  function closeModal() {
    modal.hidden = true;
    body.classList.remove("is-locked");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    // Wenn noch keine gültige Entscheidung vorliegt, bleibt der Banner
    // sichtbar – das Schließen des Dialogs allein zählt nicht als
    // Entscheidung und aktiviert keine Kategorie.
    if (needsBanner()) showBanner();
  }

  function readCheckedCategories() {
    var categories = {};
    CONFIG.categories.forEach(function (cat) {
      if (cat.required) { categories[cat.id] = true; return; }
      var input = modal.querySelector('[data-category-toggle="' + cat.id + '"]');
      categories[cat.id] = input ? input.checked : false;
    });
    return categories;
  }

  function allCategories(value) {
    var categories = {};
    CONFIG.categories.forEach(function (cat) {
      categories[cat.id] = cat.required ? true : value;
    });
    return categories;
  }

  function handleAction(action) {
    if (action === "accept-all") {
      applyDecision(allCategories(true));
      closeModal();
      hideBanner();
    } else if (action === "reject-all") {
      applyDecision(allCategories(false));
      closeModal();
      hideBanner();
    } else if (action === "open-settings") {
      openModal();
    } else if (action === "save-settings") {
      applyDecision(readCheckedCategories());
      closeModal();
      hideBanner();
    } else if (action === "dismiss") {
      closeModal();
    }
  }

  /* ============================================================
     Initialisierung
     ============================================================ */
  function init() {
    banner = buildBanner();
    modal = buildModal();
    widget = buildWidget();

    doc.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-consent-action], [data-cookie-settings]");
      if (!trigger) return;
      e.preventDefault();
      var action = trigger.getAttribute("data-consent-action") || "open-settings";
      handleAction(action);
    });

    doc.addEventListener("keydown", function (e) {
      if (!modal || modal.hidden) return;
      if (e.key === "Escape") {
        closeModal();
        return;
      }
      trapFocus(e, modal.querySelector(".cookie-modal__dialog"));
    });

    if (needsBanner()) {
      showBanner();
    } else {
      widget.hidden = false;
    }
  }

  if (doc.body) {
    init();
  } else {
    doc.addEventListener("DOMContentLoaded", init);
  }

  /* ============================================================
     Öffentliche API – für künftige, echte Drittanbieter-Einbindungen.
     Aktuell ruft niemand diese Funktionen auf (keine Dienste vorhanden);
     sie stehen bereit, sobald z. B. Google Analytics, Google Maps,
     Calendly oder ein WhatsApp-Widget tatsächlich ergänzt werden.
     ============================================================ */
  window.ConsentManager = {
    // Aktuellen Zustand einer Kategorie abfragen, z. B. vor dem Rendern
    // eines Karten-Embeds: ConsentManager.hasConsent('media')
    hasConsent: function (categoryId) {
      return !!(current.categories && current.categories[categoryId]);
    },

    // Gesamten (kopierten) Consent-Zustand lesen.
    getConsent: function () {
      return JSON.parse(JSON.stringify(current));
    },

    // Wird bei jeder Änderung (Zustimmung, Ablehnung, Widerruf) aufgerufen.
    onConsentChange: function (fn) {
      if (typeof fn === "function") changeListeners.push(fn);
    },

    // Lädt ein Skript nur, wenn die Kategorie aktuell zugestimmt ist, und
    // registriert es andernfalls dafür, dass es automatisch nachgeladen
    // wird, sobald die Zustimmung erfolgt (kein Neuladen der Seite nötig).
    // Beispiel für eine künftige GA4-Einbindung:
    //   ConsentManager.loadScript({
    //     category: "statistics",
    //     src: "https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX",
    //     id: "ga4-script"
    //   });
    loadScript: function (opts) {
      if (!opts || !opts.src || !opts.category) return;
      var alreadyLoaded = opts.id && doc.getElementById(opts.id);
      function load() {
        if (alreadyLoaded || (opts.id && doc.getElementById(opts.id))) return;
        var script = doc.createElement("script");
        script.src = opts.src;
        script.async = true;
        if (opts.id) script.id = opts.id;
        if (typeof opts.onload === "function") script.onload = opts.onload;
        doc.head.appendChild(script);
      }
      if (window.ConsentManager.hasConsent(opts.category)) {
        load();
      } else {
        window.ConsentManager.onConsentChange(function () {
          if (window.ConsentManager.hasConsent(opts.category)) load();
        });
      }
    },

    // Öffnet den Einstellungen-Dialog programmatisch, z. B. aus einem
    // eigenen "Termin über Calendly buchen"-Platzhalter-Button heraus.
    openSettings: function () { handleAction("open-settings"); }
  };
})();
