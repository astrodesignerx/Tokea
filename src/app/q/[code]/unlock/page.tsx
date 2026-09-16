import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { findQrCodeByShortCode } from "@/lib/qr-codes/data";
import { qrPath } from "@/lib/qr-codes/links";
import { UnlockForm } from "@/components/qr-codes/unlock-form";

export const metadata: Metadata = {
  title: { absolute: "Password required" },
  robots: { index: false },
};

type PageProps = { params: Promise<{ code: string }> };

/**
 * Password gate for a protected QR code. Reveals nothing about the code
 * beyond the fact that it is protected: no name, no destination.
 */
export default async function UnlockQrPage({ params }: PageProps) {
  const { code } = await params;
  const qr = await findQrCodeByShortCode(code);
  if (!qr || !qr.password_hash || qr.status !== "active") redirect(qrPath(code));

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6">
      <div className="qr-rise w-full max-w-sm text-center">
        <h1 className="text-xl font-medium text-foreground">This link is protected</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Enter the password you were given to continue.
        </p>
        <UnlockForm code={qr.short_code} />
      </div>
    </main>
  );
}
