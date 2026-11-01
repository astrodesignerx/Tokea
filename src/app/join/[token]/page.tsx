import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { hashInviteToken } from "@/lib/checklists/rules";
import { acceptInvite, ChecklistError } from "@/lib/checklists/invites";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Join a checklist", robots: { index: false, follow: false } };

export default async function JoinPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ unavailable?: string }>;
}) {
  const { token } = await params;
  const invite = /^[A-Za-z0-9_-]{43}$/.test(token) ? await prisma.checklistInvite.findUnique({
    where: { token_hash: hashInviteToken(token) },
    select: { email: true, accepted_at: true, expires_at: true, checklist: { select: { archived_at: true } } },
  }) : null;
  const unavailable = !invite || invite.accepted_at || invite.expires_at <= new Date();
  const session = await auth();
  const returnPath = `/join/${token}`;

  async function join() {
    "use server";
    const user = await requireUser();
    let id: string;
    try {
      id = await acceptInvite(token, user);
    } catch (error) {
      if (!(error instanceof ChecklistError)) throw error;
      redirect(`${returnPath}?unavailable=1`);
    }
    revalidatePath("/dashboard/checklists", "layout");
    revalidatePath("/dashboard");
    redirect(`/dashboard/checklists/${id}`);
  }

  async function signOutForInvite() {
    "use server";
    await signOut({ redirectTo: returnPath });
  }

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-16 qr-rise">
      <div className="nf-panel space-y-5 p-6">
        <p className="nf-eyebrow">Checklists</p>
        <h1 className="font-display text-2xl">Join a list</h1>
        {unavailable ? <p>This invite is unknown, cancelled, expired or already used. Ask the owner for a new invite.</p>
          : invite.checklist.archived_at ? <p>This list is archived. Ask its owner to restore it before joining.</p>
          : !session?.user ? <>
            <p className="text-sm text-muted-foreground">Sign in with the email address your invite was sent to.</p>
            <Button asChild><Link href={`/login?next=${encodeURIComponent(returnPath)}`}>Sign in to join</Link></Button>
          </> : session.user.email?.toLowerCase() !== invite.email.toLowerCase() ? <>
            <p className="text-sm">This invite was sent to <strong>{invite.email}</strong>. Sign out, then sign in with that address.</p>
            <form action={signOutForInvite}><Button variant="outline">Sign out</Button></form>
          </> : <>
            <p className="text-sm text-muted-foreground">You will be able to add, assign and tick tasks with the other people on this list.</p>
            {(await searchParams).unavailable && <p role="alert" className="text-sm text-destructive">This invite could not be accepted. Ask the owner for a new invite.</p>}
            <form action={join}><Button>Join list</Button></form>
          </>}
      </div>
    </main>
  );
}
