import type { Metadata } from "next";
import { getLiveForm } from "@/lib/forms/data";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thanks",
  robots: { index: false, follow: false },
};

export default async function FormDonePage({ params }: PageProps) {
  const { slug } = await params;
  const live = await getLiveForm(slug);
  const message = live?.form.thank_you?.trim() || "Thanks, your answers were sent.";

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-12">
        <p className="nf-eyebrow">NikoForm</p>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
          {live?.form.title ?? "Thanks"}
        </h1>
        <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
          {message}
        </p>
        <p className="mt-10 text-xs text-muted-foreground">Made with NikoForm</p>
      </main>
    </div>
  );
}
