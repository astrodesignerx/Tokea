import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  IdCard,
  LayoutGrid,
  ListChecks,
  QrCode,
  type LucideIcon,
} from "lucide-react";

type ShellLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type DashboardNavItem = ShellLink & {
  group: "Share" | "Collect" | "Plan" | "Insights" | null;
  exact?: boolean;
  mobileLabel?: string;
  countKey?: "cards" | "qrCodes";
};

export const NAV_ITEMS: readonly DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid, group: null, exact: true, mobileLabel: "Home" },
  { label: "Cards", href: "/dashboard/companies", icon: IdCard, group: "Share", mobileLabel: "Cards", countKey: "cards" },
  { label: "QR codes", href: "/dashboard/qr", icon: QrCode, group: "Share", mobileLabel: "QR", countKey: "qrCodes" },
  { label: "Forms", href: "/dashboard/forms", icon: ClipboardList, group: "Collect" },
  { label: "Events", href: "/dashboard/events", icon: CalendarDays, group: "Collect", mobileLabel: "Events" },
  { label: "Checklists", href: "/dashboard/checklists", icon: ListChecks, group: "Plan" },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, group: "Insights" },
];

export const CREATE_ACTIONS: readonly ShellLink[] = [
  { label: "New QR code", href: "/dashboard/qr/new", icon: QrCode },
  { label: "New form", href: "/dashboard/forms/new", icon: ClipboardList },
  { label: "New event", href: "/dashboard/events/new", icon: CalendarDays },
  { label: "New company", href: "/dashboard/companies/new", icon: IdCard },
];

export function isNavItemActive(item: DashboardNavItem, pathname: string) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
