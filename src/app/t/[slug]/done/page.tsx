import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { visibleTodo } from "@/lib/todo/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Request sent", robots: { index: false, follow: false } };

export default async function TodoDonePage({ params }: { params: Promise<{ slug: string }> }) {
  const list = await visibleTodo((await params).slug);
  if (!list || list.status === "draft") notFound();
  const business = list.organisation?.name ?? list.owner.name ?? "NikoForm";
  return (
    <main className="todo-surface flex min-h-dvh items-center px-5">
      <div className="todo-rise mx-auto w-full max-w-xl py-16 text-center">
        <p className="nf-eyebrow">{business}</p>
        <span className="mx-auto mt-6 flex size-14 items-center justify-center rounded-full bg-muted text-brand"><Check aria-hidden="true" /></span>
        <h1 className="mt-5 text-3xl font-medium">Request sent</h1>
        <p className="mt-3 whitespace-pre-line text-muted-foreground">{list.thank_you?.trim() || `Thanks. ${business} will get back to you shortly.`}</p>
        <p className="mt-10 text-xs text-muted-foreground">Made with NikoForm</p>
      </div>
    </main>
  );
}
