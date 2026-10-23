import {
  LayoutDashboard,
  QrCode,
  Store,
  Contact,
  Server,
  PackageOpen,
  Coins,
  ClipboardList,
  History,
  BarChart3,
  Users,
  ListChecks,
  ShieldAlert,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Only shown to the root Super Admin — mirrors the page's own access gate. */
  rootOnly?: boolean;
}

// Single source of truth for both the desktop sidebar and the mobile nav
// sheet — replaces the two separate (and separately role-swapped) nav
// lists that used to live in (agent)/layout.tsx and (mobile)/layout.tsx.
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scan QR", href: "/scan", icon: QrCode },
  { label: "Stores", href: "/stores", icon: Store },
  { label: "Store Owners", href: "/stores/owners", icon: Contact },
  { label: "Machines", href: "/machines", icon: Server },
  { label: "Packets", href: "/packets", icon: PackageOpen },
  { label: "Cash", href: "/cash", icon: Coins },
  { label: "Inventory Logs", href: "/inventory-logs", icon: ClipboardList },
  { label: "History", href: "/history", icon: History },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Users", href: "/users", icon: Users },
  { label: "Assignments", href: "/assignments", icon: ListChecks },
  { label: "Audit Log", href: "/audit-log", icon: ShieldAlert, rootOnly: true },
  { label: "Settings", href: "/settings", icon: Settings },
];

// Picks the longest matching href so a nested route (e.g. /stores/owners)
// activates its own item instead of also lighting up its parent (/stores).
export function getActiveNavHref(pathname: string): string | undefined {
  let best: string | undefined;
  for (const item of NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.length) best = item.href;
    }
  }
  return best;
}
