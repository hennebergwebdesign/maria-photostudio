# Maria Photostudio

One-Page-Website für Fotografie & Videografie in **48336 Sassenberg** (Kreis Warendorf, Münsterland).
Statisches HTML/CSS/JS ohne Build-Schritt – gehostet auf **Cloudflare Pages**.

---

## Deployment auf Cloudflare Pages

### Einstellungen im Cloudflare-Dashboard

Workers & Pages → **Create** → **Pages** → **Connect to Git** → Repo `maria-photostudio` wählen.

| Feld (EN / DE)                                     | Wert                             |
| -------------------------------------------------- | -------------------------------- |
| **Framework preset** / Framework-Voreinstellung     | **None** (kein Framework, statisches HTML) |
| **Build command** / Build-Befehl                    | *(leer lassen)* – alternativ `echo "static site"` |
| **Build output directory** / Build-Ausgabeverzeichnis | `/` (Repo-Root)                |
| **Root directory** / Stammverzeichnis               | `/` (leer lassen)                |
| **Production branch**                               | `main`                           |
| Node-Version / Umgebungsvariablen                   | nicht nötig                      |

> Kurzfassung für die Rückfrage „Framework und Build-Kommando?“:
> **Framework = None (Static HTML)**, **Build-Kommando = keins (Feld leer)**,
> **Output = `/`**. Es gibt keinen Bundler, kein npm, keine Abhängigkeiten – Cloudflare
> lädt die Dateien direkt aus dem Repo aufs CDN hoch.

### Alternative: Deploy per CLI (Wrangler)

```bash
npm install -g wrangler        # einmalig
wrangler login                 # einmalig, öffnet den Browser
wrangler pages deploy . --project-name=maria-photostudio --branch=main
```

`.` ist das Ausgabeverzeichnis (Repo-Root). Ein Build-Schritt entfällt.

### Nach dem ersten Deploy

1. **Custom Domain** verbinden: Pages-Projekt → *Custom domains* → `maria-photostudio.de`
   und `www.maria-photostudio.de` hinzufügen. Eine Variante als Hauptdomain festlegen
   und die andere per Cloudflare-**Redirect Rule** (301) darauf weiterleiten – sonst
   bewertet Google zwei identische Seiten (Duplicate Content).
2. **Domain überall eintragen**: die Platzhalter-Domain `https://www.maria-photostudio.de/`
   steht in `index.html` (Canonical, Open Graph, JSON-LD), `robots.txt` und `sitemap.xml`.
3. **Cloudflare-Optimierungen** (Dashboard → Speed / Caching):
   *Auto Minify*, *Brotli*, *Early Hints*, bei Pro-Plan zusätzlich *Polish (WebP)*.
4. **sitemap.xml** in der Google Search Console einreichen:
   `https://www.maria-photostudio.de/sitemap.xml`
5. **Google Unternehmensprofil** (früher Google My Business) für Sassenberg anlegen –
   für lokale Sichtbarkeit ist das der stärkste einzelne Hebel neben der Startseite.

### Hosting-Dateien im Repo

| Datei              | Zweck                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| `_headers`         | Security-Header (CSP, HSTS, nosniff …) und Cache-Zeiten pro Verzeichnis; die CSP erlaubt nur eigene Skripte, deshalb liegt GSAP unter `js/vendor/` |
| `_redirects`       | 301-Weiterleitungen (`/index.html` → `/`, alte Pfade auf Sprungmarken)  |
| `404.html`         | Eigene Fehlerseite im Seitendesign, `noindex`                          |
| `robots.txt`       | Freigabe für Suchmaschinen + Sitemap-Verweis                           |
| `sitemap.xml`      | URL- und Bild-Sitemap                                                  |
| `site.webmanifest` | App-Metadaten (Name, Farben, Icons)                                    |

---

## Aufbau der Seite

`index.html` – One-Pager in der Reihenfolge, in der ein Interessent Fragen stellt:

1. **Hero** – Keyword + Nutzenversprechen + zwei CTAs + Vertrauens-Zeile
2. **Warum ich** (`#warum`) – USP nach Formel *Ergebnis / Methode / Sicherheit*
3. **Portfolio** (`#portfolio`) – Filter + Lightbox
4. **Leistungen** (`#leistungen`) – 6 Leistungen, je mit konkretem Ergebnis
5. **Ablauf** (`#ablauf`) – 4 Schritte gegen den Einwand „Wie läuft das ab?“
6. **Über mich** (`#ueber-mich`) – lokale Verankerung in Sassenberg
7. **Einzugsgebiet** (`#einzugsgebiet`) – Orte im Umkreis (Local SEO)
8. **FAQ** (`#faq`) – 10 Fragen, die Einwände vorwegnehmen (Preis, Termin, Rechte …)
9. **Kontakt** (`#kontakt`) – NAP-Daten, Erreichbarkeit, Formular

- `css/style.css` – helles, bildzentriertes Design (Design-Tokens, siehe unten)
- `css/fonts.css` + `fonts/` – Manrope selbst gehostet (Variable Font)
- `js/main.js` – Zustand: Menü, Filter, Lightbox, Formular
- `js/animations.js` + `js/vendor/` – Bewegung mit GSAP, ScrollTrigger und Flip

### Eingangsanimation

Beim Laden blitzen mehrere Portfolio-Bilder im Vollbild schnell hintereinander auf.
Das letzte Bild skaliert herunter und gibt die Startseite frei. Die Sequenz ist
jederzeit überspringbar (Button, Klick, Escape, Scrollen) und bei aktivierter
Systemeinstellung „Bewegung reduzieren“ wird sie komplett ausgelassen.

---

## SEO & Copywriting – was umgesetzt ist

**Copywriting**

- Hauptkeyword **„Fotograf Sassenberg“** in H1, Titel, Beschreibung und Fließtext –
  ohne Keyword-Stuffing, in natürlichen Sätzen.
- USP nach der Formel **Ergebnis + Methode + Sicherheit** statt „beste Qualität“.
- Einwände (Preis, Termin, Lieferzeit, „ich bin unfotogen“, Nutzungsrechte, Wetter)
  werden auf der Seite beantwortet, nicht erst im Gespräch.
- Konkrete Zahlen statt Floskeln: 24 h Rückmeldung, 14 Tage bis zum Termin,
  10 Werktage Lieferzeit, 8–15 finale Motive, 50 km Umkreis.
- Jede Sektion endet mit einem Weg zum Kontakt (interne Verlinkung).

**Technisches OnPage-SEO**

- Meta-Titel **57 Zeichen** nach Formel `[Keyword] – [Benefit] | [Marke]`,
  Meta-Beschreibung **152 Zeichen** nach Formel `[Problem] + [3 Benefits ✓] + [CTA]`.
- Canonical, `robots`-Meta, Open Graph + Twitter Card mit eigenem 1200×630-Bild.
- Geo-Meta (`geo.region`, `geo.placename`, `geo.position`) für Sassenberg.
- **JSON-LD** als `@graph`: `ProfessionalService`/`LocalBusiness` (Adresse 48336 Sassenberg,
  Koordinaten, Öffnungszeiten, `areaServed`, Leistungskatalog), `WebSite`, `WebPage`
  und `FAQPage` mit allen 10 Fragen (Chance auf FAQ-Snippets in den Suchergebnissen).
- Saubere, sprechende Sprungmarken (`#portfolio`, `#ueber-mich`, `#einzugsgebiet` …);
  alte Anker (`#arbeiten`, `#ueber`) werden per JS umgeleitet, alte Pfade per 301.
- Eine H1, darunter eine saubere H2/H3-Hierarchie; `aria-labelledby` je Sektion.
- Alle Bilder mit beschreibendem `alt`-Text inkl. Ort, `width`/`height` gegen Layout-Sprünge,
  `loading="lazy"` außer beim ersten Bild (`fetchpriority="high"`).

**Performance / Core Web Vitals**

- Alle Fotos zusätzlich als **WebP** in zwei Größen, ausgeliefert über `<picture>` + `srcset`
  (JPEG bleibt als Fallback). Der Preloader lädt jetzt die 800-px-WebP-Varianten
  statt sechs Full-HD-JPEGs – das war der größte LCP-Bremsklotz.
- Schrift **selbst gehostet** statt Google Fonts: ein Request weniger, kein
  DSGVO-Risiko durch IP-Übertragung an Google, `preload` + `font-display: swap`.
- `defer` auf dem Skript, lange Cache-Zeiten über `_headers`.

**Barrierefreiheit**

- Sprunglink „Zum Inhalt springen“, sichtbarer Fokusrahmen, `aria-pressed` an den
  Filtern, Fokusrückgabe beim Schließen der Lightbox, Labels an allen Formularfeldern.

---

## Designsystem

Die Seite folgt den Regeln des Skills **UI/UX Pro Max** (installiert unter
`.claude/skills/`, siehe unten). Alle Werte kommen aus Tokens in `css/style.css`;
in den Komponenten stehen keine rohen Hex-Werte, Pixelgrößen oder Zeiten mehr.

| Token-Gruppe | Werte |
| --- | --- |
| Farben | `--bg` `--bg-soft` `--surface` `--line` `--line-strong` `--text` `--text-dim` `--accent` `--on-accent` `--sage` `--danger` `--scrim` |
| Typo | `--fs-label` 12 px · `--fs-sm` 14 px · `--fs-base` **16 px** · `--fs-lg` 18 px |
| Abstände | 4-pt-Raster: `--sp-1` … `--sp-16` |
| Radien | `--r-sm` 8 · `--r-md` 12 · `--r-lg` 16 · `--r-full` |
| Elevation | `--elev-1/2/3` – eine Schattenskala für Karten, Bilder, Overlays |
| Motion | `--dur-fast` 150 ms · `--dur` 220 ms · `--dur-slow` 320 ms · `--ease-out` für Eintritte (CSS-Mikrointeraktionen; Sequenzen laufen über GSAP) |
| Ebenen | `--z-nav` 100 · `--z-menu` 200 · `--z-lightbox` 500 · `--z-loader` 1000 · `--z-skip` 1100 |

**Was daraus folgte:**

- **Kontrast:** jedes Text/Hintergrund-Paar wurde nachgerechnet; nach dem
  Farbwechsel liegen alle über 4,5:1, Fließtext über 7:1 (Werte siehe Tabelle).
- **Touch-Ziele ≥ 44 px:** Navigationslinks, Filter-Chips, Fußzeilen- und
  Kontaktlinks, Burger, Lightbox-Buttons und Formularfelder (48 px).
- **Schriftgröße:** Fließtext durchgehend 16 px (vorher 13–15 px), Zeilenlänge
  auf 60–75 Zeichen begrenzt (`max-width` in `ch` statt `rem`).
- **Icons als SVG statt Textzeichen:** `▶ × ‹ › + ✓` sind durch ein
  Inline-Sprite im Lucide-Stil ersetzt (ein Strichgewicht, `currentColor`).
- **Motion:** Eintritte 400 ms mit `ease-out` und 40 ms Staffelung je Element
  statt 800 ms gleichzeitig; Druckfeedback (`:active { scale }`) auf allen
  Schaltflächen und Karten; `touch-action: manipulation` gegen die 300-ms-Verzögerung.
- **Intro ist überspringbar:** Button, Klick, Escape oder Scrollversuch beenden
  die Bildsequenz sofort; sie dauert maximal 4 s statt 6 s.
- **Navigation:** aktiver Abschnitt wird markiert (Scroll-Spy), `scroll-margin-top`
  verhindert, dass Sprungziele unter der fixierten Kopfzeile landen.
- **Formular:** Fehlermeldungen stehen am Feld (`role="alert"`, `aria-invalid`),
  Prüfung beim Verlassen des Feldes statt bei jedem Tastendruck, Pflichtfelder
  markiert, Fokus springt zum ersten Fehler.
- **Breakpoints:** systematisch 1440 / 1024 / 768 / 480. Ab 1024 px Overlay-Menü,
  ab 768 px einspaltig, auf Mobil wandern die Lightbox-Pfeile in die Daumenzone.

Die Seite ist bewusst auf einen hellen, warmen Look festgelegt – es gibt
daher keine Dark-Mode-Variante.

### Farbwelt

Die Palette orientiert sich am Model-Aushang (warme Creme-, Blush- und
Terrakotta-Töne, Weiß für die Polaroid-Kanten, das Grün der Wiese als
dekorativer Zweitton). Die Seite ist damit hell statt dunkel:

| Rolle | Wert | Kontrast |
| --- | --- | --- |
| `--bg` Creme | `#fcf6f0` | – |
| `--bg-soft` Blush | `#f4e5dc` | – |
| `--surface` Karten | `#ffffff` | – |
| `--text` Dunkelbraun | `#45352f` | 10.9:1 |
| `--text-dim` | `#645047` | 7.0:1 |
| `--accent` Terrakotta | `#9c5049` | 5.4:1 |
| `--on-accent` | `#fffaf6` | 5.7:1 auf `--accent` |
| `--sage` (nur Dekor) | `#6e7f5c` | – |

Fotos brauchen weiterhin einen dunklen Verlauf, damit die Bildunterschrift
lesbar bleibt – dafür gibt es `--scrim` und `--on-scrim`.

### Bewegung (GSAP)

GSAP 3.15 liegt selbst gehostet unter `js/vendor/` – die CSP in `_headers`
erlaubt nur `script-src 'self'`, ein CDN wäre blockiert. `js/animations.js`
enthält ausschließlich Motion, `js/main.js` nur Zustand und Bedienung; beide
sprechen über CustomEvents (`maria:filter`, `maria:lightbox-open`, …)
miteinander. Läuft GSAP nicht, greifen die CSS-Fallbacks.

| Element | Animation |
| --- | --- |
| Intro | Timeline statt `setTimeout`-Kette; Überspringen beschleunigt die Timeline (`timeScale`), statt sie abzuschneiden |
| Hero | Zeilen laufen aus der Maske ein, danach gestaffelt Text, Buttons, Vertrauenszeile |
| Abschnitte | `ScrollTrigger.batch()` blendet je Sichtbarkeits-Gruppe gestaffelt ein |
| Portfolio | leichter Parallax im Bildausschnitt (nur ab 769 px) |
| Kennzahlen | zählen beim Erscheinen hoch |
| Laufband | Tempo und Richtung folgen der Scrollgeschwindigkeit, Hover bremst |
| Filter | `Flip` sortiert das Raster um, die Rasterhöhe wird mitanimiert |
| Lightbox | wächst aus der angeklickten Karte heraus |
| FAQ | Höhe wird weich auf- und zugeklappt |
| Mobilmenü | Links laufen gestaffelt ein |

`prefers-reduced-motion` läuft über `gsap.matchMedia()`. Wichtig dabei: die
Bedingungen müssen so gewählt sein, dass **immer** eine zutrifft – sonst wird
der Handler nie ausgeführt. Deshalb stehen `reduce` und `no-preference` beide
in der Abfrage. Interaktionen, die `document`-Listener registrieren, liegen
außerhalb von `matchMedia`, sonst gäbe es nach jedem Breakpoint-Wechsel
doppelte Handler.

Die GSAP-Skills liegen unter `.claude/skills/gsap-*`:

```bash
npx skills add https://github.com/greensock/gsap-skills
```

### Der Skill im Projekt

```bash
npx ui-ux-pro-max-cli init --ai claude     # installiert nach .claude/skills/
```

Der Ordner `.claude/` ist reines Werkzeug und gehört nicht zur Website;
`_redirects` liefert für `/.claude/*` eine 404 aus. Nachschlagen lässt sich
darin z. B. so:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "photography portfolio" --design-system
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "touch target" --domain ux
```

---

## Vor dem Livegang ersetzen

- **Bilder**: alle Dateien in `img/` sind Platzhalter. Eigene Fotos in gleicher Größe
  ablegen und die WebP-Varianten neu erzeugen (siehe unten). Auch
  `img/og-maria-photostudio.jpg` (1200×630) durch ein echtes Motiv ersetzen.
- **Portfolio-Texte**: die sechs Projekttitel sind Beispiele – durch echte Referenzen
  ersetzen (Titel, `data-title`, `data-cat` und `alt` konsistent halten).
- **Kontaktdaten**: E-Mail, Telefon und **Straße + Hausnummer** in `index.html`
  (Sektion „Kontakt“ **und** im JSON-LD, Feld `address`) sowie die mailto-Adresse in
  `js/main.js`. Die Daten müssen überall identisch sein (NAP-Konsistenz) – auch im
  Google-Unternehmensprofil.
- **Domain**: `https://www.maria-photostudio.de/` in `index.html`, `robots.txt`, `sitemap.xml`.
- **Impressum / Datenschutz**: Footer-Links auf echte Seiten führen (in Deutschland Pflicht).
- **Social-Links**: Instagram/YouTube im Footer, danach als `sameAs` ins JSON-LD aufnehmen.
- **Preise**: falls Startpreise genannt werden sollen, in die FAQ-Antwort „Was kostet ein
  Shooting?“ und in die Leistungen aufnehmen – das filtert Anfragen vor.

### Bildvarianten neu erzeugen

```bash
pip install pillow
python3 - <<'EOF'
from PIL import Image
import glob, os
for p in glob.glob('img/*.jpg'):
    if '-800' in p: continue
    base = os.path.splitext(os.path.basename(p))[0]
    im = Image.open(p).convert('RGB'); w, h = im.size
    im.save(f'img/{base}.webp', 'WEBP', quality=70, method=6)
    small = im.resize((w//2, h//2), Image.LANCZOS)
    small.save(f'img/{base}-800.webp', 'WEBP', quality=76, method=6)
    small.save(f'img/{base}-800.jpg', 'JPEG', quality=80, optimize=True, progressive=True)
EOF
```

---

## Lokal starten

```bash
python3 -m http.server 8000
# http://localhost:8000
```

`_headers` und `_redirects` wirken nur auf Cloudflare Pages, nicht im lokalen Server.
