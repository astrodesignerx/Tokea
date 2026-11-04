import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { billingToday, canEditDocument, canTransition, displayStatus } from "@/lib/billing/status";
import { convertQuoteToInvoiceAction, deleteDraftDocumentAction, duplicateDocumentAction, setDocumentStatusAction } from "@/lib/actions/billing";
import { ActionButton } from "@/components/billing/action-button";
import { StatusBadge } from "@/components/billing/document-list";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Billing document" };
const STATUS_ACTIONS = [{ status: "sent", label: "Mark sent" }, { status: "accepted", label: "Mark accepted" }, { status: "declined", label: "Mark declined" }, { status: "void", label: "Void" }];

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const doc = await prisma.billingDocument.findFirst({ where: { id, owner_id: user.id }, include: { items: { orderBy: { position: "asc" } } } });
  if (!doc) notFound();
  const [profile, source, invoices] = await Promise.all([
    prisma.billingProfile.findUnique({ where: { user_id: user.id } }),
    doc.source_quote_id ? prisma.billingDocument.findFirst({ where: { id: doc.source_quote_id, owner_id: user.id }, select: { id: true, number: true } }) : null,
    prisma.billingDocument.findMany({ where: { source_quote_id: doc.id, owner_id: user.id }, select: { id: true, number: true } }),
  ]);
  const money = (amount: number) => formatMoney(amount, doc.currency);
  const colour = profile?.brand_primary && /^#[a-fA-F\d]{6}$/.test(profile.brand_primary) ? profile.brand_primary : "#111111";
  const accent = profile?.brand_accent && /^#[a-fA-F\d]{6}$/.test(profile.brand_accent) ? profile.brand_accent : "#f7ad19";
  const typeLabel = doc.type.charAt(0).toUpperCase() + doc.type.slice(1);
  return <>
    <div className="flex flex-wrap items-center gap-3"><h1 className="min-w-0 break-words font-display text-3xl font-medium tracking-tight">{doc.number}</h1><StatusBadge status={displayStatus(doc, billingToday())} /></div>
    <div className="mt-5 flex flex-wrap gap-2" aria-label="Document actions">
      {canEditDocument(doc) && <Button asChild size="sm"><Link href={`/dashboard/billing/${doc.id}/edit`}>Edit</Link></Button>}
      {STATUS_ACTIONS.filter((a) => canTransition(doc.type, doc.status, a.status)).map((a) => <ActionButton key={a.status} action={setDocumentStatusAction} id={doc.id} fields={{ status: a.status }} label={a.label} destructive={a.status === "void"} confirm={a.status === "void" ? "Void this document? Its number will remain reserved." : undefined} />)}
      {doc.type === "quote" && doc.status === "accepted" && invoices.length === 0 && <ActionButton action={convertQuoteToInvoiceAction} id={doc.id} label="Convert to invoice" />}
      {doc.type !== "receipt" && <ActionButton action={duplicateDocumentAction} id={doc.id} label="Duplicate" />}
      {doc.status === "draft" && doc.type !== "receipt" && <ActionButton action={deleteDraftDocumentAction} id={doc.id} label="Delete draft" destructive confirm="Delete this draft? Its number will never be reused." />}
    </div>
    {doc.status === "sent" && <p className="qr-fade mt-4 text-sm text-muted-foreground">This document is still editable. The customer may already have the old version.</p>}
    {(source || invoices.length > 0) && <div className="mt-4 flex flex-wrap gap-4 text-sm">
      {source && <Link href={`/dashboard/billing/${source.id}`} className="underline underline-offset-4">Source quote: {source.number}</Link>}
      {invoices.map((invoice) => <Link key={invoice.id} href={`/dashboard/billing/${invoice.id}`} className="underline underline-offset-4">Invoice: {invoice.number}</Link>)}
    </div>}
    <article className={`nf-panel mt-8 overflow-hidden ${profile?.font === "serif" ? "font-serif" : profile?.font === "poppins" ? "font-display" : "font-sans"}`} aria-label={`${typeLabel} ${doc.number}`}>
      <div className="h-2" style={{ backgroundColor: doc.template === "minimal" ? colour : accent }} />
      <div className="p-5 sm:p-10">
        <header className="flex flex-wrap justify-between gap-6 border-b pb-8">
          <div className="min-w-0 max-w-md">
            {profile?.logo_url && <Image src={profile.logo_url} alt={`${profile.business_name} logo`} width={160} height={80} unoptimized className="mb-4 max-h-20 w-auto max-w-40 object-contain" />}
            <h2 className="break-words text-xl font-semibold">{profile?.business_name || user.name || user.email}</h2>
            <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">{[profile?.address, profile?.email, profile?.phone, profile?.website, profile?.social_handle, profile?.kra_pin && `KRA PIN: ${profile.kra_pin}`].filter(Boolean).join("\n")}</p>
          </div>
          <div className={doc.template === "bold" ? "rounded-lg p-4" : ""} style={doc.template === "bold" ? { borderLeft: `4px solid ${accent}` } : undefined}>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{typeLabel}</p><p className="mt-2 text-2xl font-semibold">{doc.number}</p>
            {doc.title && <p className="mt-3 max-w-sm whitespace-pre-line break-words text-sm font-medium">{doc.title}</p>}
          </div>
        </header>
        <div className="grid gap-8 py-8 sm:grid-cols-2">
          <section><h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bill to</h3><p className="mt-3 font-semibold">{doc.bill_to_name}</p><p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed">{[doc.bill_to_company, doc.bill_to_address, doc.bill_to_email, doc.bill_to_phone, doc.bill_to_kra_pin && `KRA PIN: ${doc.bill_to_kra_pin}`].filter(Boolean).join("\n")}</p></section>
          <dl className="space-y-2 text-sm sm:justify-self-end"><div className="flex justify-between gap-6"><dt className="text-muted-foreground">Issue date</dt><dd>{doc.issue_date.toISOString().slice(0, 10)}</dd></div>{doc.due_date && <div className="flex justify-between gap-6"><dt className="text-muted-foreground">Due date</dt><dd>{doc.due_date.toISOString().slice(0, 10)}</dd></div>}{doc.valid_until && <div className="flex justify-between gap-6"><dt className="text-muted-foreground">Valid until</dt><dd>{doc.valid_until.toISOString().slice(0, 10)}</dd></div>}<div className="flex justify-between gap-6"><dt className="text-muted-foreground">Currency</dt><dd>{doc.currency}</dd></div></dl>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[30rem] text-left text-sm"><caption className="sr-only">Document items</caption><thead className="border-y bg-muted/40 text-xs text-muted-foreground"><tr><th scope="col" className="py-3 pl-3 font-medium">Item</th><th scope="col" className="px-3 py-3 text-right font-medium">Quantity</th><th scope="col" className="px-3 py-3 text-right font-medium">Unit price</th><th scope="col" className="px-3 py-3 text-right font-medium">Amount</th></tr></thead>
          {doc.items.map((item, n) => <tbody key={item.id}>{item.section && (n === 0 || doc.items[n - 1].section !== item.section) && <tr><th scope="rowgroup" colSpan={4} className="border-b px-3 pb-2 pt-5 text-xs font-semibold uppercase tracking-wide">{item.section}</th></tr>}<tr className="border-b align-top"><td className="max-w-md py-4 pl-3"><p className="break-words font-medium">{item.title}</p>{item.description && <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-muted-foreground">{item.description}</p>}</td><td className="px-3 py-4 text-right tabular-nums">{new Intl.NumberFormat("en-KE", { maximumFractionDigits: 3 }).format(item.quantity_milli / 1000)}</td><td className="whitespace-nowrap px-3 py-4 text-right tabular-nums">{money(item.unit_price)}</td><td className="whitespace-nowrap px-3 py-4 text-right tabular-nums">{money(item.line_total)}</td></tr></tbody>)}
        </table></div>
        <dl className="ml-auto mt-6 max-w-sm space-y-3 text-sm tabular-nums"><div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{money(doc.subtotal)}</dd></div><div className="flex justify-between gap-4"><dt>VAT{doc.vat_mode !== "none" ? ` (${doc.vat_rate_bp / 100}%, ${doc.vat_mode})` : ""}</dt><dd>{money(doc.vat_amount)}</dd></div><div className="flex justify-between gap-4 border-t pt-3 text-lg font-semibold"><dt>Total</dt><dd>{money(doc.total)}</dd></div>{doc.type === "invoice" && <><div className="flex justify-between gap-4"><dt>Amount paid</dt><dd>{money(doc.amount_paid)}</dd></div><div className="flex justify-between gap-4 font-semibold"><dt>Balance</dt><dd>{money(Math.max(0, doc.total - doc.amount_paid))}</dd></div></>}</dl>
        <div className="mt-10 space-y-6 text-sm">
          {[{ label: "Payment terms", text: doc.payment_terms }, { label: "Notes", text: doc.notes }, { label: "Terms", text: doc.terms }].filter((s) => s.text).map((s) => <section key={s.label}><h3 className="font-semibold">{s.label}</h3><p className="mt-2 whitespace-pre-line break-words leading-relaxed text-muted-foreground">{s.text}</p></section>)}
          {(profile?.bank_name || profile?.mpesa_number) && <section className="border-t pt-5"><h3 className="font-semibold">Payment details</h3><div className="mt-2 grid gap-4 text-muted-foreground sm:grid-cols-2">{profile.bank_name && <p className="whitespace-pre-line break-words">{[profile.bank_name, profile.bank_account_name, profile.bank_account_number && `Account: ${profile.bank_account_number}`, profile.bank_branch].filter(Boolean).join("\n")}</p>}{profile.mpesa_number && <p className="whitespace-pre-line break-words">{[`M-Pesa ${profile.mpesa_type ?? ""}: ${profile.mpesa_number}`, profile.mpesa_name, profile.mpesa_account && `Account: ${profile.mpesa_account}`].filter(Boolean).join("\n")}</p>}</div></section>}
        </div>
        {profile?.footer_text && <footer className="mt-10 border-t pt-5 text-center text-xs text-muted-foreground"><p className="whitespace-pre-line break-words">{profile.footer_text}</p></footer>}
      </div>
    </article>
  </>;
}
