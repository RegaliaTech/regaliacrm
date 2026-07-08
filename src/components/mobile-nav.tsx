"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { Role } from "@prisma/client";
import { NAV_GROUPS, NAV_ITEMS } from "@/components/nav-items";
import { cn } from "@/lib/utils";

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: items.filter((item) => item.group === g.key),
  })).filter((g) => g.items.length > 0);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Open navigation menu"
        className="ios-press flex h-10 w-10 items-center justify-center rounded-2xl text-gray-500 hover:bg-white/70 hover:text-slate-900 hover:shadow-[var(--shadow-sm)] md:hidden"
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-40 md:hidden" data-testid="mobile-nav-drawer">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-[var(--border)] bg-white/95 shadow-[var(--shadow-md)] backdrop-blur-2xl backdrop-saturate-150"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
              <span className="text-lg font-semibold tracking-tight text-slate-900">
                Regalia
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-4 px-3 py-4">
              {groups.map((group) => (
                <div key={group.key}>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/");
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                              : "text-slate-700 hover:bg-slate-100",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
                              item.gradient,
                            )}
                          >
                            <Icon className="h-4 w-4 text-white" />
                          </span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
