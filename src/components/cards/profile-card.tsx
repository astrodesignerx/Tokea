import {
  Contact as ContactIcon,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  Share2,
  Smartphone,
  UserPlus,
} from "lucide-react";
import { brandStyle } from "@/components/cards/brand-style";
import { CardImageLightbox } from "@/components/cards/card-image-lightbox";
import { OrgLogo } from "@/components/cards/org-logo";
import { QrDialog } from "@/components/cards/qr-dialog";
import { ShareActions } from "@/components/cards/share-actions";
import { fullName, type CardWithOrganisation } from "@/lib/cards/data";
import { cn } from "@/lib/utils";

type ProfileCardProps = {
  card: CardWithOrganisation;
  /** The permanent short link. Everything shareable points here, not at the slug. */
  shortUrl: string;
  qrDataUrl: string;
  /** Preview of the same QR tinted with a scannable brand colour. */
  brandDataUrl?: string;
  /** Where "Get your own… for free" links. The profile template's backlink. */
  backlinkHref?: string;
};

const PROFILE_FONT = {
  fontFamily:
    "var(--font-card-profile), var(--font-card-sans), ui-sans-serif, system-ui, sans-serif",
} as const;

/**
 * The "profile" template, modelled on QRCodeChimp's vCard landing pages:
 * cover banner, brand-coloured wrapper carrying the centred identity and
 * quick-action circles, then white stacked cards. Measurements come from the
 * reference page; every colour reads the organisation's palette instead.
 */
export function ProfileCard({
  card,
  shortUrl,
  qrDataUrl,
  brandDataUrl,
  backlinkHref,
}: ProfileCardProps) {
  const name = fullName(card);
  const org = card.organisation;

  type QuickAction = {
    href: string;
    label: string;
    icon: React.ReactNode;
    external?: boolean;
  };

  const quickActions: QuickAction[] = [];
  if (card.phone_mobile) {
    quickActions.push({
      href: `tel:${card.phone_mobile.replace(/\s+/g, "")}`,
      label: `Call ${name} on their mobile`,
      icon: <Smartphone className="h-[18px] w-[18px]" />,
    });
    quickActions.push({
      href: `sms:${card.phone_mobile.replace(/\s+/g, "")}`,
      label: `Text ${name}`,
      icon: <MessageSquare className="h-[18px] w-[18px]" />,
    });
  }
  if (card.phone_work) {
    quickActions.push({
      href: `tel:${card.phone_work.replace(/\s+/g, "")}`,
      label: `Call ${name} at work`,
      icon: <Phone className="h-[18px] w-[18px]" />,
    });
  }
  quickActions.push({
    href: `mailto:${card.email}`,
    label: `Email ${name}`,
    icon: <Mail className="h-[18px] w-[18px]" />,
  });
  if (org.website) {
    quickActions.push({
      href: org.website,
      label: `Visit ${org.website_label ?? org.website}`,
      icon: <Globe className="h-[18px] w-[18px]" />,
      external: true,
    });
  }

  return (
    <article
      style={{ ...brandStyle(org), ...PROFILE_FONT }}
      className="mx-auto w-full max-w-[540px]"
    >
      {/* The reference pages lead with the client's mark inside a plate: the
          logo centred, in a landscape rectangle that keeps headspace without
          swallowing the screen. A cover banner, when uploaded, becomes the
          plate's backdrop. */}
      <div className="relative grid aspect-[2/1] w-full place-items-center overflow-hidden bg-white">
        {org.cover_image_url && (
          // Plain img rather than next/image: covers are client uploads on
          // arbitrary hosts, like logos. See OrgLogo.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.cover_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <OrgLogo
          org={org}
          className={cn(
            "relative z-10 h-[108px] max-w-[70%]",
            org.cover_image_url && "drop-shadow-lg"
          )}
        />
      </div>

      {/* The brand block sits below the plate as its own card, like the
          reference, with generous breathing room all round. */}
      <div className="rounded-lg bg-[var(--brand-primary)] p-[15px] pt-[45px]">
        <div>
          {card.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.photo_url}
              alt={name}
              className="mx-auto -mt-[86px] mb-4 h-28 w-28 rounded-full border-4 border-white object-cover"
            />
          )}

          <div className="my-8 text-center">
            <h1 className="text-2xl font-medium text-white">{name}</h1>
            {card.title && (
              <p className="mt-3 text-sm font-medium text-white">
                {card.title}
              </p>
            )}
          </div>

          {quickActions.length > 0 && (
            <ul className="mb-12 flex justify-center gap-[7px]">
              {quickActions.map((action) => (
                <li key={action.href + action.label}>
                  <a
                    href={action.href}
                    aria-label={action.label}
                    {...(action.external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                    className={cn(
                      "grid h-[42px] w-[42px] place-items-center rounded-full bg-white text-[var(--brand-primary)]",
                      "transition-transform duration-[var(--card-duration-fast)] ease-[var(--card-ease-out)]",
                      "hover:scale-105 active:scale-95"
                    )}
                  >
                    {action.icon}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <section className="relative rounded border border-[rgba(136,136,138,0.1)] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.16)]">
            <header className="flex items-center gap-2 px-5 py-3 text-lg text-[var(--brand-primary)]">
              <ContactIcon className="h-[18px] w-[18px]" />
              Contact
            </header>

            <a
              href={`/api/cards/${card.slug}/vcard`}
              download={`${card.slug}.vcf`}
              className={cn(
                "absolute right-[5px] top-2.5 flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] py-[7px] pl-[15px] pr-[7px]",
                "text-xs font-medium text-white",
                "shadow-[0_5px_11px_rgba(0,0,0,0.18),0_4px_15px_rgba(0,0,0,0.15)]",
                "transition-[filter,transform] duration-[var(--card-duration-fast)] ease-[var(--card-ease-out)]",
                "hover:brightness-95 active:scale-[0.98]"
              )}
            >
              Save To Contacts
              <UserPlus className="h-4 w-4" />
            </a>

            <dl className="px-5 pb-2.5">
              <Row label="Name" value={name} />
              {card.phone_mobile && (
                <Row
                  label="Mobile"
                  value={card.phone_mobile}
                  href={`tel:${card.phone_mobile.replace(/\s+/g, "")}`}
                />
              )}
              {card.phone_work && (
                <Row
                  label="Work Phone"
                  value={card.phone_work}
                  href={`tel:${card.phone_work.replace(/\s+/g, "")}`}
                />
              )}
              <Row
                label="Email"
                value={card.email}
                href={`mailto:${card.email}`}
              />
              <Row label="Company" value={org.name} />
              {org.website && (
                <Row
                  label="Website"
                  value={org.website_label ?? org.website}
                  href={org.website}
                  external
                />
              )}
            </dl>
          </section>

          {/* Share actions ride in their own white card, matching the
              stacked-cards language of the reference. */}
          <section className="mt-6 rounded border border-[rgba(136,136,138,0.1)] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.16)]">
            <header className="flex items-center gap-2 px-5 py-3 text-lg text-[var(--brand-primary)]">
              <Share2 className="h-[18px] w-[18px]" />
              Share
            </header>
            <div className="flex gap-2 px-5 pb-4">
              <ShareActions url={shortUrl} name={name} title={card.title} />
              <QrDialog dataUrl={qrDataUrl} name={name} brandDataUrl={brandDataUrl} />
            </div>
          </section>

          {/* The printed card itself, front and back — the reference pages
              close with these gallery containers. Tap to zoom. */}
          {(card.card_front_url || card.card_back_url) && (
            <div className="mt-6 space-y-5">
              {card.card_front_url && (
                <CardImageLightbox
                  src={card.card_front_url}
                  alt={`Front of ${name}'s printed card`}
                />
              )}
              {card.card_back_url && (
                <CardImageLightbox
                  src={card.card_back_url}
                  alt={`Back of ${name}'s printed card`}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backlink, as on the reference pages: a quiet invitation back to the
          product that made the card. */}
      {backlinkHref && (
        <p className="px-6 pb-10 pt-8 text-center text-[13px] font-semibold text-[var(--brand-ink)]">
          Get your own{" "}
          <a
            href={backlinkHref}
            className="text-[var(--brand-accent)] underline decoration-[var(--brand-accent)]/40 underline-offset-2 transition-colors duration-[var(--card-duration-fast)] hover:text-[var(--brand-primary)]"
          >
            digital card
          </a>{" "}
          for free!
        </p>
      )}
    </article>
  );
}

type RowProps = {
  label: string;
  value: string;
  href?: string;
  external?: boolean;
};

function Row({ label, value, href, external }: RowProps) {
  const body = (
    <>
      <dt className="text-xs text-[#808EA7]">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-sm",
          href ? "text-[var(--brand-primary)]" : "text-[#141A22]"
        )}
      >
        {/* anywhere, not break-all: long emails still wrap, ordinary words do not split. */}
        <span className="[overflow-wrap:anywhere]">{value}</span>
      </dd>
    </>
  );

  const className =
    "block border-b border-[#ECF0F7] py-2.5 last:border-b-0";

  if (!href) {
    return <div className={className}>{body}</div>;
  }

  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      className={cn(
        className,
        "transition-opacity duration-[var(--card-duration-fast)] ease-[var(--card-ease-out)] hover:opacity-70"
      )}
    >
      {body}
    </a>
  );
}
