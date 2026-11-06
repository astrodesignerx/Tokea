"use client";

import Image from "next/image";
import { ArrowRight, CalendarDays, Check, Grid2X2, List, Pencil, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import type { TodoEditorValue } from "@/lib/todo/validation";
import { formatMoney, toMinorUnits } from "@/lib/money";

export type TodoOrganisation = {
  id: string;
  name: string;
  logo_url?: string | null;
  brand?: { primary: string; ink: string };
};

export function TodoEditorPreview({ value, organisation, businessName, wide = false, onEdit }: {
  value: TodoEditorValue;
  organisation?: TodoOrganisation;
  businessName: string;
  wide?: boolean;
  onEdit: (id: string) => void;
}) {
  const business = organisation?.name ?? businessName;
  const groups = [
    ...value.sections.map((section) => ({
      ...section,
      items: value.items.filter((item) => item.section_id === section.id && item.active),
    })),
    {
      id: "ungrouped",
      title: value.sections.length ? "Other services" : "Services",
      items: value.items.filter((item) => !item.section_id && item.active),
    },
  ].filter((group) => group.items.length);
  const style = organisation?.brand ? {
    "--te-preview-primary": organisation.brand.primary,
    "--te-preview-ink": organisation.brand.ink,
  } as CSSProperties : undefined;

  return <div className={"te-device" + (wide ? " te-device-wide" : "")}>
    <div className="te-preview" style={style} data-layout={value.layout} aria-label="Unsaved client preview">
      <header className="te-preview-header">
        {organisation?.logo_url
          ? <Image src={organisation.logo_url} alt="" width={38} height={38} unoptimized className="te-business-logo" />
          : <span className="te-business-logo" aria-hidden="true">{business.charAt(0).toUpperCase()}</span>}
        <div><strong>{business}</strong><span>Choose your services</span></div>
        {value.allow_view_switch && <span className="te-view-example" aria-label="Client view switch enabled">
          {value.layout === "list" ? <List size={17} /> : <Grid2X2 size={17} />}
        </span>}
      </header>
      <div className="te-preview-content">
        <h2>{value.title.trim() || "Your service list"}</h2>
        <p className="te-preview-intro">{value.intro.trim() || "Tick everything you need. We will confirm availability."}</p>
        {!groups.length && <div className="te-preview-empty">
          <Sparkles size={25} strokeWidth={1.5} />
          <strong>Your services belong here</strong>
          <p>Add a service in the editor and watch your client page take shape.</p>
        </div>}
        {groups.map((group) => <section className="te-preview-group" key={group.id} aria-label={group.title || "Untitled section"}>
          <h3>{group.title || "Untitled section"}</h3>
          <div className="te-preview-items">
            {group.items.map((item) => {
              const amount = value.show_prices ? toMinorUnits(item.price) : null;
              return <button className="te-preview-item" type="button" key={item.id}
                aria-label={"Edit " + (item.name.trim() || "untitled service")} onClick={() => onEdit(item.id)}>
                {value.layout === "visual" && <span className="te-preview-photo">
                  {item.image_url
                    ? <Image src={item.image_url} alt="" width={400} height={300} unoptimized />
                    : <span className="te-photo-letter" aria-hidden="true">{(item.name.trim() || "S").charAt(0).toUpperCase()}</span>}
                </span>}
                <span className="te-preview-check" aria-hidden="true"><Check size={13} /></span>
                <span className="te-preview-copy">
                  <strong>{item.name.trim() || "Untitled service"}</strong>
                  {item.note && <span>{item.note}</span>}
                  {amount !== null && <small className="te-preview-price">{formatMoney(amount)}{item.per_unit ? " / " + (item.unit_label.trim() || "unit") : ""}</small>}
                  {item.per_unit && <small className="te-preview-unit">Choose how many {item.unit_label.trim() || "units"}</small>}
                </span>
                <Pencil className="te-preview-edit" size={13} aria-hidden="true" />
              </button>;
            })}
          </div>
        </section>)}
        <div className="te-preview-details">
          {value.ask_event_date && <span><CalendarDays size={14} /> Event date requested</span>}
          <span><ArrowRight size={14} /> Contact details after selection</span>
        </div>
        <p className="te-preview-credit">Made with NikoForm</p>
      </div>
    </div>
  </div>;
}
