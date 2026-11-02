import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { CreateForm } from "@/components/forms/form-builder";

export const metadata = { title: "New form" };

export default async function NewFormPage() {
  const user = await requireUser();
  const organisations = await prisma.organisation.findMany({
    where: { owner_id: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard/forms"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-(--fast) ease-(--ease) motion-reduce:transition-none hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Forms
      </Link>
      <p className="nf-eyebrow mt-6">Forms</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">New form</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Give it a name to start. Questions come next.
      </p>

      <CreateForm organisations={organisations} />
    </div>
  );
}
