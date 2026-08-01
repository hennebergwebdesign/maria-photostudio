// Cloudflare Pages Function: /api/contact
// Nimmt die Anfrage aus dem Kontaktformular entgegen und schickt sie
// über Resend an Maria und – als Bestätigung – zurück an den Absender.
// Der API-Key liegt als verschlüsseltes Secret in den Cloudflare-Pages-
// Umgebungsvariablen (RESEND_API_KEY) und wird nie an den Browser
// ausgeliefert.

const MAX_LEN = { name: 120, email: 200, phone: 40, topic: 60, message: 5000 };
const ALLOWED_TOPICS = ["Baby", "Familie", "Portrait", "Schwangerschaft", "Hochzeit"];

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function sendMail(apiKey, payload) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.log("resend_error", resp.status, detail);
    return false;
  }
  return true;
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const phone = String(payload.phone || "").trim();
  const topic = String(payload.topic || "").trim();
  const message = String(payload.message || "").trim();
  const website = String(payload.website || "").trim();
  const ts = Number(payload.ts) || 0;

  // Honeypot: echte Menschen füllen dieses Feld nicht aus.
  if (website) return jsonResponse({ ok: true }, 200);

  // Zeit-Check: Formulare in unter 2 Sekunden sind fast immer Bots.
  if (ts && Date.now() - ts < 2000) return jsonResponse({ ok: true }, 200);

  if (!name || !email || !phone || !topic) {
    return jsonResponse({ ok: false, error: "missing_fields" }, 400);
  }
  if (
    name.length > MAX_LEN.name ||
    email.length > MAX_LEN.email ||
    phone.length > MAX_LEN.phone ||
    topic.length > MAX_LEN.topic ||
    message.length > MAX_LEN.message
  ) {
    return jsonResponse({ ok: false, error: "too_long" }, 400);
  }
  if (!isValidEmail(email)) {
    return jsonResponse({ ok: false, error: "invalid_email" }, 400);
  }
  if (!ALLOWED_TOPICS.includes(topic)) {
    return jsonResponse({ ok: false, error: "invalid_topic" }, 400);
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return jsonResponse({ ok: false, error: "server_misconfigured" }, 500);
  }

  const from = env.MAIL_FROM || "Maria Visuals <kontakt@mariavisuals.de>";
  const to = env.MAIL_TO || "henneberg883@gmail.com";

  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    phone: escapeHtml(phone),
    topic: escapeHtml(topic),
    message: escapeHtml(message).replace(/\n/g, "<br>"),
  };

  // ---------- Mail an Maria ----------
  const adminSubject = `Neue Anfrage (${topic}) von ${name}`;
  const adminText =
    `Neue Anfrage über mariavisuals.de\n\n` +
    `Name:     ${name}\n` +
    `E-Mail:   ${email}\n` +
    `Telefon:  ${phone}\n` +
    `Anlass:   ${topic}\n\n` +
    `Nachricht:\n${message || "(keine Nachricht angegeben)"}\n`;
  const adminHtml =
    `<div style="font-family:Georgia,serif;max-width:560px;color:#2a2018">` +
    `<h2 style="color:#a67a3a;margin:0 0 16px">Neue Anfrage über mariavisuals.de</h2>` +
    `<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:15px">` +
    `<tr><td style="padding:6px 12px 6px 0;color:#55442f;width:110px"><strong>Name</strong></td><td style="padding:6px 0">${safe.name}</td></tr>` +
    `<tr><td style="padding:6px 12px 6px 0;color:#55442f"><strong>E-Mail</strong></td><td style="padding:6px 0"><a href="mailto:${safe.email}" style="color:#a67a3a">${safe.email}</a></td></tr>` +
    `<tr><td style="padding:6px 12px 6px 0;color:#55442f"><strong>Telefon</strong></td><td style="padding:6px 0"><a href="tel:${safe.phone}" style="color:#a67a3a">${safe.phone}</a></td></tr>` +
    `<tr><td style="padding:6px 12px 6px 0;color:#55442f"><strong>Anlass</strong></td><td style="padding:6px 0">${safe.topic}</td></tr>` +
    `</table>` +
    `<h3 style="margin:24px 0 8px;color:#55442f;font-family:Arial,sans-serif;font-size:14px;letter-spacing:0.1em;text-transform:uppercase">Nachricht</h3>` +
    `<div style="padding:14px 16px;background:#f0e2c9;border-left:3px solid #a67a3a;font-family:Arial,sans-serif;font-size:15px;line-height:1.55">${safe.message || "<em>(keine Nachricht angegeben)</em>"}</div>` +
    `</div>`;

  const adminOk = await sendMail(apiKey, {
    from,
    to: [to],
    reply_to: email,
    subject: adminSubject,
    text: adminText,
    html: adminHtml,
  });

  if (!adminOk) return jsonResponse({ ok: false, error: "send_failed" }, 502);

  // ---------- Bestätigungsmail an den Kunden ----------
  const customerSubject = "Ihre Anfrage bei Maria Visuals";
  const customerText =
    `Hallo ${name},\n\n` +
    `vielen Dank für Ihre Anfrage! Ich habe sie erhalten und melde mich ` +
    `werktags innerhalb von 24 Stunden persönlich bei Ihnen.\n\n` +
    `Zur Übersicht hier noch einmal Ihre Angaben:\n\n` +
    `Name:     ${name}\n` +
    `E-Mail:   ${email}\n` +
    `Telefon:  ${phone}\n` +
    `Anlass:   ${topic}\n` +
    (message ? `\nIhre Nachricht:\n${message}\n` : "") +
    `\nSie können mich zwischendurch jederzeit direkt erreichen unter ` +
    `${to}.\n\n` +
    `Herzliche Grüße\nMaria\nMaria Visuals · Fotografie & Videografie\n`;
  const customerHtml =
    `<div style="font-family:Georgia,serif;max-width:560px;color:#2a2018;line-height:1.55">` +
    `<h2 style="color:#a67a3a;margin:0 0 12px;font-weight:normal">Vielen Dank für Ihre Anfrage, ${safe.name}!</h2>` +
    `<p style="font-family:Arial,sans-serif;font-size:15px">` +
    `ich habe Ihre Anfrage erhalten und melde mich werktags innerhalb von ` +
    `<strong>24 Stunden</strong> persönlich bei Ihnen – meist über den Kanal, ` +
    `den Sie hier hinterlassen haben.` +
    `</p>` +
    `<p style="font-family:Arial,sans-serif;font-size:15px">` +
    `Bis dahin: schön, dass Sie an mich gedacht haben. Ich freue mich, mehr über ` +
    `Ihr Vorhaben zu erfahren und gemeinsam zu überlegen, wie wir Ihre Bilder ` +
    `entstehen lassen.` +
    `</p>` +
    `<h3 style="margin:24px 0 8px;color:#55442f;font-family:Arial,sans-serif;font-size:13px;letter-spacing:0.1em;text-transform:uppercase">Ihre Angaben</h3>` +
    `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:15px">` +
    `<tr><td style="padding:5px 14px 5px 0;color:#55442f;width:110px"><strong>Name</strong></td><td style="padding:5px 0">${safe.name}</td></tr>` +
    `<tr><td style="padding:5px 14px 5px 0;color:#55442f"><strong>E-Mail</strong></td><td style="padding:5px 0">${safe.email}</td></tr>` +
    `<tr><td style="padding:5px 14px 5px 0;color:#55442f"><strong>Telefon</strong></td><td style="padding:5px 0">${safe.phone}</td></tr>` +
    `<tr><td style="padding:5px 14px 5px 0;color:#55442f"><strong>Anlass</strong></td><td style="padding:5px 0">${safe.topic}</td></tr>` +
    `</table>` +
    (message
      ? `<h3 style="margin:24px 0 8px;color:#55442f;font-family:Arial,sans-serif;font-size:13px;letter-spacing:0.1em;text-transform:uppercase">Ihre Nachricht</h3>` +
        `<div style="padding:14px 16px;background:#f0e2c9;border-left:3px solid #a67a3a;font-family:Arial,sans-serif;font-size:15px;line-height:1.55">${safe.message}</div>`
      : "") +
    `<p style="margin-top:28px;font-family:Georgia,serif;font-style:italic;color:#55442f">— Herzliche Grüße, Maria</p>` +
    `<p style="margin-top:24px;font-family:Arial,sans-serif;font-size:13px;color:#55442f">` +
    `Maria Visuals · Fotografie & Videografie<br>` +
    `E-Mail: <a href="mailto:${to}" style="color:#a67a3a">${to}</a>` +
    `</p>` +
    `</div>`;

  // Bestätigungsmail ist nice-to-have – Fehler nicht an den Client melden.
  await sendMail(apiKey, {
    from,
    to: [email],
    reply_to: to,
    subject: customerSubject,
    text: customerText,
    html: customerHtml,
  });

  return jsonResponse({ ok: true }, 200);
}

export async function onRequest() {
  return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json; charset=utf-8", "Allow": "POST" },
  });
}
