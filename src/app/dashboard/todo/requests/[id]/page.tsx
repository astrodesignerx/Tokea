import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { REQUEST_STATUSES } from "@/lib/todo/logic";
import { setTodoRequestStatusAction } from "@/lib/actions/todo";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";

export const metadata = { title: "To-do request" };

export default async function TodoRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const request = await prisma.todoRequest.findFirst({ where: { id, list: { owner_id: user.id } }, include: { list: { select: { title: true, id: true } }, items: { orderBy: { created_at: "asc" } } } });
  if (!request) notFound();
  if (!request.seen_at) await prisma.todoRequest.updateMany({ where: { id, seen_at: null, list: { owner_id: user.id } }, data: { seen_at: new Date() } });
  const hasPrices = request.items.some((i) => i.unit_price !== null);
  const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
    <Link href="/dashboard/todo" className="text-sm text-muted-foreground">Back to requests</Link>
    <div className="mt-5 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-medium">{request.name}</h1><span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{request.status}</span></div>
    <p className="mt-2 text-sm text-muted-foreground"><Link href={`/dashboard/todo/${request.list.id}`} className="underline">{request.list.title}</Link>, received {date(request.created_at)}</p>
    <section className="nf-panel mt-6 p-5" aria-label="Contact details">
      <h2 className="font-medium">Contact</h2>
      <div className="mt-3 flex flex-wrap gap-3 text-sm"><a className="underline" href={`tel:${request.phone}`}>{request.phone}</a><a className="underline" href={`https://wa.me/${request.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>{request.email && <a className="break-all underline" href={`mailto:${request.email}`}>{request.email}</a>}</div>
      {request.event_date && <p className="mt-4 text-sm"><strong>Event date:</strong> {date(request.event_date)}</p>}
      {request.notes && <div className="mt-4"><h3 className="text-sm font-medium">Notes</h3><p className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground">{request.notes}</p></div>}
    </section>
    <section className="nf-panel mt-5 overflow-x-auto p-5" aria-label="Picked services">
      <h2 className="font-medium">Picked services</h2>
      <table className="mt-3 w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="py-2 font-medium">Service</th><th className="px-2 py-2 font-medium">Qty</th>{hasPrices && <><th className="px-2 py-2 font-medium">Unit price</th><th className="py-2 text-right font-medium">Total</th></>}</tr></thead><tbody>
        {request.items.map((i) => <tr key={i.id} className="border-t"><td className="py-3">{i.name}</td><td className="px-2 py-3 tabular-nums">{i.quantity}</td>{hasPrices && <><td className="px-2 py-3 font-mono text-xs">{i.unit_price === null ? "" : formatMoney(i.unit_price, request.currency)}</td><td className="py-3 text-right font-mono text-xs">{i.line_total === null ? "" : formatMoney(i.line_total, request.currency)}</td></>}</tr>)}
      </tbody></table>
      {request.estimate !== null && <p className="mt-3 border-t pt-4 text-right text-sm font-medium">Estimate: {formatMoney(request.estimate, request.currency)}</p>}
    </section>
    <section className="mt-6" aria-label="Request status"><h2 className="mb-3 font-medium">Update status</h2><div className="flex flex-wrap gap-2">
      {REQUEST_STATUSES.map((status) => <form key={status} action={setTodoRequestStatusAction}><input type="hidden" name="request_id" value={id} /><input type="hidden" name="status" value={status} /><Button type="submit" disabled={request.status === status} variant={status === "archived" ? "outline" : request.status === status ? "default" : "secondary"} className="capitalize">{status === "archived" ? "Archive" : status}</Button></form>)}
    </div></section>
  </div>;
}
