import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { CustomerForm } from "@/components/billing/customer-form";

export const metadata = { title: "New billing customer" };
export default async function NewCustomerPage() {
  const user = await requireUser();
  const companies = await prisma.organisation.findMany({ where: { owner_id: user.id }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return <><p className="nf-eyebrow">Billing</p><h1 className="mt-3 font-display text-3xl font-medium tracking-tight">New customer</h1><CustomerForm companies={companies} /></>;
}
