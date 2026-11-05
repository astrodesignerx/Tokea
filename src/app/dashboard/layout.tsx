import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { CommandMenuProvider } from "@/components/dashboard/command-menu";
import { MobileTabbar } from "@/components/dashboard/mobile-tabbar";
import { MobileTopbar } from "@/components/dashboard/mobile-topbar";
import "@/components/dashboard/shell.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [cards, qrCodes] = await Promise.all([
    prisma.contactCard.count({
      where: { organisation: { owner_id: user.id }, status: "active" },
    }),
    prisma.qrCode.count({
      where: { owner_id: user.id, status: { not: "archived" } },
    }),
  ]);

  return (
    <CommandMenuProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-card focus:px-4 focus:py-3 focus:text-foreground focus:ring-2 focus:ring-ring">
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        <AppSidebar user={{ name: user.name, email: user.email }} counts={{ cards, qrCodes }} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopbar />
          <main id="main" tabIndex={-1} className="flex-1 pb-[calc(62px+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </div>
        <MobileTabbar email={user.email} />
      </div>
    </CommandMenuProvider>
  );
}
