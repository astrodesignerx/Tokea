"use client";

import Image from "next/image";
import { ArrowRight, CalendarDays, Check, Grid2X2, List, Pencil, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import type { TodoEditorValue } from "@/lib/todo/validation";
import { formatMoney, toMinorUnits } from "@/lib/money";
import { TODO_COPY } from "@/lib/todo/copy";

export type TodoOrganisation = {
  id: string;
  name: string;
  logo_url?: string | null;
  brand?: { primary: string; ink: string };
};

export function TodoEditorPreview({ value, organisation, wide = false, onEdit }: {
  value: TodoEditorValue;
  organisation?: TodoOrganisation;
  wide?: boolean;
  onEdit: (id: string) => void;
}) {
  const groups = [
    {
      id: "ungrouped",
      title: "",
      items: value.items.filter((item) => !item.section_id && item.active),
    },
    ...value.sections.map((section) => ({
      ...section,
      items: value.items.filter((item) => item.section_id === section.id && item.active),
    })),
  ].filter((group) => group.items.length);
  const style = organisation?.brand ? {
    "--te-preview-primary": organisation.brand.primary,
    "--te-preview-ink": organisation.brand.ink,
  } as CSSProperties : undefined;

  return <div className={"te-device" + (wide ? " te-device-wide" : "")}>
    <div className="te-preview" style={style} data-layout={value.layout} aria-label="Unsaved client preview">
      <div className="te-preview-content">
        <div className="te-preview-title">
          <h2>{value.title.trim() || "Your service list"}</h2>
          {value.allow_view_switch && <span className="te-view-example" aria-label="Client view switch enabled">
            {value.layout === "list" ? <List size={17} /> : <Grid2X2 size={17} />}
          </span>}
        </div>
        <p className="te-preview-intro">{value.intro.trim() ? value.intro : TODO_COPY.intro}</p>
        {!groups.length && <div className="te-preview-empty">
          <Sparkles size={25} strokeWidth={1.5} />
          <strong>Your services belong here</strong>
          <p>Add a service in the editor and watch your client page take shape.</p>
        </div>}
        {groups.map((group) => <section className="te-preview-group" key={group.id} aria-label={group.title || undefined}>
          {group.title && <h3>{group.title}</h3>}
          <div className="te-preview-items">
            {group.items.map((item) => {
              const amount = value.show_prices ? toMinorUnits(item.price) : null;
              return <button className="te-preview-item" type="button" key={item.id}
                data-photo={!!item.image_url} aria-label={"Edit " + (item.name.trim() || "untitled service")} onClick={() => onEdit(item.id)}>
                {value.layout === "visual" && item.image_url && <span className="te-preview-photo">
                  <Image src={item.image_url} alt="" width={400} height={300} unoptimized />
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
        <label className="te-preview-additional">{TODO_COPY.additionalLabel}
          <textarea readOnly tabIndex={-1} rows={3} placeholder={TODO_COPY.additionalPlaceholder} />
        </label>
        <div className="te-preview-details">
          {value.ask_event_date && <span><CalendarDays size={14} /> Event date requested</span>}
          <span><ArrowRight size={14} /> Contact details, then share your marked list</span>
        </div>
        <p className="te-preview-credit">Made with NikoForm</p>
      </div>
    </div>
  </div>;
}
