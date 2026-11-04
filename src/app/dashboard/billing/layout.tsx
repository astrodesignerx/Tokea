import Link from "next/link";
import { Receipt, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <nav aria-label="Billing" className="mb-8 flex flex-wrap gap-2">
      <Button asChild variant="ghost" size="sm"><Link href="/dashboard/billing"><Receipt className="size-4" /> Documents</Link></Button>
      <Button asChild variant="ghost" size="sm"><Link href="/dashboard/billing/customers"><Users className="size-4" /> Customers</Link></Button>
      <Button asChild variant="ghost" size="sm"><Link href="/dashboard/billing/settings"><Settings className="size-4" /> Settings</Link></Button>
    </nav>
    {children}
  </div>;
}
