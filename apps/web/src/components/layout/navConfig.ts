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
  User,
  Compass,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Only shown to the root Super Admin — mirrors the page's own access gate. */
  rootOnly?: boolean;
  /** Reachable only from the Settings/"More" page grid, not the desktop sidebar. */
  moreOnly?: boolean;
}

// Single source of truth for every nav destination in the app — the
// desktop sidebar, the mobile bottom-nav's "More" grid, and the Settings
// page all read from this one list instead of each hand-rolling their own.
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Scan QR", href: "/scan", icon: QrCode },
  { label: "Stores", href: "/stores", icon: Store },
  { label: "Store Owners", href: "/stores/owners", icon: Contact },
  { label: "Machines", href: "/machines", icon: Server },
  { label: "Browse Fleet", href: "/browse", icon: Compass, moreOnly: true },
  { label: "Packets", href: "/packets", icon: PackageOpen },
  { label: "Cash", href: "/cash", icon: Coins },
  { label: "Inventory Logs", href: "/inventory-logs", icon: ClipboardList },
  { label: "History", href: "/history", icon: History },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Users", href: "/users", icon: Users },
  { label: "Assignments", href: "/assignments", icon: ListChecks },
  { label: "Audit Log", href: "/audit-log", icon: ShieldAlert, rootOnly: true },
  { label: "Profile", href: "/profile", icon: User, moreOnly: true },
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
