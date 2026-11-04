import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { editorData, documentInput } from "@/lib/billing-data";
import { canEditDocument } from "@/lib/billing/status";
import { updateDocumentAction } from "@/lib/actions/billing";
import { DocumentForm } from "@/components/billing/document-form";

export const metadata = { title: "Edit billing document" };
export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const doc = await prisma.billingDocument.findFirst({ where: { id, owner_id: user.id }, include: { items: { orderBy: { position: "asc" } } } });
  if (!doc) notFound();
  if (!canEditDocument(doc)) redirect(`/dashboard/billing/${doc.id}`);
  const { customers, templates } = await editorData(user.id, doc.customer_id);
  return <><p className="nf-eyebrow">Billing</p><h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Edit {doc.number}</h1><DocumentForm id={doc.id} type={doc.type as "quote" | "invoice"} initial={documentInput(doc)} customers={customers} templates={templates} action={updateDocumentAction} sent={doc.status === "sent"} /></>;
}
