import { requireUser } from "@/lib/require-user";
import { checklistCounts } from "@/lib/checklists/data";
import { ChecklistSidebar } from "@/components/checklists/checklist-sidebar";
import { LiveRefresh } from "@/components/checklists/live-refresh";
import "@/components/checklists/checklists.css";

export const metadata = { title: "Checklists" };

export default async function ChecklistsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { lists, tasks } = await checklistCounts(user.id);
  return <div className="checklists cl-shell">
    <ChecklistSidebar lists={lists} taskCount={tasks} />
    <div className="min-w-0">{children}</div>
    <LiveRefresh />
  </div>;
}
