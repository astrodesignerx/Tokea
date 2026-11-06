import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { visibleTodo, brandColours } from "@/lib/todo/data";
import { PublicTodo } from "@/components/todo/public-todo";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const list = await visibleTodo((await params).slug);
  return {
    title: list ? `${list.title} | ${list.organisation?.name ?? list.owner.name ?? "NikoForm"}` : "List not found",
    robots: { index: false, follow: false },
  };
}

export default async function TodoPublicPage({ params }: Props) {
  const list = await visibleTodo((await params).slug);
  if (!list) notFound();
  const business = list.organisation?.name ?? list.owner.name ?? "NikoForm";
  const brand = brandColours(list.organisation?.brand_primary, list.organisation?.brand_ink);
  const style = brand ? { "--todo-primary": brand.primary, "--todo-on-primary": brand.ink } as CSSProperties : undefined;
  if (list.status === "closed") return (
    <main className="todo-surface flex min-h-dvh items-center px-5" style={style}>
      <div className="mx-auto w-full max-w-xl py-16">
        <p className="nf-eyebrow">{business}</p>
        <h1 className="mt-3 text-3xl font-medium">This list is closed</h1>
        <p className="mt-3 text-muted-foreground">{list.title} is no longer taking requests. Please contact {business} for help.</p>
      </div>
    </main>
  );
  return <PublicTodo
    slug={list.slug} title={list.title} intro={list.intro} business={business}
    logo={list.organisation?.logo_url ?? null} brand={brand}
    layout={list.layout === "visual" ? "visual" : "list"}
    allowViewSwitch={list.allow_view_switch} showPrices={list.show_prices}
    currency={list.currency} askEventDate={list.ask_event_date} preview={list.status === "draft"}
    sections={list.sections.map((s) => ({ id: s.id, title: s.title }))}
    items={list.items.map((i) => ({
      id: i.id, section_id: i.section_id, name: i.name, note: i.note, image_url: i.image_url,
      price: list.show_prices ? i.price : null, per_unit: i.per_unit, unit_label: i.unit_label, max_quantity: i.max_quantity,
    }))}
  />;
}
