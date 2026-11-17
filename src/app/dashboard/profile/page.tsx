import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  IdCard,
  ListChecks,
  Mail,
  Phone,
  QrCode,
} from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { signOutAction } from "@/lib/actions/auth";
import { getProfileData, type ActivityKind } from "@/lib/profile/data";
import { AvatarEditor } from "@/components/profile/avatar-editor";
import { ProfileEditSheet } from "@/components/profile/profile-edit-sheet";
import { ProfileRemindersForm } from "@/components/profile/profile-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata = { title: "Profile" };

function activityIcon(kind: ActivityKind) {
  switch (kind) {
    case "card_scan":
      return IdCard;
    case "qr_scan":
      return QrCode;
    case "form_response":
      return ClipboardList;
    case "rsvp":
      return CalendarCheck;
  }
}

export default async function ProfilePage() {
  const user = await requireUser();
  const data = await getProfileData(user.id);

  const defaultOrg = user.default_organisation_id
    ? data.organisations.find((org) => org.id === user.default_organisation_id) ?? null
    : null;

  const roleLine =
    user.job_title && defaultOrg
      ? `${user.job_title} at ${defaultOrg.name}`
      : user.job_title || defaultOrg?.name || null;

  const memberSince = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(user.created_at);

  const statTiles = [
    {
      label: "Companies",
      value: data.stats.companies,
      href: "/dashboard/companies",
      icon: Building2,
    },
    {
      label: "Active cards",
      value: data.stats.activeCards,
      href: "/dashboard/companies",
      icon: IdCard,
    },
    {
      label: "Scans in last 30 days",
      value: data.stats.scans30d,
      href: "/dashboard/analytics",
      icon: QrCode,
    },
    {
      label: "Upcoming events",
      value: data.stats.upcomingEvents,
      href: "/dashboard/events",
      icon: CalendarDays,
    },
    {
      label: "Form replies in last 30 days",
      value: data.stats.formReplies30d,
      href: "/dashboard/forms",
      icon: ClipboardList,
    },
    {
      label: "Open checklist tasks",
      value: data.stats.openChecklistTasks,
      href: "/dashboard/checklists",
      icon: ListChecks,
    },
  ];

  const hasThisWeek =
    data.thisWeekTasks.length > 0 || data.thisWeekEvents.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <section className="qr-rise nf-panel overflow-hidden">
        <div className="relative h-[140px] overflow-hidden border-b bg-tint">
          <div className="grid-backdrop absolute inset-0" aria-hidden="true" />
        </div>

        <div className="px-5 pb-6 sm:px-6">
          <div className="-mt-12">
            <AvatarEditor user={user} />
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="break-words font-display text-2xl font-medium tracking-tight sm:text-3xl">
                {user.name || "Add your name"}
              </h1>

              {roleLine ? (
                <p className="mt-1 break-words text-sm text-foreground/90">
                  {roleLine}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="break-all">{user.email}</span>
                </span>

                {user.phone ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{user.phone}</span>
                  </span>
                ) : null}

                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>Member since {memberSince}</span>
                </span>
              </div>
            </div>

            <div className="shrink-0">
              <ProfileEditSheet
                initial={{
                  name: user.name,
                  job_title: user.job_title,
                  phone: user.phone,
                  bio: user.bio,
                  default_organisation_id: user.default_organisation_id,
                }}
                organisations={data.organisations}
              />
            </div>
          </div>

          {user.bio ? (
            <p className="mt-4 max-w-2xl whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
              {user.bio}
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section
            aria-label="Account stats"
            className="qr-rise"
            style={{ animationDelay: "40ms" }}
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {statTiles.map(({ label, value, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="group nf-panel block p-4 transition-transform duration-(--fast) ease-(--ease) hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Icon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-brand transition-transform duration-(--fast) ease-(--ease) group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0"
                    />
                  </div>
                  <p className="mt-3 font-display text-2xl font-medium tabular-nums sm:text-3xl">
                    {value}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-sm">
                    {label}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <Card className="qr-rise" style={{ animationDelay: "80ms" }}>
            <CardHeader>
              <p className="nf-eyebrow">Live feed</p>
              <h2 className="font-display text-lg font-medium tracking-tight">
                Recent activity
              </h2>
            </CardHeader>
            <CardContent>
              {data.activityGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity yet across your cards, QR codes, forms, or events.{" "}
                  <Link
                    href="/dashboard"
                    className="font-medium text-brand underline-offset-4 hover:underline"
                  >
                    Open dashboard
                  </Link>
                </p>
              ) : (
                <div className="space-y-5">
                  {data.activityGroups.map((group) => (
                    <div key={group.key}>
                      <h3 className="text-xs font-medium text-muted-foreground">
                        {group.label}
                      </h3>
                      <ul className="mt-2 divide-y divide-border">
                        {group.items.map((item) => {
                          const Icon = activityIcon(item.kind);
                          return (
                            <li key={item.id}>
                              <Link
                                href={item.href}
                                className="group flex items-center gap-3 rounded-md py-3 text-sm transition-opacity duration-(--fast) ease-(--ease) hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
                              >
                                <Icon
                                  aria-hidden="true"
                                  className="size-4 shrink-0 text-brand"
                                />
                                <span className="min-w-0 flex-1 break-words">
                                  {item.text}
                                </span>
                                <time
                                  dateTime={item.at.toISOString()}
                                  className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                                >
                                  {item.relative}
                                </time>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside
          className="qr-rise min-w-0 space-y-6"
          style={{ animationDelay: "120ms" }}
        >
          <Card>
            <CardHeader>
              <p className="nf-eyebrow">Schedule</p>
              <h2 className="font-display text-lg font-medium tracking-tight">
                This week
              </h2>
            </CardHeader>
            <CardContent className="space-y-5">
              {!hasThisWeek ? (
                <p className="text-sm text-muted-foreground">
                  Nothing due in the next 7 days and no upcoming events in the
                  next 30 days.
                </p>
              ) : (
                <>
                  {data.thisWeekTasks.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-medium text-muted-foreground">
                          Checklist tasks
                        </h3>
                        <Link
                          href="/dashboard/checklists"
                          className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                        >
                          All <ArrowRight className="size-3" />
                        </Link>
                      </div>
                      <ul className="mt-2 divide-y divide-border">
                        {data.thisWeekTasks.map((task) => (
                          <li key={task.id}>
                            <Link
                              href={`/dashboard/checklists/${task.checklistId}`}
                              className="flex items-start justify-between gap-2.5 rounded-md py-2.5 text-sm transition-opacity duration-(--fast) ease-(--ease) hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                  {task.title}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {task.checklistTitle}
                                </p>
                              </div>
                              {task.overdue ? (
                                <Badge variant="destructive" className="shrink-0">
                                  Overdue
                                </Badge>
                              ) : (
                                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                  {task.dueLabel}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {data.thisWeekEvents.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-medium text-muted-foreground">
                          Upcoming events
                        </h3>
                        <Link
                          href="/dashboard/events"
                          className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                        >
                          All <ArrowRight className="size-3" />
                        </Link>
                      </div>
                      <ul className="mt-2 divide-y divide-border">
                        {data.thisWeekEvents.map((event) => (
                          <li key={event.id}>
                            <Link
                              href={`/dashboard/events/${event.id}`}
                              className="flex items-center justify-between gap-2.5 rounded-md py-2.5 text-sm transition-opacity duration-(--fast) ease-(--ease) hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none"
                            >
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {event.title}
                              </span>
                              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                {event.dateLabel}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Settings</h2>
            </CardHeader>
            <CardContent>
              <ProfileRemindersForm enabled={user.task_reminders} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Account</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="break-all text-sm font-medium">{user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Email is your sign-in and can&apos;t be changed here.
                </p>
              </div>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
