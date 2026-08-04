"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { CoverUpload } from "@/components/event/cover-upload";
import { createEvent, updateEvent } from "@/lib/actions/events";
import { TEMPLATE_OPTIONS } from "@/lib/templates";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(20000).optional().or(z.literal("")),
  starts_at: z.string().min(1, "Start date is required"),
  timezone: z.string().min(1, "Timezone is required"),
  venue_name: z.string().max(200).optional().or(z.literal("")),
  venue_address: z.string().max(500).optional().or(z.literal("")),
  cover_image_url: z.string().optional().or(z.literal("")),
  custom_question: z.string().max(500).optional().or(z.literal("")),
  template: z.enum(["image-led", "type-led", "minimal", "birthday", "conference"]),
  reminder_days_before: z.string().optional(),
});

export type EventFormValues = z.infer<typeof schema>;

type EventFormProps = {
  initial?: {
    id: string;
    title: string;
    description: string | null;
    starts_at: Date;
    timezone: string;
    venue_name: string | null;
    venue_address: string | null;
    cover_image_url: string | null;
    custom_question: string | null;
    template: string;
    reminder_days_before: number | null;
  };
};

const timezones = typeof Intl !== "undefined" && "supportedValuesOf" in Intl
  ? (Intl.supportedValuesOf("timeZone") as string[])
  : ["UTC", "Africa/Nairobi", "Europe/London", "America/New_York"];

function localDateTimeString(d: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function EventForm({ initial }: EventFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [coverUrl, setCoverUrl] = useState<string | null>(initial?.cover_image_url ?? null);

  const defaultStartsAt = initial
    ? localDateTimeString(initial.starts_at)
    : localDateTimeString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      starts_at: defaultStartsAt,
      timezone: initial?.timezone ?? browserTimezone(),
      venue_name: initial?.venue_name ?? "",
      venue_address: initial?.venue_address ?? "",
      cover_image_url: initial?.cover_image_url ?? "",
      custom_question: initial?.custom_question ?? "",
      template: (initial?.template as EventFormValues["template"]) ?? "image-led",
      reminder_days_before:
        initial?.reminder_days_before != null ? String(initial.reminder_days_before) : "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedTemplate = watch("template");
  const coverValue = watch("cover_image_url");

  function onSubmit(values: EventFormValues) {
    const reminder = values.reminder_days_before && values.reminder_days_before !== ""
      ? Number(values.reminder_days_before)
      : null;
    const payload = { ...values, reminder_days_before: reminder };
    startTransition(async () => {
      try {
        if (initial) {
          await updateEvent({ ...payload, id: initial.id });
        } else {
          await createEvent(payload);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not save event";
        if (msg.includes("NEXT_REDIRECT")) return;
        toast.error(msg);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} placeholder="Ada's 30th" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Tell guests what to expect."
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-medium">When & where</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Starts at</Label>
              <Input id="starts_at" type="datetime-local" {...register("starts_at")} />
              {errors.starts_at && (
                <p className="text-sm text-destructive">{errors.starts_at.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                {...register("timezone")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venue_name">Venue name</Label>
              <Input id="venue_name" {...register("venue_name")} placeholder="The Westin" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue_address">Venue address</Label>
              <Input id="venue_address" {...register("venue_address")} placeholder="123 Main St" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-medium">Cover image</h2>
          <CoverUpload
            value={coverUrl}
            onChange={(url) => {
              setCoverUrl(url);
              setValue("cover_image_url", url ?? "", { shouldValidate: true });
            }}
          />
          <input type="hidden" {...register("cover_image_url")} />
          {coverValue && (
            <p className="text-xs text-muted-foreground break-all">{coverValue}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-medium">Page design</h2>
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setValue("template", t.value, { shouldValidate: true })}
                  className={`text-left rounded-md border p-3 transition-colors ${
                    selectedTemplate === t.value
                      ? "border-foreground bg-accent"
                      : "hover:border-foreground/50"
                  }`}
                >
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
                </button>
              ))}
            </div>
            <input type="hidden" {...register("template")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-medium">RSVP & reminders</h2>
          <div className="space-y-2">
            <Label htmlFor="custom_question">Optional question for guests</Label>
            <Input
              id="custom_question"
              {...register("custom_question")}
              placeholder="Dietary requirements?"
            />
            <p className="text-xs text-muted-foreground">
              One question. Guests answer it when they RSVP.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminder_days_before">Reminder (days before)</Label>
            <select
              id="reminder_days_before"
              {...register("reminder_days_before")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">No reminder</option>
              <option value="1">1 day before</option>
              <option value="3">3 days before</option>
              <option value="7">7 days before</option>
              <option value="14">14 days before</option>
            </select>
            <p className="text-xs text-muted-foreground">
              One email is sent to all guests who haven&apos;t declined.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : initial ? "Save changes" : "Create event"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
