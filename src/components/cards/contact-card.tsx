import { Globe, Mail, Phone, Smartphone, UserPlus } from "lucide-react";
import { BrandCorner } from "@/components/cards/brand-corner";
import { brandStyle } from "@/components/cards/brand-style";
import { OrgLogo } from "@/components/cards/org-logo";
import { QrDialog } from "@/components/cards/qr-dialog";
import { ShareActions } from "@/components/cards/share-actions";
import { fullName, type CardWithOrganisation } from "@/lib/cards/data";
import { cn } from "@/lib/utils";

type ContactCardProps = {
  card: CardWithOrganisation;
  /** The permanent short link. Everything shareable points here, not at the slug. */
  shortUrl: string;
  qrDataUrl: string;
  brandDataUrl?: string;
};

const SERIF = {
  fontFamily: "var(--font-card-serif), ui-serif, Georgia, serif",
} as const;

export function ContactCard({ card, shortUrl, qrDataUrl, brandDataUrl }: ContactCardProps) {
  const name = fullName(card);
  const org = card.organisation;

  return (
    <article
      style={brandStyle(org)}
      className="animate-rise w-full max-w-md overflow-hidden rounded-[var(--card-radius)] bg-[var(--card-paper)] shadow-[0_1px_2px_rgba(70,79,88,0.06),0_12px_40px_-12px_rgba(70,79,88,0.25)]"
    >
      <header className="relative overflow-hidden">
        <BrandCorner className="absolute left-0 top-0 h-full w-auto" />

        <div className="relative flex flex-col items-end gap-1 py-10 pl-24 pr-6 text-right sm:pl-28">
          <OrgLogo org={org} className="mb-5 h-7" />
          <h1 className="text-[1.75rem] leading-tight text-black" style={SERIF}>
            {name}
          </h1>
          <p className="text-sm font-semibold leading-snug text-[var(--brand-accent)]">
            {card.title}
          </p>
        </div>

        <div className="rule-dotted mx-6 ml-24 sm:ml-28" />
      </header>

      <div className="space-y-6 px-6 pb-7 pt-6">
        <div className="space-y-2">
          <a
            href={`/api/cards/${card.slug}/vcard`}
            download={`${card.slug}.vcf`}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-accent)] px-4 py-3.5",
              "text-sm font-semibold text-white shadow-sm",
              "transition-[filter,transform,box-shadow] duration-[var(--card-duration-fast)] ease-[var(--card-ease-out)]",
              "hover:brightness-95 hover:shadow-md active:scale-[0.98]"
            )}
          >
            <UserPlus className="h-4 w-4" />
            Save to contacts
          </a>

          <div className="flex gap-2">
            <ShareActions url={shortUrl} name={name} title={card.title} />
            <QrDialog dataUrl={qrDataUrl} name={name} brandDataUrl={brandDataUrl} slug={card.slug} />
          </div>
        </div>

        <dl className="divide-y divide-[var(--card-border)] overflow-hidden rounded-xl border border-[var(--card-border)]">
          <Row label="Name" value={name} />
          <Row label="Title" value={card.title} />
          {card.phone_mobile && (
            <Row
              label="Mobile"
              value={card.phone_mobile}
              href={`tel:${card.phone_mobile.replace(/\s+/g, "")}`}
              icon={<Smartphone className="h-4 w-4" />}
            />
          )}
          {card.phone_work && (
            <Row
              label="Work phone"
              value={card.phone_work}
              href={`tel:${card.phone_work.replace(/\s+/g, "")}`}
              icon={<Phone className="h-4 w-4" />}
            />
          )}
          <Row
            label="Email"
            value={card.email}
            href={`mailto:${card.email}`}
            icon={<Mail className="h-4 w-4" />}
          />
          <Row label="Organisation" value={org.name} />
          {org.website && (
            <Row
              label="Website"
              value={org.website_label ?? org.website}
              href={org.website}
              external
              icon={<Globe className="h-4 w-4" />}
            />
          )}
        </dl>
      </div>

      {org.tagline && (
        <footer className="border-t border-[var(--card-border)] bg-[color-mix(in_srgb,var(--brand-primary)_5%,transparent)] px-6 py-4 text-center">
          <p className="text-sm italic text-[var(--brand-primary)]" style={SERIF}>
            {org.tagline}
          </p>
        </footer>
      )}
    </article>
  );
}

type RowProps = {
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  icon?: React.ReactNode;
};

function Row({ label, value, href, external, icon }: RowProps) {
  const body = (
    <>
      <dt className="text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--brand-ink-soft)]">
        {label}
      </dt>
      <dd className="mt-0.5 flex items-center gap-2 text-sm text-[var(--brand-ink)]">
        {icon && (
          <span className="shrink-0 text-[var(--brand-primary)]">{icon}</span>
        )}
        {/* anywhere, not break-all: long emails still wrap, ordinary words do not split. */}
        <span className="[overflow-wrap:anywhere]">{value}</span>
      </dd>
    </>
  );

  if (!href) {
    return <div className="px-4 py-3">{body}</div>;
  }

  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      className="block px-4 py-3 transition-colors duration-[var(--card-duration-fast)] ease-[var(--card-ease-out)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_5%,transparent)]"
    >
      {body}
    </a>
  );
}
