import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { signOutAction } from "@/lib/actions/auth";
import { Avatar } from "@/components/profile/avatar";
import { ProfileDetailsForm, ProfileRemindersForm } from "@/components/profile/profile-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [organisations, events, qrCodes, forms, checklists] = await Promise.all([
    prisma.organisation.count({ where: { owner_id: user.id } }),
    prisma.event.count({ where: { owner_id: user.id } }),
    prisma.qrCode.count({ where: { owner_id: user.id, status: { not: "archived" } } }),
    prisma.form.count({ where: { owner_id: user.id, status: { not: "archived" } } }),
    prisma.checklist.count({ where: { members: { some: { user_id: user.id } }, archived_at: null } }),
  ]);
  const activity = [
    { label: "Organisations", count: organisations, href: "/dashboard/companies" },
    { label: "Events", count: events, href: "/dashboard/events" },
    { label: "QR codes", count: qrCodes, href: "/dashboard/qr" },
    { label: "Forms", count: forms, href: "/dashboard/forms" },
    { label: "Checklists", count: checklists, href: "/dashboard/checklists" },
  ];
  const memberSince = new Intl.DateTimeFormat("en-GB", {
    month: "long", year: "numeric", timeZone: "Africa/Nairobi",
  }).format(user.created_at);

  return (
    <div className="qr-rise mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <header>
        <p className="nf-eyebrow">Your account</p>
        <div className="mt-4 flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0">
            <h1 className="break-words font-display text-2xl font-medium tracking-tight sm:text-3xl">{user.name || "Add your name"}</h1>
            <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-2 text-xs text-muted-foreground">Member since {memberSince}</p>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">Details</h2></CardHeader>
        <CardContent><ProfileDetailsForm name={user.name} email={user.email} /></CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">Email reminders</h2></CardHeader>
        <CardContent><ProfileRemindersForm enabled={user.task_reminders} /></CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">Your activity</h2></CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {activity.map(({ label, count, href }) => (
              <li key={href}>
                <Link href={href} className="group flex items-center gap-3 rounded-md py-3 text-sm transition-opacity duration-(--fast) ease-(--ease) hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none">
                  <span className="min-w-0 flex-1">{label}</span>
                  <span className="font-mono tabular-nums">{count}</span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-brand transition-transform duration-(--fast) ease-(--ease) group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none" />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <form action={signOutAction}><Button type="submit" variant="outline">Sign out</Button></form>
    </div>
  );
}
