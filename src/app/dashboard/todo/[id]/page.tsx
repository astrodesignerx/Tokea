import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { toMajorUnitsInput } from "@/lib/money";
import { TodoEditor } from "@/components/todo/todo-editor";
import { TodoShare } from "@/components/todo/todo-share";
import { getCardsOrigin } from "@/lib/cards/links";
import type { TodoEditorValue } from "@/lib/todo/validation";
import { brandColours } from "@/lib/todo/data";

export const metadata = { title: "To-do list" };

export default async function TodoEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const list = await prisma.todoList.findFirst({ where: { id, owner_id: user.id }, include: { sections: { orderBy: { position: "asc" } }, items: { orderBy: { position: "asc" } } } });
  if (!list) notFound();
  const [organisations, origin] = await Promise.all([
    prisma.organisation.findMany({ where: { owner_id: user.id }, select: { id: true, name: true, logo_url: true, brand_primary: true, brand_ink: true }, orderBy: { name: "asc" } }),
    getCardsOrigin(),
  ]);
  const initial: TodoEditorValue = {
    title: list.title, intro: list.intro ?? "", organisation_id: list.organisation_id ?? "",
    status: list.status as TodoEditorValue["status"], layout: list.layout as TodoEditorValue["layout"],
    allow_view_switch: list.allow_view_switch, show_prices: list.show_prices, ask_event_date: list.ask_event_date,
    notify_emails: list.notify_emails, thank_you: list.thank_you ?? "", updated_at: list.updated_at.toISOString(),
    sections: list.sections.map((s) => ({ id: s.id, title: s.title })),
    items: list.items.map((i) => ({ id: i.id, section_id: i.section_id ?? "", name: i.name, note: i.note ?? "", image_url: i.image_url ?? "", price: i.price === null ? "" : toMajorUnitsInput(i.price), per_unit: i.per_unit, unit_label: i.unit_label ?? "", max_quantity: i.max_quantity, active: i.active })),
  };
  return <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6">
    <Link href="/dashboard/todo" className="inline-flex min-h-11 items-center text-sm text-muted-foreground">Back to To-do</Link>
    <div className="lg:grid lg:grid-cols-[minmax(0,640px)_340px] lg:items-start lg:justify-center lg:gap-8">
      <div className="min-w-0">
        <TodoEditor key={list.id} id={id} initial={initial} businessName={user.name ?? "NikoForm"} origin={origin} slug={list.slug} organisations={organisations.map((org) => ({ id: org.id, name: org.name, logo_url: org.logo_url, brand: brandColours(org.brand_primary, org.brand_ink) }))} />
      </div>
      <TodoShare url={`${origin}/t/${list.slug}`} slug={list.slug} />
    </div>
  </div>;
}
