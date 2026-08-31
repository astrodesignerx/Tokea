import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CARD_TEMPLATE_OPTIONS,
  DEFAULT_CARD_TEMPLATE,
} from "@/lib/card-templates";

export type CardFormValues = {
  id?: string;
  slug?: string;
  shortCode?: string;
  template?: string;
  card_front_url?: string;
  card_back_url?: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  phone_mobile: string;
  phone_work: string;
  status: string;
};

/**
 * A plain server-rendered form: nothing here needs client state, so it works
 * without JavaScript and ships none.
 */
export function CardForm({
  action,
  organisationId,
  initial,
  submitLabel,
}: {
  action: (form: FormData) => void | Promise<void>;
  organisationId: string;
  initial: CardFormValues;
  submitLabel: string;
}) {
  const editing = Boolean(initial.id);

  return (
    <form action={action} className="mt-8 max-w-xl space-y-5">
      <input type="hidden" name="organisation_id" value={organisationId} />
      {initial.id && <input type="hidden" name="card_id" value={initial.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" required>
          <Input name="first_name" defaultValue={initial.first_name} required />
        </Field>
        <Field label="Last name" required>
          <Input name="last_name" defaultValue={initial.last_name} required />
        </Field>
      </div>

      <Field label="Job title">
        <Input
          name="title"
          defaultValue={initial.title}
          placeholder="Program Director"
        />
      </Field>

      <Field label="Email">
        <Input name="email" type="email" defaultValue={initial.email} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Mobile">
          <Input
            name="phone_mobile"
            defaultValue={initial.phone_mobile}
            placeholder="+254 700 000 000"
          />
        </Field>
        <Field label="Work phone">
          <Input name="phone_work" defaultValue={initial.phone_work} />
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Page design</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {CARD_TEMPLATE_OPTIONS.map((t) => (
            <label
              key={t.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-checked:border-foreground has-checked:bg-accent"
            >
              <input
                type="radio"
                name="template"
                value={t.value}
                defaultChecked={
                  initial.template
                    ? initial.template === t.value
                    : t.value === DEFAULT_CARD_TEMPLATE
                }
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-foreground"
              />
              <span>
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {editing && (
        <>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Printed card images</legend>
            <p className="text-xs text-muted-foreground">
              Front and back of the physical card, shown at the foot of
              profile-template pages.
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Front image URL">
                <Input
                  name="card_front_url"
                  defaultValue={initial.card_front_url}
                  placeholder="/cards/mathieu-dalle-front.png"
                />
              </Field>
              <Field label="Back image URL">
                <Input
                  name="card_back_url"
                  defaultValue={initial.card_back_url}
                  placeholder="/cards/mathieu-dalle-back.png"
                />
              </Field>
            </div>
          </fieldset>

          <Field
            label="Page address"
            hint="Changing this moves the card's URL. Anything already printed keeps working."
          >
            <div className="flex items-center gap-2">
              <span className="shrink-0 font-mono text-sm text-muted-foreground">
                /c/
              </span>
              <Input name="slug" defaultValue={initial.slug} />
            </div>
          </Field>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Permanent link
            </p>
            <p className="mt-1 font-mono text-sm">/s/{initial.shortCode}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              This is what the QR code encodes. It never changes, so a printed
              card stays valid however often the details above are edited.
            </p>
          </div>

          <Field
            label="Status"
            hint="Archiving retires the card without freeing its link, so an old card explains itself rather than breaking."
          >
            <select
              name="status"
              defaultValue={initial.status}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
        </>
      )}

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-muted-foreground"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
