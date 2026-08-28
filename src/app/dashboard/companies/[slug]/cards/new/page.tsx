import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { createCardAction } from "@/lib/actions/cards";
import { CardForm } from "@/components/cards/card-form";

type PageProps = { params: Promise<{ slug: string }> };

export const metadata = { title: "New card" };

export default async function NewCardPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const org = await prisma.organisation.findFirst({
    where: { slug, owner_id: user.id },
  });
  if (!org) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/dashboard/companies/${org.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {org.name}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">New card</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A page, a saveable contact and a permanent QR code are created together.
      </p>

      <CardForm
        action={createCardAction}
        organisationId={org.id}
        submitLabel="Create card"
        initial={{
          first_name: "",
          last_name: "",
          title: "",
          email: "",
          phone_mobile: "",
          phone_work: "",
          status: "active",
        }}
      />
    </div>
  );
}
