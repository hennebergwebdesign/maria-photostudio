<?xml version="1.0" encoding="UTF-8"?>
<!--
  Sitemap-Stylesheet – Maria Visuals
  Rendert sitemap.xml lesbar im Browser (Branding), ohne die Datei für
  Suchmaschinen zu verändern: Crawler ignorieren die xml-stylesheet-PI und
  lesen weiterhin die reinen <url>-Einträge. Reines XSLT 1.0 + externes CSS
  (kein Inline-<style>, keine Skripte) – kompatibel mit der bestehenden CSP
  (style-src/font-src 'self').
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>

  <xsl:template match="/">
    <html lang="de">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Sitemap · Maria Visuals</title>
        <meta name="robots" content="noindex, follow"/>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
        <link rel="stylesheet" href="/css/sitemap.css"/>
      </head>
      <body>
        <div class="sm-page">
          <header class="sm-head">
            <img class="sm-logo" src="/img/Maria-Visuals-Logo-1.png" alt="Maria Visuals" width="220" height="64"/>
            <h1>XML-Sitemap</h1>
            <p>
              Dies ist die maschinenlesbare Seitenübersicht für Suchmaschinen
              (<a href="https://www.sitemaps.org/de/protocol.html">sitemaps.org-Protokoll</a>).
              Menschen finden hier eine lesbare Übersicht aller
              <xsl:value-of select="count(s:urlset/s:url)"/> gelisteten Seiten.
            </p>
          </header>

          <main>
            <table class="sm-table">
              <thead>
                <tr>
                  <th scope="col">Adresse</th>
                  <th scope="col">Zuletzt geändert</th>
                  <th scope="col">Änderungsrhythmus</th>
                  <th scope="col">Priorität</th>
                  <th scope="col">Bilder</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="s:urlset/s:url">
                  <tr>
                    <td class="sm-loc" data-label="Adresse">
                      <a href="{s:loc}"><xsl:value-of select="s:loc"/></a>
                    </td>
                    <td data-label="Zuletzt geändert"><xsl:value-of select="s:lastmod"/></td>
                    <td data-label="Änderungsrhythmus"><xsl:value-of select="s:changefreq"/></td>
                    <td data-label="Priorität">
                      <span class="sm-prio">
                        <xsl:attribute name="class">
                          <xsl:text>sm-prio </xsl:text>
                          <xsl:choose>
                            <xsl:when test="number(s:priority) &gt;= 0.9">sm-prio--1</xsl:when>
                            <xsl:when test="number(s:priority) &gt;= 0.7">sm-prio--2</xsl:when>
                            <xsl:when test="number(s:priority) &gt;= 0.4">sm-prio--3</xsl:when>
                            <xsl:otherwise>sm-prio--4</xsl:otherwise>
                          </xsl:choose>
                        </xsl:attribute>
                        <xsl:value-of select="s:priority"/>
                      </span>
                    </td>
                    <td data-label="Bilder"><xsl:value-of select="count(image:image)"/></td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </main>

          <footer class="sm-foot">
            <p>Erzeugt für <a href="https://mariavisuals.de/">mariavisuals.de</a> · Fotografie &amp; Videografie von Maria Henneberg</p>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
