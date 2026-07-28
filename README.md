# Maria Photostudio

Portfolio-Website für Fotografie & Videografie.

## Aufbau

- `index.html` – One-Page-Layout: Hero, Portfolio (mit Filter & Lightbox), Leistungen, Über mich, Kontakt
- `css/style.css` – Dunkles, bildzentriertes Design
- `js/main.js` – Eingangsanimation (Bild-Flash-Sequenz), Scroll-Reveals, Portfolio-Filter, Lightbox, Kontaktformular

## Eingangsanimation

Beim Laden blitzen mehrere Portfolio-Bilder im Vollbild schnell hintereinander auf.
Das letzte Bild skaliert anschließend herunter und gibt die Startseite frei.
Bei aktivierter Systemeinstellung „Bewegung reduzieren“ wird die Animation übersprungen.

## Platzhalter ersetzen

- **Bilder**: Alle Bilder laden aktuell von `picsum.photos` (Platzhalter). Vor dem Livegang durch eigene Fotos ersetzen (Pfade in `index.html`).
- **Kontaktdaten**: E-Mail, Telefon und Adresse in `index.html` (Sektion „Kontakt“) und die mailto-Adresse in `js/main.js` anpassen.
- **Impressum / Datenschutz**: Links im Footer mit echten Seiten verknüpfen.

## Lokal starten

Einfach `index.html` im Browser öffnen oder z. B.:

```bash
python3 -m http.server 8000
```
