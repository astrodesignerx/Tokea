import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { createQrCodeAction } from "@/lib/actions/qr-codes";
import { getCardsOrigin } from "@/lib/cards/links";
import { qrPath } from "@/lib/qr-codes/links";
import { BRAND_DARK } from "@/lib/cards/qr-colour";
import { QrCodeForm } from "@/components/qr-codes/qr-code-form";

export const metadata = { title: "New QR code" };

export default async function NewQrCodePage() {
  await requireUser();
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
        initial={{
          name: "",
          destination: "",
          colour: BRAND_DARK,
          logo_url: "",
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
