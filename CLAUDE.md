# CLAUDE.md – Maria Visuals

Website für Fotografie und Videografie von Maria Henneberg in 48336 Sassenberg.
Statisches HTML/CSS/JS ohne Build-Schritt, gehostet auf Cloudflare Pages (Production Branch `main`).
Ausführliche Doku zu Deployment, Struktur und Animationen steht in `README.md`.

## Struktur

`index.html` Startseite (One-Pager)
`portfolio.html` Portfolio mit Filter und Lightbox
`impressum.html`, `datenschutz.html` Rechtstexte
`404.html` Fehlerseite
`css/style.css` Styles (`style.min.css` ist die ausgelieferte Fassung)
`js/main.js` Zustand und Bedienung, `js/animations.js` GSAP Motion, `js/consent.js` Cookie Banner
`functions/api` Cloudflare Pages Functions (Kontaktformular)
`_headers`, `_redirects` Security Header, Caching, Weiterleitungen

## Rechtlicher Stand (Impressum)

Maria hat noch kein Gewerbe angemeldet und keine Umsatzsteuer-Identifikationsnummer.
Im Impressum steht deshalb: „Eine Umsatzsteuer-Identifikationsnummer nach § 27a UStG ist derzeit nicht vergeben.“
Die persönliche Steuer-ID (Identifikationsnummer nach § 139b AO) wird bewusst NICHT veröffentlicht,
sie ist keine Pflichtangabe und darf nicht ins Repo oder auf die Website.
Sobald eine USt-IdNr. oder Wirtschafts-Identifikationsnummer vergeben ist, den Abschnitt „Umsatzsteuer“ in `impressum.html` anpassen.

## Konventionen

Texte auf Deutsch, Sie-Ansprache.
Neue Skripte nur lokal einbinden (CSP erlaubt keine externen Skripte).
Nach CSS Änderungen `style.min.css` mit aktualisieren.
