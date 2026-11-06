import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { REQUEST_STATUSES } from "@/lib/todo/logic";
import { formatMoney } from "@/lib/money";
import { getCardsOrigin } from "@/lib/cards/links";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

export const metadata = { title: "To-do" };

export default async function TodoOverview({ searchParams }: { searchParams: Promise<{ status?: string; list?: string; page?: string }> }) {
  const user = await requireUser();
  const search = await searchParams;
  const status = REQUEST_STATUSES.find((s) => s === search.status);
  const lists = await prisma.todoList.findMany({ where: { owner_id: user.id }, orderBy: { updated_at: "desc" }, include: { _count: { select: { requests: true } } } });
  const listId = lists.some((l) => l.id === search.list) ? search.list : undefined;
  const where = { list: { owner_id: user.id }, ...(listId ? { list_id: listId } : {}), ...(status ? { status } : {}) };
  const page = Math.max(1, Math.min(100000, Math.floor(Number(search.page) || 1)));
  const [requests, total, origin] = await Promise.all([
    prisma.todoRequest.findMany({ where, orderBy: [{ created_at: "desc" }, { id: "desc" }], take: 50, skip: (page - 1) * 50, include: { list: { select: { title: true } }, _count: { select: { items: true } } } }),
    prisma.todoRequest.count({ where }), getCardsOrigin(),
  ]);
  const hasEstimate = requests.some((r) => r.estimate !== null);
  function url(nextStatus?: string, nextPage = 1) {
    const query = new URLSearchParams();
    if (nextStatus) query.set("status", nextStatus);
    if (listId) query.set("list", listId);
    if (nextPage > 1) query.set("page", String(nextPage));
    return `/dashboard/todo?${query}`;
  }
  const day = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="nf-eyebrow">Your services</p><h1 className="mt-3 text-3xl font-medium">To-do</h1><p className="mt-2 text-sm text-muted-foreground">Client requests and the service lists you share.</p></div><Button asChild><Link href="/dashboard/todo/new">New to-do list</Link></Button></div>
    <section className="mt-10" aria-labelledby="inbox-title">
      <h2 id="inbox-title" className="text-xl font-medium">Requests inbox</h2>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <nav className="flex flex-wrap gap-2" aria-label="Request status">
          {[undefined, ...REQUEST_STATUSES].map((s) => <Link key={s ?? "all"} href={url(s)} aria-current={s === status ? "page" : undefined} className={`rounded-full border px-3 py-2 text-xs capitalize ${s === status ? "bg-primary text-primary-foreground" : "bg-card"}`}>{s ?? "All"}</Link>)}
        </nav>
        <form className="flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="sr-only" htmlFor="todo-list-filter">Filter by list</label>
          <select id="todo-list-filter" name="list" defaultValue={listId ?? ""} className="max-w-48 rounded-md border bg-background px-2 py-2 text-sm"><option value="">All lists</option>{lists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
          <Button type="submit" variant="outline" size="sm">Filter</Button>
        </form>
      </div>
      <div key={`${status}:${listId}:${page}`} className="todo-rise mt-4 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground"><tr><th className="p-4 font-medium">Client</th><th className="p-4 font-medium">List</th><th className="p-4 font-medium">Event date</th><th className="p-4 font-medium">Items</th>{hasEstimate && <th className="p-4 font-medium">Estimate</th>}<th className="p-4 font-medium">Status</th></tr></thead>
          <tbody>{requests.map((r) => <tr key={r.id} className={`border-b last:border-0 ${r.status === "new" && !r.seen_at ? "font-semibold" : ""}`}>
            <td className="p-4"><Link prefetch={false} href={`/dashboard/todo/requests/${r.id}`} className="underline underline-offset-4">{r.name}</Link>{r.status === "new" && !r.seen_at && <span className="sr-only">, unread</span>}</td>
            <td className="p-4">{r.list.title}</td><td className="p-4 whitespace-nowrap">{r.event_date ? day(r.event_date) : "Not given"}</td><td className="p-4 tabular-nums">{r._count.items}</td>
            {hasEstimate && <td className="p-4 whitespace-nowrap font-mono text-xs">{r.estimate === null ? "" : formatMoney(r.estimate, r.currency)}</td>}
            <td className="p-4"><span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{r.status}</span></td>
          </tr>)}</tbody>
        </table>
        {!requests.length && <p className="p-6 text-sm text-muted-foreground">No requests here yet. Share an open list to start receiving them.</p>}
      </div>
      {total > 50 && <nav className="mt-4 flex items-center gap-4 text-sm" aria-label="Inbox pages">{page > 1 && <Link href={url(status, page - 1)}>Previous</Link>}<span>Page {page} of {Math.max(1, Math.ceil(total / 50))}</span>{page * 50 < total && <Link href={url(status, page + 1)}>Next</Link>}</nav>}
    </section>
    <section className="mt-10" aria-labelledby="lists-title"><h2 id="lists-title" className="text-xl font-medium">Your lists</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{lists.map((list) => <div key={list.id} className="nf-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/dashboard/todo/${list.id}`} className="font-medium underline underline-offset-4">{list.title}</Link><span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{list.status}</span></div>
        <p className="mt-3 text-sm text-muted-foreground">{list._count.requests} {list._count.requests === 1 ? "request" : "requests"}</p>
        <div className="mt-3 flex items-center gap-1"><a href={`${origin}/t/${list.slug}`} target="_blank" rel="noreferrer" className="min-w-0 truncate font-mono text-xs text-brand">{origin}/t/{list.slug}</a><CopyButton value={`${origin}/t/${list.slug}`} /></div>
      </div>)}</div>
      {!lists.length && <p className="mt-4 text-sm text-muted-foreground">Create a list of your services, then share its link or QR code.</p>}
    </section>
  </div>;
}
