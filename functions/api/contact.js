// Cloudflare Pages Function: /api/contact
// Nimmt die Anfrage aus dem Kontaktformular entgegen und schickt sie
// über Resend an die konfigurierte Empfänger-Adresse. Der API-Key liegt
// als verschlüsseltes Secret in den Cloudflare-Pages-Umgebungsvariablen
// (RESEND_API_KEY) und wird nie an den Browser ausgeliefert.

const MAX_LEN = { name: 120, email: 200, message: 5000 };

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

export async function onRequestPost({ request, env }) {
  const cors = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: cors,
    });
  }

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const message = String(payload.message || "").trim();
  const website = String(payload.website || "").trim(); // Honeypot
  const ts = Number(payload.ts) || 0;

  // Honeypot: echte Menschen füllen dieses Feld nicht aus.
  if (website) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  }

  // Zeit-Check: Formulare in unter 2 Sekunden sind fast immer Bots.
  if (ts && Date.now() - ts < 2000) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  }

  if (!name || !email || !message) {
    return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), {
      status: 400,
      headers: cors,
    });
  }
  if (name.length > MAX_LEN.name || email.length > MAX_LEN.email || message.length > MAX_LEN.message) {
    return new Response(JSON.stringify({ ok: false, error: "too_long" }), {
      status: 400,
      headers: cors,
    });
  }
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_email" }), {
      status: 400,
      headers: cors,
    });
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
      status: 500,
      headers: cors,
    });
  }

  const from = env.MAIL_FROM || "Maria Visuals <kontakt@mariavisuals.de>";
  const to = env.MAIL_TO || "henneberg883@gmail.com";

  const subject = `Projektanfrage von ${name}`;
  const textBody =
    `Neue Anfrage über mariavisuals.de\n\n` +
    `Name:    ${name}\n` +
    `E-Mail:  ${email}\n\n` +
    `Nachricht:\n${message}\n`;
  const htmlBody =
    `<p><strong>Neue Anfrage über mariavisuals.de</strong></p>` +
    `<p><strong>Name:</strong> ${escapeHtml(name)}<br>` +
    `<strong>E-Mail:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>` +
    `<p><strong>Nachricht:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject,
      text: textBody,
      html: htmlBody,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.log("resend_error", resp.status, detail);
    return new Response(JSON.stringify({ ok: false, error: "send_failed" }), {
      status: 502,
      headers: cors,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
}

export async function onRequest() {
  return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json; charset=utf-8", "Allow": "POST" },
  });
}
