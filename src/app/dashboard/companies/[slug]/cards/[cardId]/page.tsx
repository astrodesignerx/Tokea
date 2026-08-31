import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { updateCardAction } from "@/lib/actions/cards";
import { fullName, recentScans } from "@/lib/cards/data";
import { CardForm } from "@/components/cards/card-form";

type PageProps = { params: Promise<{ slug: string; cardId: string }> };

export const metadata = { title: "Edit card" };

export default async function EditCardPage({ params }: PageProps) {
  const { slug, cardId } = await params;
  const user = await requireUser();

  const card = await prisma.contactCard.findFirst({
    where: {
      id: cardId,
      organisation: { slug, owner_id: user.id },
    },
    include: { organisation: true },
  });
  if (!card) notFound();

  const scans = await recentScans(card.id, 8);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/dashboard/companies/${card.organisation.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {card.organisation.name}
      </Link>

      <h1 className="mt-4 font-display text-3xl font-medium tracking-tight">
        {fullName(card)}
      </h1>

      <CardForm
        action={updateCardAction}
        organisationId={card.organisation_id}
        submitLabel="Save changes"
        initial={{
          id: card.id,
          slug: card.slug,
          shortCode: card.short_code,
          template: card.template,
          card_front_url: card.card_front_url ?? "",
          card_back_url: card.card_back_url ?? "",
          first_name: card.first_name,
          last_name: card.last_name,
          title: card.title,
          email: card.email,
          phone_mobile: card.phone_mobile ?? "",
          phone_work: card.phone_work ?? "",
          status: card.status,
        }}
      />

      <section className="mt-12 max-w-xl">
        <h2 className="nf-eyebrow">Recent scans</h2>
        {scans.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No scans yet. They appear here as soon as someone opens the QR code.
          </p>
        ) : (
          <ul className="mt-3 divide-y rounded-lg border text-sm">
            {scans.map((scan) => (
              <li
                key={scan.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <time
                  dateTime={scan.scanned_at.toISOString()}
                  className="text-muted-foreground"
                >
                  {scan.scanned_at.toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
                {scan.country && (
                  <span className="text-xs text-muted-foreground">
                    {scan.country}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
