"use client";

import Link from "next/link";
import { useState } from "react";
import { BillingInput, Field } from "./form-fields";
import { FadeContent } from "./document-list";

export function CustomerList({ customers }: { customers: { id: string; name: string; company: string | null; email: string | null; archived: boolean }[] }) {
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const visible = customers.filter((c) => (archived || !c.archived) && `${c.name} ${c.company ?? ""} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="mt-6">
    <div className="flex flex-wrap items-end gap-5"><div className="w-full max-w-md"><Field label="Search customers"><BillingInput type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, company or email" /></Field></div><label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Include archived</label></div>
    <div className="mt-5"><FadeContent identity={`${search}/${archived}`}>
      {visible.length ? <ul className="divide-y rounded-xl border bg-card">{visible.map((c) => <li key={c.id}><Link href={`/dashboard/billing/customers/${c.id}`} className="block rounded-lg p-5 transition-opacity duration-(--fast) ease-(--ease) motion-reduce:transition-none hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"><p className="break-words font-medium">{c.name}{c.archived ? " (archived)" : ""}</p><p className="mt-1 break-words text-sm text-muted-foreground">{[c.company, c.email].filter(Boolean).join(" / ")}</p></Link></li>)}</ul> : <div className="nf-panel p-8 text-sm text-muted-foreground">No customers match. Save a customer to reuse their details on quotes and invoices.</div>}
    </FadeContent></div>
  </div>;
}
