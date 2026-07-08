import { signOut } from "@/lib/auth";
import { initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut, Search } from "lucide-react";
import type { SessionUser } from "@/lib/rbac";
import { getNotifications } from "@/lib/notifications";
import { NotificationBell } from "@/components/notification-bell";
import { MobileNav } from "@/components/mobile-nav";

export async function Topbar({ user }: { user: SessionUser }) {
  const notifications = await getNotifications(user.role);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[var(--border)] bg-white/55 px-4 backdrop-blur-2xl backdrop-saturate-150 sm:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <MobileNav role={user.role} />
        <span className="text-lg font-semibold tracking-tight">Regalia</span>
      </div>

      {/* Search */}
      <div className="group relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-indigo-500" />
        <input
          type="search"
          placeholder="Search customers, quotations…"
          className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-3 text-sm shadow-[var(--shadow-sm)] outline-none backdrop-blur-xl transition-all placeholder:text-gray-400 hover:bg-white/80 focus:border-indigo-300 focus:bg-white focus:shadow-[var(--shadow-md)] focus:ring-4 focus:ring-indigo-500/10"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded-md border border-[var(--border)] bg-white/60 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 lg:inline-flex">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <NotificationBell initial={notifications} />

        <div className="mx-1.5 hidden h-7 w-px bg-[var(--border)] sm:block" />

        <button className="ios-press flex items-center gap-3 rounded-2xl py-1 pl-2 pr-1 hover:bg-white/70 hover:shadow-[var(--shadow-sm)]">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-semibold text-slate-900">
              {user.name ?? "User"}
            </div>
            <div className="text-xs capitalize text-gray-500">
              {user.role.toLowerCase()}
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-[var(--glow-primary)] ring-2 ring-white/60">
            {initials(user.name ?? user.email ?? "U")}
          </div>
        </button>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button variant="ghost" size="icon" title="Sign out" type="submit" className="rounded-2xl">
            <LogOut className="h-[18px] w-[18px]" />
          </Button>
        </form>
      </div>
    </header>
  );
}
