import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "hello@tokea.app";

const resend = apiKey && !apiKey.startsWith("re_dev_placeholder") ? new Resend(apiKey) : null;

export type EmailResult = { ok: true; id: string } | { ok: false; reason: string };

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailResult> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured, skipping send to", input.to);
    return { ok: false, reason: "email-not-configured" };
  }
  try {
    const result = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (result.error) {
      console.error("[email] send failed", result.error);
      return { ok: false, reason: result.error.name ?? "send-failed" };
    }
    return { ok: true, id: result.data?.id ?? "unknown" };
  } catch (err) {
    console.error("[email] exception", err);
    return { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }
}
