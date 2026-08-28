export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout({ heading, body }: { heading: string; body: string }): EmailTemplate {
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #eaeaea">
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;letter-spacing:-0.02em">${esc(heading)}</h1>
      ${body}
    </div>
    <p style="color:#888;font-size:12px;text-align:center;margin:16px 0 0">Sent by Tokea</p>
  </div>
</body></html>`;
  const text = `${heading}\n\n${stripHtml(body)}\n\n— Sent by Tokea`;
  return { subject: "", html, text };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:500;margin:8px 0">${esc(label)}</a>`;
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<p style="margin:4px 0"><span style="color:#666">${esc(label)}:</span> ${esc(value)}</p>`;
}

export function inviteEmail(input: {
  guestName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  rsvpUrl: string;
}): EmailTemplate {
  const body = `
    <p style="margin:0 0 16px">Hi ${esc(input.guestName)},</p>
    <p style="margin:0 0 16px">You're invited to <strong>${esc(input.eventTitle)}</strong>. Let us know if you can make it.</p>
    ${row("When", input.eventDate)}
    ${row("Where", input.venue || null)}
    <div style="margin:24px 0">${button(input.rsvpUrl, "RSVP now")}</div>
    <p style="color:#666;font-size:13px;margin:0">This link is unique to you. Please don't share it.</p>
  `;
  const { html, text } = layout({ heading: input.eventTitle, body });
  return { subject: `You're invited to ${input.eventTitle}`, html, text };
}

export function rsvpConfirmationEmail(input: {
  guestName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  confirmationUrl: string;
  qrDataUrl: string;
  addToCalendarUrl: string;
  icsUrl: string;
}): EmailTemplate {
  const body = `
    <p style="margin:0 0 16px">Thanks, ${esc(input.guestName)} — your RSVP is confirmed.</p>
    <p style="margin:0 0 16px">Show this QR code at the door for fast check-in.</p>
    <div style="text-align:center;margin:24px 0"><img src="${esc(input.qrDataUrl)}" alt="Your QR code" width="200" height="200" style="display:inline-block;border:1px solid #eee;padding:8px;border-radius:8px" /></div>
    ${row("When", input.eventDate)}
    ${row("Where", input.venue || null)}
    <div style="margin:24px 0;display:flex;gap:8px;flex-wrap:wrap">
      ${button(input.addToCalendarUrl, "Add to calendar")}
      <a href="${esc(input.icsUrl)}" style="display:inline-block;background:#fff;color:#111;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:500;border:1px solid #ddd">Download .ics</a>
    </div>
    <p style="color:#666;font-size:13px;margin:0">Need to change your RSVP? <a href="${esc(input.confirmationUrl)}" style="color:#111">View your confirmation</a>.</p>
  `;
  const { html, text } = layout({ heading: "You're confirmed", body });
  return { subject: `Confirmed: ${input.eventTitle}`, html, text };
}

export function magicLinkEmail(input: { url: string }): EmailTemplate {
  const body = `
    <p style="margin:0 0 16px">Click the button below to sign in to Tokea. No password needed.</p>
    <div style="margin:24px 0">${button(input.url, "Sign in to Tokea")}</div>
    <p style="color:#666;font-size:13px;margin:0">This link expires shortly and can only be used once. If you didn't request it, you can ignore this email.</p>
  `;
  const { html, text } = layout({ heading: "Sign in to Tokea", body });
  return { subject: "Your Tokea sign-in link", html, text };
}

export function reminderEmail(input: {
  guestName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  rsvpUrl: string;
}): EmailTemplate {
  const body = `
    <p style="margin:0 0 16px">Hi ${esc(input.guestName)},</p>
    <p style="margin:0 0 16px">Quick reminder — <strong>${esc(input.eventTitle)}</strong> is coming up.</p>
    ${row("When", input.eventDate)}
    ${row("Where", input.venue || null)}
    <div style="margin:24px 0">${button(input.rsvpUrl, "View invitation")}</div>
  `;
  const { html, text } = layout({ heading: `Coming up: ${input.eventTitle}`, body });
  return { subject: `Reminder: ${input.eventTitle}`, html, text };
}
