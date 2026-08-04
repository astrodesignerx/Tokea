import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Tokea
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground hidden sm:inline">{user.email}</span>
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
