import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { billingToday, displayStatus } from "@/lib/billing/status";
import { DocumentList } from "@/components/billing/document-list";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Billing" };
export default async function BillingPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await requireUser();
  const { type } = await searchParams;
  const documents = await prisma.billingDocument.findMany({ where: { owner_id: user.id }, orderBy: [{ created_at: "desc" }, { id: "desc" }], select: { id: true, type: true, number: true, bill_to_name: true, bill_to_company: true, title: true, issue_date: true, currency: true, total: true, amount_paid: true, due_date: true, valid_until: true, status: true } });
  const today = billingToday();
  return <>
    <p className="nf-eyebrow">Billing</p>
    <div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-3xl font-medium tracking-tight">Quotes and invoices</h1><p className="mt-2 text-sm text-muted-foreground">Number, organise and track your customer documents.</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/dashboard/billing/new?type=quote"><Plus className="size-4" /> New quote</Link></Button><Button asChild><Link href="/dashboard/billing/new?type=invoice"><Plus className="size-4" /> New invoice</Link></Button></div></div>
    <DocumentList initialType={type === "invoice" || type === "receipt" ? type : "quote"} documents={documents.map((doc) => ({ ...doc, issue_date: doc.issue_date.toISOString().slice(0, 10), due_date: undefined, valid_until: undefined, display_status: displayStatus(doc, today) }))} />
  </>;
}
