import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactCard } from "@/components/cards/contact-card";
import { findCardBySlug, fullName } from "@/lib/cards/data";
import { cardQrDataUrl } from "@/lib/cards/qr";
import { shortUrl } from "@/lib/cards/links";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const card = await findCardBySlug(slug);
  if (!card) return { title: "Card not found" };

  const name = fullName(card);
  const description = `${card.title}, ${card.organisation.name}.`;

  return {
    // absolute, so Tokea's "%s | Tokea" template does not brand a page that
    // belongs to the client.
    title: { absolute: `${name} - ${card.organisation.name}` },
    description,
    openGraph: { title: name, description, type: "profile" },
  };
}

export default async function CardPage({ params }: PageProps) {
  const { slug } = await params;
  const card = await findCardBySlug(slug);
  if (!card || card.status !== "active") notFound();

  // The QR and everything shareable encode the short link, never the slug, so
  // a printed card survives a rename.
  const permanentUrl = await shortUrl(card.short_code);
  const qr = await cardQrDataUrl(permanentUrl);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <ContactCard card={card} shortUrl={permanentUrl} qrDataUrl={qr} />
    </main>
  );
}
