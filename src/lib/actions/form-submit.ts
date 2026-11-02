"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { getLiveForm, isFormAccepting } from "@/lib/forms/data";
import { buildAnswerSchema, parseFields, readAnswers } from "@/lib/forms/fields";
import { allowFormSubmission } from "@/lib/forms/throttle";
import { detectDevice } from "@/lib/qr-codes/links";
import { formResponseEmail } from "@/lib/emails";
import { sendEmail } from "@/lib/email";
import { getCardsOrigin } from "@/lib/cards/links";

/**
 * Public submission. Runs without a signed-in user, so everything it trusts is
 * re-read here: the form, its live version, the schedule and the limit.
 */

export type SubmitState = { error: string | null; errorAt?: number };

/** A bot that trips the trap gets the same answer as any other failure. */
const GENERIC_ERROR = "Something went wrong. Please try again.";

const MIN_FILL_MS = 3000;

function hashIp(ip: string): string {
  // Keyed so the same address is recognisable without ever storing it raw.
  return createHmac("sha256", process.env.AUTH_SECRET ?? "").update(ip).digest("hex");
}

function formatAnswer(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "";
}

export async function submitFormResponseAction(
  slug: string,
  _prev: SubmitState,
  form: FormData,
): Promise<SubmitState> {
  const live = await getLiveForm(slug);
  if (!live || !live.version) return { error: "This form is not available.", errorAt: Date.now() };

  const count = await prisma.formResponse.count({ where: { form_id: live.form.id } });
  if (!isFormAccepting(live.form, count)) {
    return { error: "This form is no longer accepting answers.", errorAt: Date.now() };
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const country = headerList.get("x-vercel-ip-country");
  const device = detectDevice(headerList.get("user-agent"));

  if (!allowFormSubmission(live.form.id, ip)) {
    return { error: "Too many answers from this connection. Try again later.", errorAt: Date.now() };
  }

  // Hidden trap field plus a minimum fill time. Neither is ever shown, so only
  // a script fills the first and posts the second too soon.
  if (String(form.get("website") ?? "").trim() !== "") {
    return { error: GENERIC_ERROR, errorAt: Date.now() };
  }
  // A blank value reads as 0, which would look like a very slow fill, so only
  // a real, past timestamp counts.
  const startedRaw = String(form.get("started_at") ?? "").trim();
  const startedAt = Number(startedRaw);
  const elapsed = Date.now() - startedAt;
  if (!startedRaw || !Number.isFinite(startedAt) || startedAt <= 0 || elapsed < MIN_FILL_MS) {
    return { error: GENERIC_ERROR, errorAt: Date.now() };
  }

  // Accept an older version if the owner published while this person was
  // filling the form, since that is the version they were actually shown.
  const versionId = String(form.get("version_id") ?? "");
  const version = versionId
    ? await prisma.formVersion.findFirst({
        where: { id: versionId, form_id: live.form.id },
      })
    : null;
  if (!version) return { error: GENERIC_ERROR, errorAt: Date.now() };

  const parsed = parseFields(version.fields);
  if ("error" in parsed) {
    return { error: "This form is not available.", errorAt: Date.now() };
  }

  const result = buildAnswerSchema(parsed.fields).safeParse(readAnswers(parsed.fields, form));
  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Check your answers and try again.",
      errorAt: Date.now(),
    };
  }

  const answers = result.data;

  // The count and the insert must agree: a limit reached between the check
  // above and here still stops the answer.
  const saved = await prisma.$transaction(async (tx) => {
    // Lock the form row so two people taking the last slot are counted one
    // after the other rather than both seeing room.
    await tx.$queryRaw`SELECT id FROM "Form" WHERE id = ${live.form.id} FOR UPDATE`;
    const formNow = await tx.form.findUnique({
      where: { id: live.form.id },
      select: { status: true, live_version: true, closes_at: true, response_limit: true },
    });
    if (!formNow) return false;

    const accepted = await tx.formResponse.count({ where: { form_id: live.form.id } });
    if (!isFormAccepting(formNow, accepted)) return false;

    await tx.formResponse.create({
      data: {
        form_id: live.form.id,
        version_id: version.id,
        answers: answers as Prisma.InputJsonValue,
        device,
        country,
        ip_hash: ip === "unknown" ? null : hashIp(ip),
      },
    });
    return true;
  });

  if (!saved) {
    return { error: "This form is no longer accepting answers.", errorAt: Date.now() };
  }

  if (live.form.notify_emails.length > 0) {
    const origin = await getCardsOrigin();
    const shown = parsed.fields
      .filter((field) => field.type !== "heading")
      .map((field) => ({ label: field.label, value: formatAnswer(answers[field.id]) }))
      .filter((answer) => answer.value !== "");

    const template = formResponseEmail({
      formTitle: live.form.title,
      answers: shown,
      responsesUrl: `${origin}/dashboard/forms/${live.form.id}?tab=responses`,
    });

    // The answer is already saved; a failed alert must never undo it.
    after(async () => {
      for (const to of live.form.notify_emails) {
        const sent = await sendEmail({
          to,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
        if (!sent.ok) console.error("[forms] response email failed", to, sent.reason);
      }
    });
  }

  redirect(`/f/${slug}/done`);
}
