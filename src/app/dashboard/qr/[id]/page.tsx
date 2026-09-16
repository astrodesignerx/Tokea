import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Lock, RotateCcw, X } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import {
  cancelScheduledQrChangeAction,
  restoreQrLinkAction,
  setQrStatusAction,
  updateQrCodeAction,
} from "@/lib/actions/qr-codes";
import { findOwnedQrCode, getQrCodeActivity } from "@/lib/qr-codes/data";
import { isExpired, qrPath } from "@/lib/qr-codes/links";
import { designFromRow } from "@/lib/qr-codes/design";
import { getCardsOrigin } from "@/lib/cards/links";
import { QrCodeForm, type BrandPreset } from "@/components/qr-codes/qr-code-form";
import { QrDownloads } from "@/components/qr-codes/qr-downloads";
import { LocalTime } from "@/components/qr-codes/local-time";
import { ScheduleChangeForm } from "@/components/qr-codes/schedule-change-form";
import { ScanChart } from "@/components/dashboard/scan-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

type PageProps = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit QR code" };

const DEVICE_LABELS: Record<string, string> = {
  ios: "iPhone and iPad",
  android: "Android",
  other: "Other",
};

/** The signed-in user's companies, offered as brand starting points. */
async function brandPresets(ownerId: string): Promise<BrandPreset[]> {
  const orgs = await prisma.organisation.findMany({
    where: { owner_id: ownerId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, brand_primary: true, brand_accent: true, logo_url: true },
  });
  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    primary: o.brand_primary,
    accent: o.brand_accent,
    logoUrl: o.logo_url,
  }));
}

export default async function EditQrCodePage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser();
  const code = await findOwnedQrCode(user.id, id);
  if (!code) notFound();

  const [activity, origin, brands] = await Promise.all([
    getQrCodeActivity(code.id),
    getCardsOrigin(),
    brandPresets(user.id),
  ]);
  const design = designFromRow(code);
  const permanent = `${origin}${qrPath(code.short_code)}`;
  const expired = isExpired(code);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/dashboard/qr"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> QR codes
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-medium tracking-tight">{code.name}</h1>
        {code.status !== "active" && (
          <Badge variant="secondary" className="capitalize">
            {code.status}
          </Badge>
        )}
        {expired && <Badge variant="secondary">Expired</Badge>}
        {code.password_hash && (
          <Badge variant="outline" className="gap-1">
            <Lock className="size-3" /> Password
          </Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1 text-sm">
        <span className="font-mono text-brand">{permanent}</span>
        <CopyButton value={permanent} />
        <Button asChild variant="ghost" size="icon">
          <a href={permanent} target="_blank" rel="noreferrer" aria-label="Test the link">
            <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>

      <QrCodeForm
        action={updateQrCodeAction}
        encodedUrl={permanent}
        submitLabel="Save changes"
        brands={brands}
        initial={{
          id: code.id,
          name: code.name,
          destination: code.destination,
          colour: code.colour,
          logo_url: code.logo_url ?? "",
          dot_style: design.dotStyle,
          corner_style: design.cornerStyle,
          corner_colour: code.corner_colour ?? "",
          background: design.background,
          frame_text: code.frame_text ?? "",
          utm_source: code.utm_source ?? "",
          utm_medium: code.utm_medium ?? "",
          utm_campaign: code.utm_campaign ?? "",
          ios_destination: code.ios_destination ?? "",
          android_destination: code.android_destination ?? "",
          expires_at: code.expires_at?.toISOString() ?? null,
          expired_destination: code.expired_destination ?? "",
          hasPassword: Boolean(code.password_hash),
        }}
      />

      <section className="mt-12">
        <h2 className="nf-eyebrow">Download for print</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          All three include the full design. SVG and PDF stay sharp at any size,
          so use them for print. Save your changes first; downloads use the saved
          version.
        </p>
        <QrDownloads id={code.id} shortCode={code.short_code} />
      </section>

      <section className="mt-12">
        <h2 className="nf-eyebrow">Status</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {code.status === "active"
            ? "Live. Pausing sends scans to a polite \"not available\" page until you resume."
            : code.status === "paused"
              ? "Paused. Scans land on a \"not available\" page and are not counted."
              : "Archived. Hidden from your list; scans land on a \"not available\" page."}
          {expired && code.expires_at && (
            <>
              {" "}It also expired on <LocalTime iso={code.expires_at.toISOString()} />, so scans go to{" "}
              {code.expired_destination ? "the follow-up link" : "the \"not available\" page"}.
            </>
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {code.status !== "active" && <StatusButton id={code.id} status="active" label="Resume" />}
          {code.status === "active" && <StatusButton id={code.id} status="paused" label="Pause" />}
          {code.status !== "archived" && (
            <StatusButton id={code.id} status="archived" label="Archive" />
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="nf-eyebrow">Scans</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="nf-panel p-6">
            <ScanChart data={activity.daily} />
          </div>
          <div className="nf-panel p-6">
            <p className="font-display text-3xl font-medium tabular-nums">{activity.total}</p>
            <p className="mt-1 text-sm text-muted-foreground">Scans, all time</p>
            <p className="mt-6 text-xs font-medium text-muted-foreground">Devices</p>
            {activity.devices.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">None recorded yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {activity.devices.map((row) => (
                  <li key={row.device} className="flex justify-between">
                    <span>{DEVICE_LABELS[row.device] ?? row.device}</span>
                    <span className="tabular-nums text-muted-foreground">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-6 text-xs font-medium text-muted-foreground">Top countries</p>
            {activity.countries.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">None recorded yet.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {activity.countries.map((row) => (
                  <li key={row.country} className="flex justify-between">
                    <span>{row.country}</span>
                    <span className="tabular-nums text-muted-foreground">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {activity.recent.length > 0 && (
          <ul className="mt-5 max-w-xl divide-y rounded-lg border text-sm">
            {activity.recent.map((scan) => (
              <li key={scan.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-muted-foreground">
                  <LocalTime iso={scan.scanned_at.toISOString()} />
                </span>
                <span className="text-xs text-muted-foreground">
                  {[scan.device && DEVICE_LABELS[scan.device], scan.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 max-w-2xl">
        <h2 className="nf-eyebrow">Scheduled changes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Book a switch to a new destination, like a weekend menu or a campaign
          launch. Times are in your own time zone.
        </p>
        <ScheduleChangeForm qrCodeId={code.id} />
        {activity.scheduled.length > 0 && (
          <ul className="mt-4 divide-y rounded-lg border text-sm">
            {activity.scheduled.map((change) => (
              <li
                key={change.id}
                className="qr-rise flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{change.destination}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    From <LocalTime iso={change.run_at.toISOString()} />
                  </p>
                </div>
                <form action={cancelScheduledQrChangeAction}>
                  <input type="hidden" name="qr_code_id" value={code.id} />
                  <input type="hidden" name="change_id" value={change.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    <X className="size-4" /> Cancel
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 max-w-2xl">
        <h2 className="nf-eyebrow">Link history</h2>
        {activity.history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No changes yet. Each time you change the destination, the old one is
            kept here so you can switch back.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-lg border text-sm">
            {activity.history.map((change) => (
              <li key={change.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{change.destination}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Replaced <LocalTime iso={change.changed_at.toISOString()} />
                  </p>
                </div>
                {change.destination !== code.destination && (
                  <form action={restoreQrLinkAction}>
                    <input type="hidden" name="qr_code_id" value={code.id} />
                    <input type="hidden" name="change_id" value={change.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <RotateCcw className="size-4" /> Restore
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <form action={setQrStatusAction}>
      <input type="hidden" name="qr_code_id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant={status === "active" ? "default" : "outline"} size="sm">
        {label}
      </Button>
    </form>
  );
}
