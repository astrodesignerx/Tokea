"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { BillingAction } from "./form-fields";

export function ActionButton({ action, id, label, fields = {}, destructive = false, confirm }: { action: BillingAction; id: string; label: string; fields?: Record<string, string>; destructive?: boolean; confirm?: string }) {
  const [state, dispatch, pending] = useActionState(action, { error: null });
  return <form onSubmit={(event) => {
    event.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const form = new FormData(event.currentTarget);
    startTransition(() => dispatch(form));
  }}>
    <input type="hidden" name="id" value={id} />
    {Object.entries(fields).map(([name, value]) => <input type="hidden" key={name} name={name} value={value} />)}
    <Button type="submit" variant={destructive ? "destructive" : "outline"} size="sm" disabled={pending}>{pending ? "Saving..." : label}</Button>
    {state.error && <p role="alert" key={state.errorAt} className="qr-rise mt-2 max-w-xs text-sm text-destructive">{state.error}</p>}
  </form>;
}
