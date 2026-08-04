import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight">
          Beautiful invites.
          <br />
          Simple RSVPs.
          <br />
          QR check-in at the door.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl">
          Tokea is event software for hosts who care about the guest experience. Create a public page,
          send a single magic link per guest, and scan phones at the door.
        </p>
        <div className="mt-10 flex items-center gap-3">
          {session?.user ? (
            <Button asChild size="lg">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/signup">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">I have an account</Link>
              </Button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
