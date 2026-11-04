import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { editorData, newDocumentInput } from "@/lib/billing-data";
import { createDocumentAction } from "@/lib/actions/billing";
import { DocumentForm } from "@/components/billing/document-form";

export const metadata = { title: "New billing document" };
export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await requireUser();
  const { type = "quote" } = await searchParams;
  if (type !== "quote" && type !== "invoice") notFound();
  const { profile, customers, templates } = await editorData(user.id);
  return <><p className="nf-eyebrow">Billing</p><h1 className="mt-3 font-display text-3xl font-medium tracking-tight">New {type}</h1><DocumentForm type={type} initial={newDocumentInput(profile)} customers={customers} templates={templates} action={createDocumentAction.bind(null, type)} /></>;
}
