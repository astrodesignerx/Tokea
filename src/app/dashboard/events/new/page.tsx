import { requireUser } from "@/lib/require-user";
import { EventForm } from "@/components/event/event-form";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Create event</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Fill in the basics. You can add guests after you save.
      </p>
      <div className="mt-8">
        <EventForm />
      </div>
    </div>
  );
}
