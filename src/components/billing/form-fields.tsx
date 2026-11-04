"use client";

import { cloneElement, startTransition, useActionState, useId, useState, type ReactElement, type ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { BillingFormState } from "@/lib/actions/billing";

export type BillingAction = (state: BillingFormState, form: FormData) => Promise<BillingFormState>;
export const BillingInput = (props: React.ComponentProps<typeof Input>) => <Input {...props} className={`text-base ${props.className ?? ""}`} />;
export const BillingSelect = (props: React.ComponentProps<typeof Select>) => <Select {...props} className={`text-base ${props.className ?? ""}`} />;
export const BillingTextarea = (props: React.ComponentProps<typeof Textarea>) => <Textarea {...props} className={`text-base ${props.className ?? ""}`} />;

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactElement<{ id?: string; "aria-describedby"?: string }> }) {
  const id = useId();
  const inputId = children.props.id ?? id;
  return <div className="space-y-1.5">
    <label htmlFor={inputId} className="block text-sm font-medium">{label}</label>
    {cloneElement(children, { id: inputId, ...(hint ? { "aria-describedby": `${inputId}-hint` } : {}) })}
    {hint && <p id={`${inputId}-hint`} className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
  </div>;
}

export function useBillingAction(action: BillingAction, initiallyOpen: Record<string, boolean> = {}) {
  const [state, dispatch, pending] = useActionState(action, { error: null });
  const [open, setOpen] = useState(initiallyOpen);
  const [seen, setSeen] = useState(state.errorAt);
  if (seen !== state.errorAt) {
    setSeen(state.errorAt);
    if (state.section) setOpen((old) => ({ ...old, [state.section!]: true }));
  }
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => dispatch(form));
  }
  return { state, pending, onSubmit, open, toggle: (id: string) => setOpen((old) => ({ ...old, [id]: !old[id] })) };
}

export function SaveBar({ state, pending, label, cancel, children }: { state: BillingFormState; pending: boolean; label: string; cancel: string; children?: ReactNode }) {
  return <div className="sticky bottom-3 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur-sm">
    <div aria-live="polite" className="min-w-0 flex-1 text-sm">
      {state.error ? <p key={state.errorAt} role="alert" className="qr-rise text-destructive">{state.error}</p> : state.savedAt ? <p key={state.savedAt} className="qr-fade text-muted-foreground">Saved.</p> : children}
    </div>
    <div className="flex gap-2"><Button asChild variant="ghost"><Link href={cancel}>Cancel</Link></Button><Button type="submit" disabled={pending}>{pending ? "Saving..." : label}</Button></div>
  </div>;
}
