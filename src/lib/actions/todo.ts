"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { editorSchema } from "@/lib/todo/validation";
import { REQUEST_STATUSES } from "@/lib/todo/logic";
import { toMinorUnits } from "@/lib/money";
import { slugify, withCollisionSuffix } from "@/lib/slug";
import { isUniqueViolation } from "@/lib/errors";

export type TodoState = { error: string | null };
const ROOT = "/dashboard/todo";

export async function getTodoUnseenCountAction(): Promise<number> {
  const user = await requireUser();
  return prisma.todoRequest.count({ where: { list: { owner_id: user.id }, status: "new", seen_at: null } });
}

function refresh(id: string, slug: string) {
  revalidatePath(ROOT);
  revalidatePath(`${ROOT}/${id}`);
  revalidatePath(`/t/${slug}`);
  revalidatePath("/dashboard", "layout");
}

export async function saveTodoAction(id: string | null, _prev: TodoState, form: FormData): Promise<TodoState> {
  const user = await requireUser();
  const raw = String(form.get("payload") ?? "");
  if (raw.length > 500_000) return { error: "This list is too large." };
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return { error: "Check the list and try again." }; }
  const parsed = editorSchema.safeParse(json);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the list." };
  const value = parsed.data;
  const prices = value.items.map((item) => item.price.trim() ? toMinorUnits(item.price) : null);
  if (value.items.some((item, i) => item.price.trim() && prices[i] === null)) {
    return { error: "Use a positive price or zero, with at most two decimal places." };
  }

  const settings = {
    title: value.title, intro: value.intro || null,
    organisation_id: value.organisation_id || null,
    status: value.status, layout: value.layout,
    allow_view_switch: value.allow_view_switch, show_prices: value.show_prices,
    ask_event_date: value.ask_event_date, notify_emails: [...new Set(value.notify_emails)],
    thank_you: value.thank_you || null,
  };
  const base = slugify(value.title) || "todo";
  let saved: { id: string; slug: string } | null = null;
  for (let attempt = 0; attempt < 5 && !saved; attempt++) {
    try {
      saved = await prisma.$transaction(async (tx) => {
        if (settings.organisation_id) {
          const organisation = await tx.organisation.findFirst({ where: { id: settings.organisation_id, owner_id: user.id } });
          if (!organisation) throw new Error("Choose one of your own businesses.");
        }
        if (id) await tx.$queryRaw`SELECT id FROM "TodoList" WHERE id = ${id} AND owner_id = ${user.id} FOR UPDATE`;
        const existing = id ? await tx.todoList.findFirst({
          where: { id, owner_id: user.id }, include: { sections: true, items: true },
        }) : null;
        if (id && !existing) throw new Error("This list is not available.");
        if (existing && existing.updated_at.toISOString() !== value.updated_at) {
          throw new Error("This list changed in another window. Reload before saving.");
        }
        const knownSections = new Set(existing?.sections.map((s) => s.id));
        const knownItems = new Set(existing?.items.map((i) => i.id));
        for (const section of value.sections) {
          if (!knownSections.has(section.id) && !section.id.startsWith("new:")) throw new Error("That section is not in this list.");
        }
        for (const item of value.items) {
          if (!knownItems.has(item.id) && !item.id.startsWith("new:")) throw new Error("That service is not in this list.");
        }
        const list = existing
          ? await tx.todoList.update({ where: { id: existing.id, owner_id: user.id }, data: settings })
          : await tx.todoList.create({ data: { ...settings, owner_id: user.id, slug: attempt === 0 ? base : withCollisionSuffix(base) } });
        const sectionIds = new Map<string, string>();
        for (const [position, section] of value.sections.entries()) {
          const data = { title: section.title, position };
          const savedSection = knownSections.has(section.id)
            ? await tx.todoSection.update({ where: { id: section.id, list_id: list.id }, data })
            : await tx.todoSection.create({ data: { ...data, list_id: list.id } });
          sectionIds.set(section.id, savedSection.id);
        }
        const keptItems: string[] = [];
        for (const [position, item] of value.items.entries()) {
          const data = {
            name: item.name, note: item.note || null, image_url: item.image_url || null,
            price: prices[position], per_unit: item.per_unit, unit_label: item.unit_label || null,
            max_quantity: item.max_quantity, active: item.active, position,
            section_id: sectionIds.get(item.section_id) ?? null,
          };
          const savedItem = knownItems.has(item.id)
            ? await tx.todoItem.update({ where: { id: item.id, list_id: list.id }, data })
            : await tx.todoItem.create({ data: { ...data, list_id: list.id } });
          keptItems.push(savedItem.id);
        }
        // SetNull on request items preserves their snapshots when a service goes away.
        await tx.todoItem.deleteMany({ where: { list_id: list.id, id: { notIn: keptItems } } });
        await tx.todoSection.deleteMany({ where: { list_id: list.id, id: { notIn: [...sectionIds.values()] } } });
        return { id: list.id, slug: list.slug };
      }, { timeout: 20000 });
    } catch (error) {
      if (!id && isUniqueViolation(error, "slug")) continue;
      console.error("[todo] save failed", error);
      return { error: error instanceof Error && !error.message.includes("\n") ? error.message : "Could not save the list. Try again." };
    }
  }
  if (!saved) return { error: "That link name is taken. Try a different title." };
  refresh(saved.id, saved.slug);
  redirect(`${ROOT}/${saved.id}?saved=1`);
}

export async function setTodoRequestStatusAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(form.get("request_id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!REQUEST_STATUSES.some((allowed) => allowed === status)) return;
  await prisma.todoRequest.updateMany({ where: { id, list: { owner_id: user.id } }, data: { status } });
  revalidatePath(`${ROOT}/requests/${id}`);
  revalidatePath("/dashboard", "layout");
}

export async function deleteTodoListAction(_prev: TodoState, form: FormData): Promise<TodoState> {
  const user = await requireUser();
  const id = String(form.get("list_id") ?? "");
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "TodoList" WHERE id = ${id} AND owner_id = ${user.id} FOR UPDATE`;
    const list = await tx.todoList.findFirst({ where: { id, owner_id: user.id } });
    if (!list) return "This list is not available.";
    if (await tx.todoRequest.count({ where: { list_id: id } })) return "This list has requests. Archive it in Basics instead.";
    await tx.todoList.delete({ where: { id, owner_id: user.id } });
    revalidatePath(`/t/${list.slug}`);
    return null;
  });
  if (result) return { error: result };
  revalidatePath("/dashboard", "layout");
  redirect(ROOT);
}
