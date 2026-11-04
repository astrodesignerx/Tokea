"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Receipt } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { statusLabel } from "@/lib/billing/status";
import { BillingInput, Field } from "./form-fields";

export type DocumentRow = { id: string; type: string; number: string; bill_to_name: string; bill_to_company: string | null; title: string | null; issue_date: string; currency: string; total: number; display_status: string };

export function StatusBadge({ status }: { status: string }) {
  return <span key={status} className={`qr-fade inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${["overdue", "expired", "declined", "void"].includes(status) ? "border-amber-500/40 bg-amber-500/10 text-foreground" : ["paid", "accepted", "issued"].includes(status) ? "border-emerald-500/40 bg-emerald-500/10 text-foreground" : "bg-muted text-muted-foreground"}`}>{statusLabel(status)}</span>;
}

export function FadeContent({ identity, children }: { identity: string; children: ReactNode }) {
  const [frame, setFrame] = useState({ identity, node: children });
  const [outgoing, setOutgoing] = useState<ReactNode>(null);
  if (frame.identity !== identity || frame.node !== children) {
    setFrame({ identity, node: children });
    if (frame.identity !== identity) setOutgoing(frame.node);
  }
  useEffect(() => {
    const timer = setTimeout(() => setOutgoing(null), 160);
    return () => clearTimeout(timer);
  }, [identity]);
  return <div className="relative">
    {outgoing && <div className="billing-fade-out pointer-events-none absolute inset-x-0 top-0" aria-hidden="true" inert>{outgoing}</div>}
    <div key={identity} className="qr-fade">{children}</div>
  </div>;
}

export function DocumentRows({ documents }: { documents: DocumentRow[] }) {
  return <ul className="divide-y rounded-xl border bg-card">{documents.map((doc) => <li key={doc.id}>
    <Link href={`/dashboard/billing/${doc.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-lg p-4 transition-opacity duration-(--fast) ease-(--ease) hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:p-5">
      <div className="min-w-0 flex-1 basis-40"><p className="font-medium">{doc.number}</p><p className="mt-1 break-words text-sm">{doc.bill_to_name}{doc.bill_to_company ? ` / ${doc.bill_to_company}` : ""}</p>{doc.title && <p className="mt-1 break-words text-xs text-muted-foreground">{doc.title}</p>}</div>
      <div className="text-right"><p className="text-sm font-medium tabular-nums">{formatMoney(doc.total, doc.currency)}</p><p className="mt-1 text-xs text-muted-foreground">{doc.issue_date}</p></div>
      <StatusBadge status={doc.display_status} />
    </Link>
  </li>)}</ul>;
}

const FILTERS = {
  quote: ["all", "draft", "sent", "accepted", "declined", "expired", "void"],
  invoice: ["all", "draft", "sent", "part_paid", "paid", "overdue", "void"],
  receipt: ["all", "issued"],
};

export function DocumentList({ documents, initialType = "quote" }: { documents: DocumentRow[]; initialType?: "quote" | "invoice" | "receipt" }) {
  const [type, setType] = useState(initialType);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = documents.filter((d) => d.type === type && (filter === "all" || d.display_status === filter) && `${d.number} ${d.bill_to_name} ${d.bill_to_company ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="mt-8">
    <div className="flex gap-2 overflow-x-auto border-b pb-3" role="tablist" aria-label="Document type">
      {(["quote", "invoice", "receipt"] as const).map((t, index, all) => <button key={t} id={`billing-tab-${t}`} type="button" role="tab" aria-selected={type === t} aria-controls="billing-list-panel" tabIndex={type === t ? 0 : -1} onClick={() => { setType(t); setFilter("all"); }} onKeyDown={(event) => {
        const next = event.key === "ArrowRight" ? all[(index + 1) % all.length] : event.key === "ArrowLeft" ? all[(index + all.length - 1) % all.length] : event.key === "Home" ? all[0] : event.key === "End" ? all[all.length - 1] : null;
        if (next) { event.preventDefault(); setType(next); setFilter("all"); document.getElementById(`billing-tab-${next}`)?.focus(); }
      }} className={`rounded-md px-4 py-2 text-sm transition-opacity duration-(--fast) ease-(--ease) motion-reduce:transition-none hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${type === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{t === "quote" ? "Quotes" : t === "invoice" ? "Invoices" : "Receipts"}</button>)}
    </div>
    <div className="mt-5 max-w-md"><Field label="Search documents"><BillingInput type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Number or customer" /></Field></div>
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter by status">{FILTERS[type].map((status) => <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)} className={`rounded-full border px-3 py-1.5 text-xs transition-opacity duration-(--fast) ease-(--ease) hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none ${filter === status ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>{statusLabel(status)}</button>)}</div>
    <div id="billing-list-panel" role="tabpanel" aria-labelledby={`billing-tab-${type}`} className="mt-5">
      <FadeContent identity={`${type}/${filter}/${search}`}>
        {filtered.length ? <DocumentRows documents={filtered} /> : <div className="nf-panel p-8 text-center sm:p-12"><Receipt className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 font-display text-xl font-medium">{type === "receipt" ? "Receipts will appear here" : documents.some((d) => d.type === type) ? "No matching documents" : `Create your first ${type}`}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{type === "receipt" ? "Receipts will be created when payment recording is available." : "Create numbered quotes and invoices, keep customer details together and track each document from draft to completion."}</p></div>}
      </FadeContent>
    </div>
  </div>;
}
