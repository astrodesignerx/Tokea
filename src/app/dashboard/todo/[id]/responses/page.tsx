import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { REQUEST_STATUSES, tallyRequestItems } from "@/lib/todo/logic";
import { todoResponseCounts } from "@/lib/todo/data";
import { formatMoney } from "@/lib/money";
import { TodoListTabs } from "@/components/todo/todo-list-tabs";

export const metadata = { title: "To-do responses" };

export default async function TodoResponsesPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const list = await prisma.todoList.findFirst({ where: { id, owner_id: user.id }, select: { title: true } });
  if (!list) notFound();

  const search = await searchParams;
  const status = REQUEST_STATUSES.find((value) => value === search.status);
  const page = Math.max(1, Math.min(100000, Math.floor(Number(search.page) || 1)));
  const owned = { list_id: id, list: { owner_id: user.id } };
  const where = { ...owned, ...(status ? { status } : {}) };
  const active = { ...owned, status: { not: "archived" } };
  const [responses, items, additionalNeeds, requests, total] = await Promise.all([
    todoResponseCounts(id, user.id),
    prisma.todoRequestItem.findMany({
      where: { request: active },
      select: { request_id: true, item_id: true, name: true, quantity: true, item: { select: { name: true } } },
    }),
    prisma.todoRequest.count({ where: { ...active, notes: { not: "" } } }),
    prisma.todoRequest.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: 50,
      skip: (page - 1) * 50,
      include: { _count: { select: { items: true } } },
    }),
    prisma.todoRequest.count({ where }),
  ]);
  const tally = tallyRequestItems(items);
  const hasEstimate = requests.some((request) => request.estimate !== null);
  function url(nextStatus?: string, nextPage = 1) {
    const query = new URLSearchParams();
    if (nextStatus) query.set("status", nextStatus);
    if (nextPage > 1) query.set("page", String(nextPage));
    return `/dashboard/todo/${id}/responses${query.size ? `?${query}` : ""}`;
  }
  const day = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return <div className="mx-auto min-w-0 max-w-3xl px-4 py-7 sm:px-6">
    <Link href="/dashboard/todo" className="inline-flex min-h-11 items-center text-sm text-muted-foreground">Back to To-do</Link>
    <TodoListTabs id={id} active="responses" {...responses} />
    <h1 className="mt-6 break-words text-3xl font-medium">{list.title}</h1>

    <section className="nf-panel todo-rise mt-6 min-w-0 p-5" aria-labelledby="most-picked-title">
      <h2 id="most-picked-title" className="text-lg font-medium">Most picked</h2>
      <p className="mt-1 text-sm text-muted-foreground">Across {responses.count} non-archived {responses.count === 1 ? "response" : "responses"}.</p>
      {tally.length > 0 && <ul className="mt-5 space-y-4">
        {tally.map((item, index) => <li key={item.key} className="relative min-w-0 pb-3">
          <div className="flex items-start justify-between gap-4 text-sm">
            <span className="min-w-0 break-words">{item.name}</span>
            <span className="shrink-0 text-right tabular-nums">
              {item.requests} {item.requests === 1 ? "request" : "requests"}
              {item.hasQuantity && <span className="block text-xs text-muted-foreground">{item.quantity} total quantity</span>}
            </span>
          </div>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-full bg-muted">
            <span className="todo-tally-bar absolute inset-0 rounded-full bg-primary/40" style={{ "--todo-share": responses.count ? item.requests / responses.count : 0, "--todo-delay": `${Math.min(index, 12) * 30}ms` } as CSSProperties} />
          </span>
        </li>)}
      </ul>}
      <p className="mt-5 text-sm text-muted-foreground"><span className="tabular-nums font-medium text-foreground">{additionalNeeds}</span> {additionalNeeds === 1 ? "request included" : "requests included"} additional needs.</p>
    </section>

    <section className="mt-8 min-w-0" aria-labelledby="submissions-title">
      <h2 id="submissions-title" className="text-xl font-medium">Submissions</h2>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Request status">
        {[undefined, ...REQUEST_STATUSES].map((value) => <Link key={value ?? "all"} href={url(value)} aria-current={value === status ? "page" : undefined} className="todo-response-pill rounded-full border px-3 py-2 text-xs capitalize">{value ?? "All"}</Link>)}
      </nav>
      <div key={`${status}:${page}`} className="todo-rise mt-4 max-w-full overflow-x-auto rounded-xl border bg-card" role="region" aria-label="Client submissions" tabIndex={0}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground"><tr>
            <th scope="col" className="p-4 font-medium">Client</th>
            <th scope="col" className="p-4 font-medium">Received</th>
            <th scope="col" className="p-4 font-medium">Event date</th>
            <th scope="col" className="p-4 font-medium">Items</th>
            {hasEstimate && <th scope="col" className="p-4 font-medium">Estimate</th>}
            <th scope="col" className="p-4 font-medium">Status</th>
          </tr></thead>
          <tbody>{requests.map((request) => <tr key={request.id} className={`border-b last:border-0 ${request.status === "new" && !request.seen_at ? "font-semibold" : ""}`}>
            <td className="p-4"><Link prefetch={false} href={`/dashboard/todo/requests/${request.id}`} className="underline underline-offset-4">{request.name}</Link>{request.status === "new" && !request.seen_at && <span className="sr-only">, unread</span>}</td>
            <td className="whitespace-nowrap p-4">{day(request.created_at)}</td>
            <td className="whitespace-nowrap p-4">{request.event_date ? day(request.event_date) : "Not given"}</td>
            <td className="p-4 tabular-nums">{request._count.items}</td>
            {hasEstimate && <td className="whitespace-nowrap p-4 font-mono text-xs">{request.estimate === null ? "" : formatMoney(request.estimate, request.currency)}</td>}
            <td className="p-4"><span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{request.status}</span></td>
          </tr>)}</tbody>
        </table>
        {!requests.length && <p className="p-6 text-sm text-muted-foreground">{total === 0 && !status ? "No responses yet. Share the list link or QR code to start receiving them." : "No responses with this status on this page."}</p>}
      </div>
      {total > 50 && <nav className="mt-4 flex flex-wrap items-center gap-4 text-sm" aria-label="Submission pages">
        {page > 1 && <Link className="todo-response-page-link" href={url(status, page - 1)}>Previous</Link>}
        <span>Page {page} of {Math.max(1, Math.ceil(total / 50))}</span>
        {page * 50 < total && <Link className="todo-response-page-link" href={url(status, page + 1)}>Next</Link>}
      </nav>}
    </section>
  </div>;
}
