import 'server-only';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function sendLoginCode({ email, name, code }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY fehlt – Mailversand nicht konfiguriert');

  const title = process.env.APP_TITLE || 'Abwesenheitskalender';
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME || title },
      to: [{ email, name }],
      subject: `Ihr Anmeldecode: ${code}`,
      textContent:
        `Hallo ${name},\n\nIhr Anmeldecode für „${title}“ lautet: ${code}\n\n` +
        `Der Code ist 10 Minuten gültig. Falls Sie keinen Code angefordert haben, ignorieren Sie diese Mail.`,
      htmlContent:
        `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;color:#1f2937">` +
        `<p>Hallo ${esc(name)},</p>` +
        `<p>Ihr Anmeldecode für „${esc(title)}“ lautet:</p>` +
        `<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>` +
        `<p style="color:#6b7280">Der Code ist 10 Minuten gültig. Falls Sie keinen Code angefordert haben, ignorieren Sie diese Mail.</p>` +
        `</div>`,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Mailversand fehlgeschlagen (${res.status}) ${text.slice(0, 200)}`);
  }
}
