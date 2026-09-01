import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CardSplash } from "@/components/cards/card-splash";
import { renderCardTemplate } from "@/components/cards/templates";
import { findCardBySlug, fullName } from "@/lib/cards/data";
import { cardQrDataUrl, ensureScannableDark, fetchLogoBytes } from "@/lib/cards/qr";
import { getCardsOrigin, shortUrl } from "@/lib/cards/links";

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
    // absolute, so the "%s | NikoForm" template does not brand a page that
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
  // a printed card survives a rename. Every step here is wrapped so a single
  // failing helper (logo fetch, QR render, origin lookup) can never take the
  // whole page down — critical while the links are live.
  let permanentUrl: string;
  let qr: string;
  let qrBrand: string | undefined;
  let signupHref: string | undefined;
  try {
    permanentUrl = await shortUrl(card.short_code);
  } catch {
    permanentUrl = `/s/${card.short_code}`;
  }
  try {
    const logo = await fetchLogoBytes(card.organisation.logo_url);
    qr = await cardQrDataUrl(permanentUrl, { logo });
    if (logo) {
      qrBrand = await cardQrDataUrl(permanentUrl, {
        dark: ensureScannableDark(card.organisation.brand_primary),
        logo,
      });
    }
  } catch {
    try {
      qr = await cardQrDataUrl(permanentUrl);
    } catch {
      qr = "";
    }
    qrBrand = undefined;
  }
  try {
    signupHref = `${await getCardsOrigin()}/signup`;
  } catch {
    signupHref = "/signup";
  }

  // The profile template owns the whole page (white, top-aligned, splash),
  // where the classic card sits centred on the tinted surface.
  const isProfile = card.template !== "classic";
  if (isProfile) {
    return (
      <main className="min-h-dvh bg-white px-4 py-12">
        {renderCardTemplate(card.template, {
          card,
          shortUrl: permanentUrl,
          qrDataUrl: qr,
          brandDataUrl: qrBrand,
          backlinkHref: signupHref,
        })}
        <CardSplash
          logoUrl={card.organisation.logo_url}
          name={card.organisation.name}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      {renderCardTemplate(card.template, {
        card,
        shortUrl: permanentUrl,
        qrDataUrl: qr,
        brandDataUrl: qrBrand,
      })}
    </main>
  );
}
