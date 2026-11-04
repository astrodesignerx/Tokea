import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { profileInput } from "@/lib/billing-data";
import { templatesFor } from "@/lib/billing/templates";
import { ProfileForm } from "@/components/billing/profile-form";

export const metadata = { title: "Billing settings" };
export default async function BillingSettingsPage() {
  const user = await requireUser();
  const profile = await prisma.billingProfile.findUnique({ where: { user_id: user.id } });
  return <><p className="nf-eyebrow">Billing</p><h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Billing settings</h1><p className="mt-2 text-sm text-muted-foreground">Your business details, document numbering and defaults.</p><ProfileForm initial={profileInput(profile, user)} templates={templatesFor(profile ?? {})} /></>;
}
