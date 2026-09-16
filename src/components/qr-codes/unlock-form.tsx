"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unlockQrCodeAction } from "@/lib/actions/qr-unlock";

export function UnlockForm({ code }: { code: string }) {
  const [state, formAction, pending] = useActionState(unlockQrCodeAction, { error: null });

  return (
    <form
      className="mt-6 space-y-3 text-left"
      onSubmit={(event) => {
        // Submitted by hand so a wrong password does not clear the field.
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <input type="hidden" name="code" value={code} />
      <Input
        name="password"
        type="password"
        placeholder="Password"
        aria-label="Password"
        autoComplete="off"
        autoFocus
        required
      />
      {state.error && (
        <p role="alert" className="qr-rise text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Checking..." : "Continue"}
      </Button>
    </form>
  );
}
