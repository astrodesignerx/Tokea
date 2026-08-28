import { fullName, type CardWithOrganisation } from "@/lib/cards/data";

/**
 * vCard 3.0 rather than 4.0: iOS and Android both import 3.0 without complaint,
 * whereas 4.0 still trips up some older Android contact apps.
 */
export function buildVCard(
  card: CardWithOrganisation,
  shortUrl?: string
): string {
  const org = card.organisation;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeValue(card.last_name)};${escapeValue(card.first_name)};;;`,
    `FN:${escapeValue(fullName(card))}`,
    `ORG:${escapeValue(org.legal_name)}`,
    `TITLE:${escapeValue(card.title)}`,
    `EMAIL;type=INTERNET;type=WORK:${escapeValue(card.email)}`,
  ];

  if (card.phone_mobile) {
    lines.push(`TEL;type=CELL;type=VOICE:${escapeValue(card.phone_mobile)}`);
  }

  if (card.phone_work) {
    lines.push(`TEL;type=WORK;type=VOICE:${escapeValue(card.phone_work)}`);
  }

  if (org.website) {
    lines.push(`URL:${escapeValue(org.website)}`);
  }

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
