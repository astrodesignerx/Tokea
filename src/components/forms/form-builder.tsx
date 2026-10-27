"use client";

import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  AtSign,
  CalendarDays,
  CheckSquare,
  CircleDot,
  Copy,
  Hash,
  Heading as HeadingIcon,
  ListFilter,
  Phone,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  ToggleLeft,
  Trash2,
  Type,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSection } from "@/components/qr-codes/form-section";
import { LocalDateTimeInput } from "@/components/qr-codes/local-time";
import {
  CHOICE_TYPES,
  FIELD_GROUPS,
  FIELD_TYPE_LABELS,
  MAX_FIELDS,
  MAX_HELP_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_OPTION_LENGTH,
  MAX_OPTIONS,
  newFieldId,
  type FieldType,
  type FormField,
} from "@/lib/forms/fields";
import {
  createFormAction,
  setFormStatusAction,
  type FormSettingsSection,
  type FormState,
} from "@/lib/actions/forms";
import { cn } from "@/lib/utils";

/**
 * Form builder, its settings rows, and the create form. All three edit one
 * piece of state, so they live together rather than each carrying a copy of
 * the field types through props.
 */

const HINT = "placeholder:text-muted-foreground/50";

const TYPE_ICONS: Record<FieldType, LucideIcon> = {
  short_text: Type,
  long_text: AlignLeft,
  email: AtSign,
  phone: Phone,
  number: Hash,
  date: CalendarDays,
  single_choice: CircleDot,
  multi_choice: CheckSquare,
  dropdown: ListFilter,
  yes_no: ToggleLeft,
  rating: Star,
  heading: HeadingIcon,
  consent: ShieldCheck,
};

type OrgOption = { id: string; name: string };

export function CreateForm({ organisations }: { organisations: OrgOption[] }) {
  const [state, formAction, pending] = useActionState(createFormAction, { error: null });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-xl space-y-5">
      <Field label="Title" hint="The first thing people see. You can change it later." required>
        <Input
          name="title"
          required
          maxLength={120}
          autoFocus
          placeholder="e.g. Customer feedback, Westlands"
          className={HINT}
        />
      </Field>

      <Field label="Description" hint="Optional. Shown under the title on the public page.">
        <Textarea name="description" maxLength={2000} rows={3} className={HINT} />
      </Field>

      <Field
        label="Company branding"
        hint="Uses the company's logo and colours on the public page. Leave blank for NikoForm's own theme."
      >
        <select
          name="organisation_id"
          defaultValue=""
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">No branding</option>
          {organisations.map((organisation) => (
            <option key={organisation.id} value={organisation.id}>
              {organisation.name}
            </option>
          ))}
        </select>
      </Field>

      {state.error && (
        <p key={state.errorAt} role="alert" className="qr-rise text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create form"}
      </Button>
    </form>
  );
}

export type FormSettingsValues = {
  title: string;
  description: string;
  organisationId: string;
  /** ISO string, or null for no close date. */
  closesAt: string | null;
  responseLimit: string;
  notifyEmails: string;
  thankYou: string;
  status: string;
};

type BuilderProps = {
  formId: string;
  initialFields: FormField[];
  /** The questions in the published version, or null before first publish. */
  liveFields: FormField[] | null;
  liveVersion: number | null;
  settings: FormSettingsValues;
  organisations: OrgOption[];
  saveAction: (state: FormState, form: FormData) => Promise<FormState>;
  publishAction: (state: FormState, form: FormData) => Promise<FormState>;
  settingsAction: (state: FormState, form: FormData) => Promise<FormState>;
};

export function FormBuilder({
  formId,
  initialFields,
  liveFields,
  liveVersion,
  settings,
  organisations,
  saveAction,
  publishAction,
  settingsAction,
}: BuilderProps) {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [selectedId, setSelectedId] = useState<string | null>(initialFields[0]?.id ?? null);
  const [saveState, saveFormAction, saving] = useActionState(saveAction, { error: null });
  const [publishState, publishFormAction, publishing] = useActionState(publishAction, {
    error: null,
  });

  useEffect(() => {
    if (saveState.savedAt) toast.success("Draft saved");
  }, [saveState.savedAt]);

  useEffect(() => {
    if (publishState.savedAt) toast.success("Published");
  }, [publishState.savedAt]);

  const selected = fields.find((field) => field.id === selectedId) ?? null;
  const draftJson = JSON.stringify(fields);

  // Compared on the same normalised shape, so a value that moved property
  // order while being edited does not read as a change.
  const signature = useMemo(() => fields.map(canonical).join("|"), [fields]);
  const liveSignature = useMemo(
    () => (liveFields ?? []).map(canonical).join("|"),
    [liveFields],
  );
  const changed = liveFields !== null && signature !== liveSignature;

  function update(id: string, patch: Partial<FormField>) {
    setFields((current) =>
      current.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    );
  }

  function addField(type: FieldType) {
    if (fields.length >= MAX_FIELDS) {
      toast.error(`A form can have at most ${MAX_FIELDS} questions.`);
      return;
    }
    const field = blankField(type);
    setFields((current) => [...current, field]);
    setSelectedId(field.id);
  }

  function moveField(id: string, direction: -1 | 1) {
    setFields((current) => {
      const index = current.findIndex((field) => field.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function duplicateField(id: string) {
    const index = fields.findIndex((field) => field.id === id);
    if (index < 0) return;
    if (fields.length >= MAX_FIELDS) {
      toast.error(`A form can have at most ${MAX_FIELDS} questions.`);
      return;
    }
    const copy: FormField = {
      ...fields[index],
      id: newFieldId(),
      options: fields[index].options ? [...fields[index].options] : undefined,
    };
    setFields((current) => {
      const next = [...current];
      next.splice(index + 1, 0, copy);
      return next;
    });
    setSelectedId(copy.id);
  }

  function removeField(id: string) {
    setFields((current) => {
      const index = current.findIndex((field) => field.id === id);
      const next = current.filter((field) => field.id !== id);
      if (selectedId === id) setSelectedId(next[index]?.id ?? next[index - 1]?.id ?? null);
      return next;
    });
  }

  const error = saveState.error ?? publishState.error;
  const errorAt = saveState.errorAt ?? publishState.errorAt;

  return (
    <div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)_17rem]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="nf-eyebrow">Add a question</p>
          <div className="mt-3 space-y-4">
            {FIELD_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 lg:grid-cols-1">
                  {group.types.map((type) => {
                    const Icon = TYPE_ICONS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addField(type)}
                        className="flex h-9 items-center gap-2 rounded-md border px-2.5 text-left text-sm transition-[background-color,transform] duration-200 hover:bg-muted/50 active:scale-[0.98]"
                      >
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{FIELD_TYPE_LABELS[type]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="space-y-3">
            {fields.length === 0 && (
              <div className="rounded-lg border border-dashed px-5 py-10 text-center">
                <p className="text-sm font-medium">No questions yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a type on the left to add the first one.
                </p>
              </div>
            )}

            {fields.map((field, index) => (
              <div
                key={field.id}
                onClick={() => setSelectedId(field.id)}
                className={cn(
                  "qr-rise group cursor-pointer rounded-lg border bg-card p-4",
                  "transition-[box-shadow,border-color] duration-200",
                  field.id === selectedId
                    ? "border-brand ring-1 ring-brand"
                    : "hover:border-foreground/20",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {FIELD_TYPE_LABELS[field.type]}
                      {field.required ? ", required" : ""}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {field.label || "Untitled question"}
                    </p>
                    {field.help && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{field.help}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
                    <IconButton
                      label={`Edit ${field.label}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(field.id);
                      }}
                    >
                      <SlidersHorizontal className="size-3.5" />
                    </IconButton>
                    <IconButton
                      label="Move up"
                      disabled={index === 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        moveField(field.id, -1);
                      }}
                    >
                      <ArrowUp className="size-3.5" />
                    </IconButton>
                    <IconButton
                      label="Move down"
                      disabled={index === fields.length - 1}
                      onClick={(event) => {
                        event.stopPropagation();
                        moveField(field.id, 1);
                      }}
                    >
                      <ArrowDown className="size-3.5" />
                    </IconButton>
                    <IconButton
                      label="Duplicate"
                      onClick={(event) => {
                        event.stopPropagation();
                        duplicateField(field.id);
                      }}
                    >
                      <Copy className="size-3.5" />
                    </IconButton>
                    <IconButton
                      label="Delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeField(field.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </IconButton>
                  </div>
                </div>

                <Preview field={field} />
              </div>
            ))}
          </div>

          {liveFields === null ? (
            <p className="mt-5 text-xs text-muted-foreground">
              Not published yet. Save a draft, then publish when it is ready.
            </p>
          ) : changed ? (
            <p className="qr-rise mt-5 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              The draft differs from version {liveVersion}. People filling the form
              now still see version {liveVersion}.
            </p>
          ) : (
            <p className="mt-5 text-xs text-muted-foreground">
              No changes since version {liveVersion}.
            </p>
          )}

          <div className="sticky bottom-0 z-10 -mx-3 mt-5 flex flex-wrap items-center gap-3 border-t bg-background/85 px-3 py-3 backdrop-blur">
            <form action={saveFormAction}>
              <input type="hidden" name="form_id" value={formId} />
              <input type="hidden" name="draft_fields" value={draftJson} />
              <Button type="submit" variant="outline" disabled={saving || publishing}>
                {saving ? "Saving..." : "Save draft"}
              </Button>
            </form>
            <form action={publishFormAction}>
              <input type="hidden" name="form_id" value={formId} />
              <input type="hidden" name="draft_fields" value={draftJson} />
              <Button type="submit" disabled={saving || publishing}>
                {publishing ? "Publishing..." : "Publish changes"}
              </Button>
            </form>
            {error && (
              <p key={errorAt} role="alert" className="qr-rise text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="nf-eyebrow">Question settings</p>
          {selected ? (
            <div key={selected.id} className="qr-fade mt-3 space-y-4 rounded-lg border p-4">
              <Field label="Question" hint="Up to 200 characters.">
                <Input
                  value={selected.label}
                  maxLength={MAX_LABEL_LENGTH}
                  onChange={(event) => update(selected.id, { label: event.target.value })}
                  className={HINT}
                />
              </Field>

              <Field label="Help text" hint="Optional, shown under the question.">
                <Textarea
                  value={selected.help ?? ""}
                  maxLength={MAX_HELP_LENGTH}
                  rows={2}
                  onChange={(event) => update(selected.id, { help: event.target.value })}
                  className={HINT}
                />
              </Field>

              {selected.type !== "heading" && (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.required}
                    onChange={(event) =>
                      update(selected.id, { required: event.target.checked })
                    }
                    className="size-4 cursor-pointer accent-foreground"
                  />
                  Required
                </label>
              )}

              {CHOICE_TYPES.includes(selected.type) && (
                <ChoiceSettings
                  field={selected}
                  onChange={(options) => update(selected.id, { options })}
                />
              )}

              {selected.type === "rating" && (
                <>
                  <p className="text-xs text-muted-foreground">
                    A rating is always 1 to 5. The words below sit under each end
                    of the scale.
                  </p>
                  <Field label="Low end label">
                    <Input
                      value={selected.low_label ?? ""}
                      maxLength={60}
                      placeholder="Poor"
                      onChange={(event) =>
                        update(selected.id, { low_label: event.target.value })
                      }
                      className={HINT}
                    />
                  </Field>
                  <Field label="High end label">
                    <Input
                      value={selected.high_label ?? ""}
                      maxLength={60}
                      placeholder="Excellent"
                      onChange={(event) =>
                        update(selected.id, { high_label: event.target.value })
                      }
                      className={HINT}
                    />
                  </Field>
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => removeField(selected.id)}
              >
                <Trash2 className="size-4" /> Delete question
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Select a question to edit it.
            </p>
          )}
        </aside>
      </div>

      <FormSettings
        formId={formId}
        settings={settings}
        organisations={organisations}
        action={settingsAction}
        canOpen={liveVersion !== null}
      />
    </div>
  );
}

/**
 * One section of the builder settings. Kept separate from the builder state so
 * a save reloads it from the server rather than from stale local copies.
 */
function FormSettings({
  formId,
  settings,
  organisations,
  action,
  canOpen,
}: {
  formId: string;
  settings: FormSettingsValues;
  organisations: OrgOption[];
  action: (state: FormState, form: FormData) => Promise<FormState>;
  canOpen: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [open, setOpen] = useState<Partial<Record<FormSettingsSection | "status", boolean>>>({});
  const [closesIso, setClosesIso] = useState(settings.closesAt ?? "");
  const [limit, setLimit] = useState(settings.responseLimit);
  const [emails, setEmails] = useState(settings.notifyEmails);
  const [thankYou, setThankYou] = useState(settings.thankYou);

  const toggle = (id: FormSettingsSection | "status") =>
    setOpen((current) => ({ ...current, [id]: !current[id] }));

  // Open the row behind a failed save, keyed on the error's timestamp so a
  // repeated error still reopens it.
  const [seenErrorAt, setSeenErrorAt] = useState(state.errorAt);
  if (state.errorAt !== seenErrorAt) {
    setSeenErrorAt(state.errorAt);
    if (state.section) setOpen((current) => ({ ...current, [state.section as string]: true }));
  }

  useEffect(() => {
    if (state.savedAt) toast.success("Settings saved");
  }, [state.savedAt]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  const emailCount = emails.split(/[\s,;]+/).filter(Boolean).length;
  const statusLabel =
    settings.status === "archived"
      ? "Archived"
      : settings.status === "closed"
        ? "Closed"
        : settings.status === "open"
          ? "Live"
          : "Draft";

  return (
    <div className="mt-12 grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <div>
        <p className="nf-eyebrow">Form settings</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          These apply to the live form straight away. Questions change only when
          you publish.
        </p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={onSubmit}>
          <input type="hidden" name="form_id" value={formId} />

          <div className="space-y-4">
            <Field label="Title">
              <Input
                name="title"
                defaultValue={settings.title}
                maxLength={120}
                required
              />
            </Field>
            <Field label="Description" hint="Optional, shown under the title.">
              <Textarea
                name="description"
                defaultValue={settings.description}
                maxLength={2000}
                rows={2}
                className={HINT}
              />
            </Field>
          </div>

          <div className="mt-5 divide-y overflow-hidden rounded-lg border">
            <FormSection
              id="schedule"
              title="Schedule and limit"
              open={Boolean(open.schedule)}
              onToggle={() => toggle("schedule")}
              summary={
                [
                  closesIso ? `Closes ${closesIso.slice(0, 10)}` : "No close date",
                  limit ? `${limit} max` : "No limit",
                ].join(", ")
              }
            >
              <Field label="Close at" hint="Leave blank to keep taking answers.">
                <LocalDateTimeInput
                  name="closes_at"
                  defaultIso={settings.closesAt}
                  onIsoChange={setClosesIso}
                />
              </Field>
              <Field
                label="Response limit"
                hint="Stop at this many answers. 1 to 100,000; leave blank for no limit."
              >
                <Input
                  name="response_limit"
                  value={limit}
                  onChange={(event) => setLimit(event.target.value.replace(/[^0-9]/g, ""))}
                  inputMode="numeric"
                  placeholder="No limit"
                  className={HINT}
                />
              </Field>
            </FormSection>

            <FormSection
              id="alerts"
              title="Alerts"
              open={Boolean(open.alerts)}
              onToggle={() => toggle("alerts")}
              summary={emailCount ? `${emailCount} ${emailCount === 1 ? "address" : "addresses"}` : "Off"}
            >
              <Field
                label="Email me when an answer arrives"
                hint="Up to 5 addresses, one per line. The email links to the responses; it never repeats the answers."
              >
                <Textarea
                  name="notify_emails"
                  value={emails}
                  onChange={(event) => setEmails(event.target.value)}
                  rows={2}
                  placeholder="you@example.com"
                  className={HINT}
                />
              </Field>
            </FormSection>

            <FormSection
              id="thankyou"
              title="Thank-you message"
              open={Boolean(open.thankyou)}
              onToggle={() => toggle("thankyou")}
              summary={thankYou.trim() ? "Custom message" : "Default"}
            >
              <Field
                label="Message after sending"
                hint="Up to 500 characters. Leave blank for the default."
              >
                <Textarea
                  name="thank_you"
                  value={thankYou}
                  onChange={(event) => setThankYou(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Thanks, your answers were sent."
                  className={HINT}
                />
              </Field>
            </FormSection>

            <FormSection
              id="branding"
              title="Branding"
              open={Boolean(open.branding)}
              onToggle={() => toggle("branding")}
              summary={
                organisations.find((organisation) => organisation.id === settings.organisationId)
                  ?.name ?? "NikoForm theme"
              }
            >
              <Field
                label="Company"
                hint="Uses that company's logo and colours on the public page."
              >
                <select
                  name="organisation_id"
                  defaultValue={settings.organisationId}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">No branding</option>
                  {organisations.map((organisation) => (
                    <option key={organisation.id} value={organisation.id}>
                      {organisation.name}
                    </option>
                  ))}
                </select>
              </Field>
            </FormSection>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save settings"}
            </Button>
            {state.error && (
              <p key={state.errorAt} role="alert" className="qr-rise text-sm text-destructive">
                {state.error}
              </p>
            )}
          </div>
        </form>

        <div className="mt-5 divide-y overflow-hidden rounded-lg border">
          <FormSection
            id="status"
            title="Status"
            open={Boolean(open.status)}
            onToggle={() => toggle("status")}
            summary={statusLabel}
          >
            <p className="text-xs text-muted-foreground">
              {canOpen
                ? "Closed and archived forms keep their answers. Archiving also hides the form from your list."
                : "Publish the form once before it can be opened."}
            </p>
            <div className="flex flex-wrap gap-2">
              {settings.status !== "open" && (
                <StatusButton
                  formId={formId}
                  status="open"
                  label="Open"
                  disabled={!canOpen}
                />
              )}
              {settings.status !== "closed" && (
                <StatusButton formId={formId} status="closed" label="Close" />
              )}
              {settings.status !== "archived" && (
                <StatusButton formId={formId} status="archived" label="Archive" />
              )}
            </div>
          </FormSection>
        </div>
      </div>
    </div>
  );
}

function StatusButton({
  formId,
  status,
  label,
  disabled,
}: {
  formId: string;
  status: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <form action={setFormStatusAction}>
      <input type="hidden" name="form_id" value={formId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant="outline" size="sm" disabled={disabled}>
        {label}
      </Button>
    </form>
  );
}

function ChoiceSettings({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (options: string[]) => void;
}) {
  const options = field.options ?? [];

  return (
    <div>
      <p className="text-sm font-medium">Options</p>
      <div className="mt-1.5 space-y-1.5">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <Input
              value={option}
              maxLength={MAX_OPTION_LENGTH}
              onChange={(event) => {
                const next = [...options];
                next[index] = event.target.value;
                onChange(next);
              }}
              className="h-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              aria-label={`Remove option ${index + 1}`}
              disabled={options.length <= 1}
              onClick={() => onChange(options.filter((_, i) => i !== index))}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-1.5"
        disabled={options.length >= MAX_OPTIONS}
        onClick={() => onChange([...options, `Option ${options.length + 1}`])}
      >
        <Plus className="size-4" /> Add option
      </Button>
    </div>
  );
}

function Preview({ field }: { field: FormField }) {
  if (field.type === "heading") return null;

  if (field.type === "long_text") {
    return <div className="mt-3 h-16 rounded-md border bg-muted/30" aria-hidden="true" />;
  }

  if (
    field.type === "short_text" ||
    field.type === "email" ||
    field.type === "phone" ||
    field.type === "number" ||
    field.type === "date"
  ) {
    return <div className="mt-3 h-9 rounded-md border bg-muted/30" aria-hidden="true" />;
  }

  if (field.type === "consent") {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-4 rounded border" aria-hidden="true" /> I agree
      </div>
    );
  }

  if (field.type === "yes_no") {
    return (
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {["Yes", "No"].map((label) => (
          <span key={label} className="rounded border px-3 py-1 text-xs text-muted-foreground">
            {label}
          </span>
        ))}
      </div>
    );
  }

  if (field.type === "rating") {
    return (
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((rating) => (
          <span
            key={rating}
            className="flex size-8 items-center justify-center rounded border text-xs text-muted-foreground"
          >
            {rating}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
      {(field.options ?? []).map((option) => (
        <span
          key={option}
          className="max-w-full truncate rounded border px-2 py-1 text-xs text-muted-foreground"
        >
          {option || "Empty option"}
        </span>
      ))}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
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
      <p className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </p>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Stable shape for the draft-versus-live comparison. */
function canonical(field: FormField): string {
  return JSON.stringify({
    id: field.id,
    type: field.type,
    label: field.label,
    help: field.help ?? "",
    required: field.required,
    options: field.options ?? [],
    low: field.low_label ?? "",
    high: field.high_label ?? "",
  });
}

function blankField(type: FieldType): FormField {
  const field: FormField = {
    id: newFieldId(),
    type,
    label: FIELD_TYPE_LABELS[type],
    required: false,
  };

  if (CHOICE_TYPES.includes(type)) field.options = ["Option 1", "Option 2"];
  if (type === "rating") {
    field.low_label = "Poor";
    field.high_label = "Excellent";
  }
  return field;
}
