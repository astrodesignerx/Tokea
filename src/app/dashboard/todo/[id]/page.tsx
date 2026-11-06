import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { toMajorUnitsInput } from "@/lib/money";
import { TodoEditor } from "@/components/todo/todo-editor";
import { TodoShare } from "@/components/todo/todo-share";
import { getCardsOrigin } from "@/lib/cards/links";
import type { TodoEditorValue } from "@/lib/todo/validation";

export const metadata = { title: "To-do list" };

export default async function TodoEditorPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const list = await prisma.todoList.findFirst({ where: { id, owner_id: user.id }, include: { sections: { orderBy: { position: "asc" } }, items: { orderBy: { position: "asc" } } } });
  if (!list) notFound();
  const [organisations, origin, search] = await Promise.all([
    prisma.organisation.findMany({ where: { owner_id: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getCardsOrigin(), searchParams,
  ]);
  const initial: TodoEditorValue = {
    title: list.title, intro: list.intro ?? "", organisation_id: list.organisation_id ?? "",
    status: list.status as TodoEditorValue["status"], layout: list.layout as TodoEditorValue["layout"],
    allow_view_switch: list.allow_view_switch, show_prices: list.show_prices, ask_event_date: list.ask_event_date,
    notify_emails: list.notify_emails, thank_you: list.thank_you ?? "", updated_at: list.updated_at.toISOString(),
    sections: list.sections.map((s) => ({ id: s.id, title: s.title })),
    items: list.items.map((i) => ({ id: i.id, section_id: i.section_id ?? "", name: i.name, note: i.note ?? "", image_url: i.image_url ?? "", price: i.price === null ? "" : toMajorUnitsInput(i.price), per_unit: i.per_unit, unit_label: i.unit_label ?? "", max_quantity: i.max_quantity, active: i.active })),
  };
  return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <Link href="/dashboard/todo" className="text-sm text-muted-foreground">Back to To-do</Link>
    <div className="mt-5 flex items-center gap-3"><h1 className="text-3xl font-medium">{list.title}</h1><span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{list.status}</span></div>
    <TodoShare url={`${origin}/t/${list.slug}`} slug={list.slug} />
    <TodoEditor key={list.updated_at.toISOString()} id={id} initial={initial} organisations={organisations} saved={search.saved === "1"} />
  </div>;
}
