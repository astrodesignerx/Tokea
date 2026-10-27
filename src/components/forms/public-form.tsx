"use client";

import { startTransition, useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormField } from "@/lib/forms/fields";
import type { SubmitState } from "@/lib/actions/form-submit";
import { cn } from "@/lib/utils";

export type BrandStyle = {
  primary: string;
  /** Chosen so text on the brand colour stays readable. */
  ink: string;
};

type Props = {
  /** The server action, already bound to this form's slug. */
  action: (state: SubmitState, form: FormData) => Promise<SubmitState>;
  versionId: string;
  fields: FormField[];
  brand: BrandStyle | null;
};

/** Placeholder text in empty boxes, kept faint so it never reads as a value. */
const HINT = "placeholder:text-muted-foreground/50";

/**
 * The public form. One column, thumb-sized controls, and the organisation's
 * colours when there are any. Submits by hand rather than through the form's
 * action prop, so a validation error does not wipe what was typed.
 */
export function PublicForm({ action, versionId, fields, brand }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [startedAt] = useState(() => Date.now());

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="version_id" value={versionId} />
      <input type="hidden" name="started_at" value={startedAt} />

      {/*
        A bot fills every input it finds; a person never sees this one. Kept
        off-screen rather than display:none, which some scripts skip.
      */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {fields.map((field) => (
        <FieldBlock key={field.id} field={field} brand={brand} />
      ))}

      {state.error && (
        <p
          role="alert"
          className="qr-rise rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={brand ? { backgroundColor: brand.primary, color: brand.ink } : undefined}
        className={cn(
          "h-12 w-full rounded-md text-base font-medium transition-[background-color,opacity,transform] duration-200",
          "active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-60",
          !brand && "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {pending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}

function FieldBlock({ field, brand }: { field: FormField; brand: BrandStyle | null }) {
  if (field.type === "heading") {
    return (
      <div className="border-t pt-5">
        <h2 className="font-display text-lg font-medium">{field.label}</h2>
        {field.help && <p className="mt-1 text-sm text-muted-foreground">{field.help}</p>}
      </div>
    );
  }

  const id = `f-${field.id}`;
  const label = (
    <label htmlFor={id} className="block text-sm font-medium">
      {field.label}
      {field.required && (
        <span className="ml-1 text-destructive" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );

  const help = field.help ? (
    <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">
      {field.help}
    </p>
  ) : null;

  const describedBy = field.help ? `${id}-help` : undefined;

  return (
    <div>
      {field.type === "consent" ? (
        <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input
            id={id}
            type="checkbox"
            name={field.id}
            required={field.required}
            aria-describedby={describedBy}
            style={brand ? { accentColor: brand.primary } : undefined}
            className="mt-0.5 size-5 shrink-0 cursor-pointer"
          />
          <span>
            {field.label}
            {field.required && (
              <span className="ml-1 text-destructive" aria-hidden="true">
                *
              </span>
            )}
          </span>
        </label>
      ) : (
        <>
          {label}
          {help}
          <div className="mt-2">
            <Control field={field} id={id} describedBy={describedBy} brand={brand} />
          </div>
        </>
      )}

      {field.type === "rating" && (
        <p className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{field.low_label ?? "Low"}</span>
          <span>{field.high_label ?? "High"}</span>
        </p>
      )}
    </div>
  );
}

function Control({
  field,
  id,
  describedBy,
  brand,
}: {
  field: FormField;
  id: string;
  describedBy?: string;
  brand: BrandStyle | null;
}) {
  const accent = brand ? { accentColor: brand.primary } : undefined;
  const required = field.required;
  const common = {
    id,
    name: field.id,
    required,
    "aria-describedby": describedBy,
    className: cn("h-11 text-base", HINT),
  };

  switch (field.type) {
    case "short_text":
      return <Input {...common} type="text" inputMode="text" autoComplete="off" />;

    case "long_text":
      return <Textarea {...common} rows={5} className={cn("min-h-28 text-base", HINT)} />;

    case "email":
      return <Input {...common} type="email" inputMode="email" autoComplete="email" />;

    case "phone":
      return (
        <Input
          {...common}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0712 345 678"
        />
      );

    case "number":
      return <Input {...common} type="text" inputMode="decimal" autoComplete="off" />;

    case "date":
      return <Input {...common} type="date" autoComplete="off" />;

    case "single_choice":
      return (
        <div role="radiogroup" aria-describedby={describedBy} className="space-y-2">
          {(field.options ?? []).map((option) => (
            <label
              key={option}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2.5 text-sm transition-colors duration-200 has-[:checked]:border-foreground has-[:checked]:bg-muted/60"
            >
              <input
                type="radio"
                name={field.id}
                value={option}
                required={required}
                style={accent}
                className="size-4 shrink-0 cursor-pointer"
              />
              {option}
            </label>
          ))}
        </div>
      );

    case "multi_choice":
      return (
        <div role="group" aria-describedby={describedBy} className="space-y-2">
          {(field.options ?? []).map((option) => (
            <label
              key={option}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2.5 text-sm transition-colors duration-200 has-[:checked]:border-foreground has-[:checked]:bg-muted/60"
            >
              <input
                type="checkbox"
                name={field.id}
                value={option}
                style={accent}
                className="size-4 shrink-0 cursor-pointer"
              />
              {option}
            </label>
          ))}
        </div>
      );

    case "dropdown":
      return (
        <select
          id={id}
          name={field.id}
          required={required}
          aria-describedby={describedBy}
          defaultValue=""
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="" disabled>
            Choose an option
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case "yes_no":
      return (
        <div role="radiogroup" aria-describedby={describedBy} className="grid grid-cols-2 gap-2">
          {[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 py-2.5 text-sm transition-colors duration-200 has-[:checked]:border-foreground has-[:checked]:bg-muted/60"
            >
              <input
                type="radio"
                name={field.id}
                value={option.value}
                required={required}
                style={accent}
                className="size-4 shrink-0 cursor-pointer"
              />
              {option.label}
            </label>
          ))}
        </div>
      );

    case "rating":
      return (
        <div role="radiogroup" aria-describedby={describedBy} className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <label
              key={rating}
              className="flex h-12 cursor-pointer items-center justify-center rounded-md border bg-background text-base tabular-nums transition-colors duration-200 has-[:checked]:border-foreground has-[:checked]:bg-muted/60"
            >
              <input
                type="radio"
                name={field.id}
                value={rating}
                required={required}
                style={accent}
                className="sr-only"
              />
              {rating}
            </label>
          ))}
        </div>
      );

    case "consent":
      return null;

    case "heading":
      return null;
  }
}
