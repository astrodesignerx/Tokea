import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { TodoEditor } from "@/components/todo/todo-editor";

export const metadata = { title: "New to-do list" };

export default async function NewTodoPage() {
  const user = await requireUser();
  const organisations = await prisma.organisation.findMany({ where: { owner_id: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <Link href="/dashboard/todo" className="text-sm text-muted-foreground">Back to To-do</Link>
    <h1 className="mt-5 text-3xl font-medium">New to-do list</h1>
    <p className="mt-2 text-sm text-muted-foreground">Share your services and collect client requests.</p>
    <TodoEditor id={null} organisations={organisations} initial={{ title: "", intro: "", organisation_id: "", status: "draft", layout: "list", allow_view_switch: false, show_prices: false, ask_event_date: true, notify_emails: [], thank_you: "", updated_at: "", sections: [], items: [] }} />
  </div>;
}
