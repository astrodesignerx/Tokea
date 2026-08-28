import { fullName, type CardWithOrganisation } from "@/lib/cards/data";

/**
 * vCard 3.0 rather than 4.0: iOS and Android both import 3.0 without complaint,
 * whereas 4.0 still trips up some older Android contact apps.
 */
export function buildVCard(
  card: CardWithOrganisation,
  shortUrl?: string
): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeValue(card.lastName)};${escapeValue(card.firstName)};;;`,
    `FN:${escapeValue(fullName(card))}`,
    `ORG:${escapeValue(card.organisation.legalName)}`,
    `TITLE:${escapeValue(card.title)}`,
    `EMAIL;type=INTERNET;type=WORK:${escapeValue(card.email)}`,
    `URL:${escapeValue(card.organisation.website)}`,
  ];

  // The saved contact points at the short link, not the card page, so it keeps
  // resolving if the person's slug ever changes.
  if (shortUrl) {
    lines.push(`URL;type=Digital Card:${escapeValue(shortUrl)}`);
  }

  lines.push(`REV:${new Date().toISOString()}`, "END:VCARD");

  // vCard requires CRLF line endings.
  return lines.join("\r\n") + "\r\n";
}

export function vCardFileName(card: Pick<CardWithOrganisation, "slug">): string {
  return `${card.slug}.vcf`;
}

/** Escapes the characters vCard treats as structural: backslash, comma, semicolon, newline. */
function escapeValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}
