import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { signOutAction } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/marketing/wordmark";
import { DashNav } from "@/components/dashboard/dash-nav";
import { PRODUCT } from "@/lib/brand";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-col">
      {/*
        Sticky and translucent, matching the marketing header, so moving
        between the two does not feel like crossing into a different product.
      */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* min-w-0 lets the tab row shrink and scroll on phones instead of widening the page. */}
          <div className="flex h-full min-w-0 flex-1 items-center gap-4 sm:gap-7">
            <Link href="/" aria-label={PRODUCT} className="shrink-0">
              <Wordmark />
            </Link>
            <DashNav />
          </div>

          <div className="flex shrink-0 items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {user.email}
            </span>
            <ThemeToggle />
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
