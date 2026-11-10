import Link from "next/link";

export function TodoListTabs({ id, active, count, unread }: {
  id: string;
  active: "edit" | "responses";
  count: number;
  unread: boolean;
}) {
  return <nav className="my-4 flex flex-wrap gap-2" aria-label="To-do list">
    <Link href={`/dashboard/todo/${id}`} aria-current={active === "edit" ? "page" : undefined} className="todo-response-pill rounded-full border px-4 py-2 text-sm">Edit</Link>
    <Link href={`/dashboard/todo/${id}/responses`} aria-current={active === "responses" ? "page" : undefined} className="todo-response-pill inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm">
      Responses <span className="tabular-nums">{count}</span>
      {unread && <><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" /><span className="sr-only">Unread responses</span></>}
    </Link>
  </nav>;
}
