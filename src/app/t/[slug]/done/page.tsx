import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { visibleTodo } from "@/lib/todo/data";
import { TODO_COPY } from "@/lib/todo/copy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: TODO_COPY.sharedTitle, robots: { index: false, follow: false } };

export default async function TodoDonePage({ params }: { params: Promise<{ slug: string }> }) {
  const list = await visibleTodo((await params).slug);
  if (!list || list.status === "draft") notFound();
  return (
    <main className="todo-surface flex min-h-dvh items-center px-5">
      <div className="todo-rise mx-auto w-full max-w-xl py-16 text-center">
        <p className="nf-eyebrow">{list.title}</p>
        <span className="mx-auto mt-6 flex size-14 items-center justify-center rounded-full bg-muted text-brand"><Check aria-hidden="true" /></span>
        <h1 className="mt-5 text-3xl font-medium">{TODO_COPY.sharedTitle}</h1>
        <p className="mt-3 whitespace-pre-line text-muted-foreground">{list.thank_you?.trim() ? list.thank_you : TODO_COPY.sharedMessage}</p>
        <p className="mt-10 text-xs text-muted-foreground">Made with NikoForm</p>
      </div>
    </main>
  );
}
