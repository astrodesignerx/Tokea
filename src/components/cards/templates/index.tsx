import { ContactCard } from "../contact-card";
import { ProfileCard } from "../profile-card";
import type { CardWithOrganisation } from "@/lib/cards/data";

export type CardTemplateProps = {
  card: CardWithOrganisation;
  /** The permanent short link. Everything shareable points here, not at the slug. */
  shortUrl: string;
  qrDataUrl: string;
  /** Preview of the same QR tinted with a scannable brand colour. */
  brandDataUrl?: string;
  /** Where "Get your own… for free" links. The profile template's backlink. */
  backlinkHref?: string;
};

export function renderCardTemplate(
  template: string,
  props: CardTemplateProps
) {
  switch (template) {
    case "classic":
      return <ContactCard {...props} />;
    case "profile":
      return <ProfileCard {...props} />;
    default:
      return <ProfileCard {...props} />;
  }
}
