import type { ReminderTask } from "./checklists/reminders";

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export function todoRequestEmail(requestUrl: string): EmailTemplate {
  const subject = "New to-do request";
  const body = `<p>A new request is waiting in your To-do inbox.</p><div style="margin:24px 0">${button(requestUrl, "Open request")}</div>`;
  const { html } = layout({ heading: subject, body });
  return { subject, html, text: `A new request is waiting in your To-do inbox.\n\nOpen request: ${requestUrl}` };
}

export function taskReminderEmail(input: {
  name: string | null;
  overdue: ReminderTask[];
  today: ReminderTask[];
  more: number;
  myTasksUrl: string;
  settingsUrl: string;
}): EmailTemplate {
  const todayCount = input.today.length;
  const subject = [
    input.overdue.length ? `${input.overdue.length} overdue` : "",
    todayCount ? `${todayCount}${input.overdue.length ? "" : todayCount === 1 ? " task" : " tasks"} due today` : "",
  ].filter(Boolean).join(", ");
  const detail = (task: ReminderTask, overdue: boolean) => {
    const day = task.due_on instanceof Date ? task.due_on.toISOString().slice(0, 10) : task.due_on?.slice(0, 10);
    return `${task.list_title}${overdue && day ? ` (due ${day})` : ""}`;
  };
  const body = `
    <p>Hi ${esc(input.name || "there")},</p>
    ${input.overdue.length ? `<h2 style="font-size:16px">Overdue</h2>${input.overdue.map((task) => row(task.title, detail(task, true))).join("")}` : ""}
    ${todayCount ? `<h2 style="font-size:16px">Due today</h2>${input.today.map((task) => row(task.title, detail(task, false))).join("")}` : ""}
    ${input.more > 0 ? `<p>And ${input.more} more ${input.more === 1 ? "task" : "tasks"} in My tasks.</p>` : ""}
    <div style="margin:24px 0">${button(input.myTasksUrl, "View My tasks")}</div>
    <p style="font-size:13px"><a href="${esc(input.settingsUrl)}" style="color:#666">Turn these emails off</a></p>
  `;
  const { html } = layout({ heading: subject, body });
  // Plain text keeps line breaks and links that the shared HTML stripper cannot preserve.
  const line = (task: ReminderTask, overdue: boolean) => `${task.title}: ${detail(task, overdue)}`;
  const text = [subject, `Hi ${input.name || "there"},`,
    ...(input.overdue.length ? ["Overdue", ...input.overdue.map((task) => line(task, true))] : []),
    ...(todayCount ? ["Due today", ...input.today.map((task) => line(task, false))] : []),
    ...(input.more > 0 ? [`And ${input.more} more ${input.more === 1 ? "task" : "tasks"} in My tasks.`] : []),
    `View My tasks: ${input.myTasksUrl}`, `Turn these emails off: ${input.settingsUrl}`, "Sent by NikoForm",
  ].join("\n\n");
  return { subject, html, text };
}

export function checklistInviteEmail(input: { inviterName: string; listTitle: string; joinUrl: string }): EmailTemplate {
  const body = `<p>${esc(input.inviterName)} invited you to <strong>${esc(input.listTitle)}</strong>.</p>
    <p>Join to add, assign and tick tasks together. Sign in with the email address this invite was sent to.</p>
    <div style="margin:24px 0">${button(input.joinUrl, "Join list")}</div>
    <p style="color:#666;font-size:13px">This invite expires in 7 days. If you were not expecting it, you can ignore this email.</p>`;
  const { html, text } = layout({ heading: "You're invited to a checklist", body });
  return { subject: `${input.inviterName} invited you to ${input.listTitle}`, html, text: `${text}\n\nJoin list: ${input.joinUrl}` };
}

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
    <p style="color:#888;font-size:12px;text-align:center;margin:16px 0 0">Sent by NikoForm</p>
  </div>
</body></html>`;
  const text = `${heading}\n\n${stripHtml(body)}\n\nSent by NikoForm`;
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
    <p style="margin:0 0 16px">Thanks, ${esc(input.guestName)}. Your RSVP is confirmed.</p>
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
    <p style="margin:0 0 16px">Click the button below to sign in to NikoForm. No password needed.</p>
    <div style="margin:24px 0">${button(input.url, "Sign in to NikoForm")}</div>
    <p style="color:#666;font-size:13px;margin:0">This link expires shortly and can only be used once. If you didn't request it, you can ignore this email.</p>
  `;
  const { html, text } = layout({ heading: "Sign in to NikoForm", body });
  return { subject: "Your NikoForm sign-in link", html, text };
}

/**
 * Tells a form owner (or whoever they listed) that an answer arrived. Only the
 * first ten answers are shown, so the email stays a nudge rather than a copy of
 * the response; the button opens the full table.
 */
export function formResponseEmail(input: {
  formTitle: string;
  answers: { label: string; value: string }[];
  responsesUrl: string;
}): EmailTemplate {
  const shown = input.answers.slice(0, 10);
  const rest = input.answers.length - shown.length;
  const body = `
    <p style="margin:0 0 16px">Someone just answered <strong>${esc(input.formTitle)}</strong>.</p>
    ${shown.map((answer) => row(answer.label, answer.value)).join("")}
    ${
      rest > 0
        ? `<p style="color:#666;font-size:13px;margin:16px 0 0">And ${rest} more ${rest === 1 ? "answer" : "answers"}.</p>`
        : ""
    }
    <div style="margin:24px 0">${button(input.responsesUrl, "Read all responses")}</div>
  `;
  const { html, text } = layout({ heading: `New answer: ${input.formTitle}`, body });
  return { subject: `New answer: ${input.formTitle}`, html, text };
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
    <p style="margin:0 0 16px">Quick reminder: <strong>${esc(input.eventTitle)}</strong> is coming up.</p>
    ${row("When", input.eventDate)}
    ${row("Where", input.venue || null)}
    <div style="margin:24px 0">${button(input.rsvpUrl, "View invitation")}</div>
  `;
  const { html, text } = layout({ heading: `Coming up: ${input.eventTitle}`, body });
  return { subject: `Reminder: ${input.eventTitle}`, html, text };
}
