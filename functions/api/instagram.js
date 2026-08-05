// Cloudflare Pages Function: /api/instagram
// Liefert die letzten Instagram-Beiträge für das Feed-Widget auf der
// Startseite. Ruft dazu die Instagram Graph API serverseitig auf, damit
// das Access-Token nie an den Browser gelangt.
//
// Benötigte Umgebungsvariablen (Cloudflare Pages → Settings → Environment
// variables, als "Secret" anlegen):
//   INSTAGRAM_ACCESS_TOKEN – Long-Lived Access Token eines mit einem
//     Instagram-Business-/Creator-Konto verknüpften Meta-App-Zugangs.
//
// MANUELL PRÜFEN: Instagram/Meta ändert die API-Details gelegentlich.
// Vor dem Livegang in der aktuellen Meta-for-Developers-Dokumentation
// (Instagram-API mit Instagram-Login) verifizieren, dass Endpoint,
// Feldnamen und Token-Erneuerung (Long-Lived Tokens laufen nach 60 Tagen
// ab und müssen regelmäßig erneuert werden) noch aktuell sind.

const FIELDS = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
const LIMIT = 6;

function jsonResponse(body, status, cacheSeconds) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheSeconds
        ? `public, max-age=${cacheSeconds}`
        : "no-store",
    },
  });
}

export async function onRequestGet({ env }) {
  const token = env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return jsonResponse({ ok: false, error: "not_configured", posts: [] }, 200, 300);
  }

  const url =
    `https://graph.instagram.com/me/media?fields=${FIELDS}&limit=${LIMIT}` +
    `&access_token=${encodeURIComponent(token)}`;

  let resp;
  try {
    resp = await fetch(url);
  } catch {
    return jsonResponse({ ok: false, error: "fetch_failed", posts: [] }, 200, 300);
  }

  if (!resp.ok) {
    return jsonResponse({ ok: false, error: "api_error", posts: [] }, 200, 300);
  }

  const data = await resp.json().catch(() => null);
  const items = Array.isArray(data && data.data) ? data.data : [];

  const posts = items
    .filter((item) => item.media_type !== "VIDEO" || item.thumbnail_url)
    .slice(0, LIMIT)
    .map((item) => ({
      id: item.id,
      caption: typeof item.caption === "string" ? item.caption.slice(0, 200) : "",
      imageUrl: item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url,
      permalink: item.permalink,
      timestamp: item.timestamp,
    }));

  // 30 Minuten Edge-Cache, damit nicht bei jedem Seitenaufruf die
  // Graph API angefragt wird (Rate-Limits, Ladezeit).
  return jsonResponse({ ok: true, posts }, 200, 1800);
}

export async function onRequest() {
  return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json; charset=utf-8", "Allow": "GET" },
  });
}
