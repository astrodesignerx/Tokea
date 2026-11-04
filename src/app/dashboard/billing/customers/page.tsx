import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { CustomerList } from "@/components/billing/customer-list";

export const metadata = { title: "Billing customers" };
export default async function CustomersPage() {
  const user = await requireUser();
  const customers = await prisma.customer.findMany({ where: { owner_id: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true, email: true, archived_at: true } });
  return <><p className="nf-eyebrow">Billing</p><div className="mt-3 flex flex-wrap items-center justify-between gap-4"><h1 className="font-display text-3xl font-medium tracking-tight">Customers</h1><Button asChild><Link href="/dashboard/billing/customers/new"><Plus className="size-4" /> New customer</Link></Button></div><CustomerList customers={customers.map(({ archived_at, ...c }) => ({ ...c, archived: Boolean(archived_at) }))} /></>;
}
