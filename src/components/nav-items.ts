import type { Role } from "@prisma/client";
import {
  LayoutGrid,
  Users2,
  Layers,
  ScrollText,
  Send,
  Megaphone,
  BellRing,
  Repeat,
  SlidersHorizontal,
  Wallet,
  Percent,
  TrendingUp,
  Receipt,
  Truck,
} from "lucide-react";

export type NavGroupKey = "workspace" | "finance" | "outreach" | "system";

export const NAV_GROUPS: { key: NavGroupKey; label: string }[] = [
  { key: "workspace", label: "Workspace" },
  { key: "finance", label: "Finance" },
  { key: "outreach", label: "Outreach" },
  { key: "system", label: "System" },
];

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind gradient classes used for the 3D app-icon tile */
  gradient: string;
  roles?: Role[]; // if omitted, all roles
  group: NavGroupKey;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    gradient: "from-indigo-500 to-violet-600",
    group: "workspace",
  },
  {
    href: "/customers",
    label: "Customers",
    icon: Users2,
    gradient: "from-sky-500 to-blue-600",
    group: "workspace",
  },
  {
    href: "/products",
    label: "Products",
    icon: Layers,
    gradient: "from-emerald-500 to-teal-600",
    group: "workspace",
  },
  {
    href: "/quotations",
    label: "Quotations",
    icon: ScrollText,
    gradient: "from-amber-500 to-orange-600",
    group: "workspace",
  },
  {
    href: "/vendors",
    label: "Vendors",
    icon: Truck,
    gradient: "from-lime-500 to-green-600",
    group: "workspace",
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Wallet,
    gradient: "from-cyan-500 to-blue-600",
    roles: ["ADMIN", "ACCOUNTS"],
    group: "finance",
  },
  {
    href: "/commissions",
    label: "Commissions",
    icon: Percent,
    gradient: "from-violet-500 to-purple-600",
    roles: ["ADMIN", "ACCOUNTS"],
    group: "finance",
  },
  {
    href: "/roi",
    label: "ROI",
    icon: TrendingUp,
    gradient: "from-teal-500 to-emerald-600",
    roles: ["ADMIN", "ACCOUNTS"],
    group: "finance",
  },
  {
    href: "/payments",
    label: "Payments",
    icon: Receipt,
    gradient: "from-orange-500 to-red-600",
    roles: ["ADMIN", "ACCOUNTS"],
    group: "finance",
  },
  {
    href: "/emails",
    label: "Emails",
    icon: Send,
    gradient: "from-rose-500 to-pink-600",
    group: "outreach",
  },
  {
    href: "/emails/bulk",
    label: "Bulk Mail",
    icon: Megaphone,
    gradient: "from-pink-500 to-rose-600",
    roles: ["ADMIN", "SALES", "ACCOUNTS"],
    group: "outreach",
  },
  {
    href: "/followups",
    label: "Follow-ups",
    icon: BellRing,
    gradient: "from-fuchsia-500 to-purple-600",
    group: "outreach",
  },
  {
    href: "/followups/sequences",
    label: "AI Sequences",
    icon: Repeat,
    gradient: "from-purple-500 to-indigo-600",
    roles: ["ADMIN", "SALES", "ACCOUNTS"],
    group: "outreach",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SlidersHorizontal,
    gradient: "from-slate-500 to-slate-700",
    group: "system",
  },
];
