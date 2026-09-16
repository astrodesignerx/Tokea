"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { scheduleQrChangeAction } from "@/lib/actions/qr-codes";
import { LocalDateTimeInput } from "./local-time";

/** Books a destination switch for later. */
export function ScheduleChangeForm({ qrCodeId }: { qrCodeId: string }) {
  const [state, formAction, pending] = useActionState(scheduleQrChangeAction, { error: null });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.savedAt) return;
    toast.success("Change scheduled");
    // Clear the link field for the next one; the time picker keeps its value.
    const input = formRef.current?.elements.namedItem("destination");
    if (input instanceof HTMLInputElement) input.value = "";
  }, [state.savedAt]);

  return (
    <form
      ref={formRef}
      className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <input type="hidden" name="qr_code_id" value={qrCodeId} />
      <div className="space-y-1.5">
        <Label htmlFor="schedule-destination">Switch to</Label>
        <Input
          id="schedule-destination"
          name="destination"
          placeholder="https://example.com/next-week"
          inputMode="url"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="schedule-at">At</Label>
        <LocalDateTimeInput id="schedule-at" name="run_at" required />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Scheduling..." : "Schedule"}
      </Button>
      {state.error && (
        <p role="alert" className="qr-rise text-sm text-destructive sm:col-span-3">
          {state.error}
        </p>
      )}
    </form>
  );
}
