import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { customerInput } from "@/lib/billing-data";
import { billingToday, displayStatus } from "@/lib/billing/status";
import { archiveCustomerAction } from "@/lib/actions/billing";
import { ActionButton } from "@/components/billing/action-button";
import { CustomerForm } from "@/components/billing/customer-form";
import { DocumentRows } from "@/components/billing/document-list";

export const metadata = { title: "Billing customer" };
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const customer = await prisma.customer.findFirst({ where: { id, owner_id: user.id } });
  if (!customer) notFound();
  const [companies, documents] = await Promise.all([
    prisma.organisation.findMany({ where: { owner_id: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.billingDocument.findMany({ where: { owner_id: user.id, customer_id: customer.id }, orderBy: { created_at: "desc" }, select: { id: true, type: true, number: true, bill_to_name: true, bill_to_company: true, title: true, issue_date: true, currency: true, total: true, amount_paid: true, due_date: true, valid_until: true, status: true } }),
  ]);
  return <><p className="nf-eyebrow">Billing customer</p><div className="mt-3 flex flex-wrap items-center justify-between gap-4"><h1 className="break-words font-display text-3xl font-medium tracking-tight">{customer.name}</h1><ActionButton action={archiveCustomerAction} id={customer.id} fields={customer.archived_at ? { restore: "yes" } : {}} label={customer.archived_at ? "Restore customer" : "Archive customer"} /></div><p className="mt-2 text-sm text-muted-foreground">{customer.archived_at ? "Archived. Restore this customer to use them on new documents." : "Changes here do not rewrite existing customer snapshots on sent documents."}</p><CustomerForm id={customer.id} initial={customerInput(customer)} companies={companies} /><section className="mt-10"><h2 className="mb-4 font-display text-xl font-medium">Documents</h2>{documents.length ? <DocumentRows documents={documents.map((doc) => ({ ...doc, issue_date: doc.issue_date.toISOString().slice(0, 10), display_status: displayStatus(doc, billingToday()) }))} /> : <p className="text-sm text-muted-foreground">No documents for this customer yet.</p>}</section></>;
}
