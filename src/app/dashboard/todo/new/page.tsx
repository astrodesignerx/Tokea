import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { TodoEditor } from "@/components/todo/todo-editor";
import { brandColours } from "@/lib/todo/data";

export const metadata = { title: "New to-do list" };

export default async function NewTodoPage() {
  const user = await requireUser();
  const organisations = await prisma.organisation.findMany({ where: { owner_id: user.id }, select: { id: true, name: true, logo_url: true, brand_primary: true, brand_ink: true }, orderBy: { name: "asc" } });
  return <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6">
    <Link href="/dashboard/todo" className="inline-flex min-h-11 items-center text-sm text-muted-foreground">Back to To-do</Link>
    <TodoEditor id={null} businessName={user.name ?? "NikoForm"} organisations={organisations.map((org) => ({ id: org.id, name: org.name, logo_url: org.logo_url, brand: brandColours(org.brand_primary, org.brand_ink) }))} initial={{ title: "", intro: "", organisation_id: "", status: "draft", layout: "list", allow_view_switch: false, show_prices: false, ask_event_date: true, notify_emails: [], thank_you: "", updated_at: "", sections: [], items: [] }} />
  </div>;
}
