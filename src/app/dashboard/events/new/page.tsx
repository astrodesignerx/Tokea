import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { EventForm } from "@/components/event/event-form";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/dashboard/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-(--fast) ease-(--ease) hover:text-foreground motion-reduce:transition-none">
        <ArrowLeft className="size-4" /> Events
      </Link>
      <p className="nf-eyebrow mt-6">Invitations and RSVPs</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Create event</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Fill in the basics. You can add guests after you save.
      </p>
      <div className="mt-8">
        <EventForm />
      </div>
    </div>
  );
}
