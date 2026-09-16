import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { createQrCodeAction } from "@/lib/actions/qr-codes";
import { getCardsOrigin } from "@/lib/cards/links";
import { qrPath } from "@/lib/qr-codes/links";
import { BRAND_DARK } from "@/lib/cards/qr-colour";
import { QrCodeForm, type BrandPreset } from "@/components/qr-codes/qr-code-form";

export const metadata = { title: "New QR code" };

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

export default async function NewQrCodePage() {
  const user = await requireUser();
  const brands = await brandPresets(user.id);
  // Same length as a real link, so the preview has the same density as the
  // code that gets printed.
  const placeholder = `${await getCardsOrigin()}${qrPath("xxxxxxxx")}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/dashboard/qr"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> QR codes
      </Link>
      <h1 className="mt-4 font-display text-3xl font-medium tracking-tight">
        New QR code
      </h1>

      <QrCodeForm
        action={createQrCodeAction}
        encodedUrl={placeholder}
        submitLabel="Create QR code"
        brands={brands}
        initial={{
          name: "",
          destination: "",
          colour: BRAND_DARK,
          logo_url: "",
          dot_style: "square",
          corner_style: "square",
          corner_colour: "",
          background: "white",
          frame_text: "",
          density: "detailed",
          utm_source: "",
          utm_medium: "",
          utm_campaign: "",
          ios_destination: "",
          android_destination: "",
          expires_at: null,
          expired_destination: "",
          hasPassword: false,
        }}
      />
    </div>
  );
}
