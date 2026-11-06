"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { calculateEstimate, clampQuantity, normalisePhone, validEventDate } from "@/lib/todo/logic";
import { allowTodoSubmission } from "@/lib/todo/throttle";
import { sendEmail } from "@/lib/email";
import { todoRequestEmail } from "@/lib/emails";
import { getCardsOrigin } from "@/lib/cards/links";
import type { TodoState } from "./todo";

const submissionSchema = z.object({
  name: z.string().trim().min(1, "Enter your full name.").max(160),
  phone: z.string().trim().max(60).transform(normalisePhone).refine((v) => v !== null, "Enter a valid phone number."),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.").max(200)]),
  event_date: z.string().refine((v) => !v || validEventDate(v), "Enter a valid event date."),
  notes: z.string().trim().max(1000, "Keep notes to 1000 characters."),
  items: z.array(z.object({ id: z.string().min(1).max(80), quantity: z.number().finite() })).min(1, "Pick at least one service.").max(200),
}).refine((value) => new Set(value.items.map((i) => i.id)).size === value.items.length, "Choose each service once.");

export async function submitTodoAction(slug: string, _prev: TodoState, form: FormData): Promise<TodoState> {
  const list = await prisma.todoList.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!list || list.status !== "open") return { error: "This list is not accepting requests." };
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowTodoSubmission(list.id, ip)) return { error: "Too many requests from this connection. Try again later." };
  if (String(form.get("website") ?? "").trim()) return { error: "Something went wrong. Please try again." };
  const raw = String(form.get("items") ?? "");
  if (raw.length > 30000) return { error: "Choose fewer services and try again." };
  let items: unknown;
  try { items = JSON.parse(raw); } catch { return { error: "Pick at least one service." }; }
  const parsed = submissionSchema.safeParse({
    name: form.get("name"), phone: form.get("phone"), email: form.get("email"),
    event_date: form.get("event_date") ?? "", notes: form.get("notes"), items,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  const value = parsed.data;
  const result = await prisma.$transaction(async (tx) => {
    // The editor and delete action take this lock too. Re-read every trusted value.
    await tx.$queryRaw`SELECT id FROM "TodoList" WHERE id = ${list.id} FOR UPDATE`;
    const current = await tx.todoList.findUnique({
      where: { id: list.id }, include: { owner: { select: { email: true } }, items: { where: { active: true } } },
    });
    if (!current || current.status !== "open") return { error: "This list is not accepting requests." };
    const snapshots = [];
    for (const selected of value.items) {
      const item = current.items.find((i) => i.id === selected.id);
      if (!item) return { error: "A selected service has changed. Reload the page and choose again." };
      const quantity = clampQuantity(selected.quantity, item.per_unit, item.max_quantity);
      const price = current.show_prices ? item.price : null;
      snapshots.push({ item_id: item.id, name: item.name, quantity, unit_price: price, line_total: price === null ? null : price * quantity });
    }
    let estimate: number | null;
    try { estimate = calculateEstimate(snapshots.map((i) => ({ price: i.unit_price, quantity: i.quantity })), current.show_prices); }
    catch { return { error: "This estimate is too large. Please contact the business directly." }; }
    const request = await tx.todoRequest.create({ data: {
      list_id: current.id, name: value.name, phone: value.phone!, email: value.email || null,
      event_date: current.ask_event_date && value.event_date ? new Date(`${value.event_date}T00:00:00Z`) : null,
      notes: value.notes || null, estimate, currency: current.currency, items: { create: snapshots },
    }, select: { id: true } });
    return { id: request.id, recipients: current.notify_emails.length ? current.notify_emails : [current.owner.email] };
  });
  if ("error" in result) return { error: result.error ?? "Could not send the request." };
  revalidatePath("/dashboard", "layout");
  // Even origin/template failures happen after the request is safely stored.
  after(async () => {
    try {
      const template = todoRequestEmail(`${await getCardsOrigin()}/dashboard/todo/requests/${result.id}`);
      for (const to of result.recipients) {
        const sent = await sendEmail({ to, ...template });
        if (!sent.ok) console.error("[todo] notification failed", sent.reason);
      }
    } catch (error) { console.error("[todo] notification failed", error); }
  });
  redirect(`/t/${slug}/done`);
}
