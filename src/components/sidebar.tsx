"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { NAV_GROUPS, NAV_ITEMS } from "@/components/nav-items";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

type TooltipState = { label: string; top: number; left: number } | null;

/** Portaled to <body> so it escapes the scrollable nav's clip box. */
function DockTooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip || typeof document === "undefined") return null;
  return createPortal(
    <span
      className="pointer-events-none fixed z-50 whitespace-nowrap rounded-xl bg-slate-900/90 px-3 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-sm"
      style={{ top: tooltip.top, left: tooltip.left, transform: "translateY(-50%)" }}
    >
      {tooltip.label}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900/90" />
    </span>,
    document.body,
  );
}

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role),
  );
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: items.filter((item) => item.group === g.key),
  })).filter((g) => g.items.length > 0);

  const showTooltip =
    (label: string) => (e: React.MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 16 });
    };
  const hideTooltip = () => setTooltip(null);

  return (
    <aside className="relative z-30 hidden shrink-0 py-4 pl-4 md:flex">
      {/* Floating liquid-glass dock */}
      <div className="dock-shell relative flex max-h-[calc(100vh-2rem)] flex-col items-center gap-2 rounded-[28px] border border-white/50 bg-white/40 px-2.5 py-[var(--dock-pad-y)] shadow-[0_8px_40px_-4px_rgba(15,23,42,0.25)] backdrop-blur-2xl backdrop-saturate-150">
        {/* Top sheen highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-[28px] bg-gradient-to-b from-white/60 to-transparent" />
        {/* Inner ring */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/40" />

        {/* Nav — capped height with hidden-scrollbar fallback + edge fade so
            it never pushes content off-screen on short viewports. Extra
            horizontal/vertical padding keeps the active-dot and hover
            scale/lift effects from being clipped by the scroll box. */}
        <nav
          className="dock-scroll flex max-h-[calc(100vh-10rem)] flex-col items-center overflow-y-auto px-4 py-1"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent, black 10px, black calc(100% - 10px), transparent)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent, black 10px, black calc(100% - 10px), transparent)",
          }}
        >
          {groups.map((group, groupIndex) => (
            <div
              key={group.key}
              className="flex flex-col items-center gap-[var(--dock-gap)]"
            >
              {groupIndex > 0 && (
                <div
                  className="relative flex w-8 items-center justify-center py-[var(--dock-sep-pad)]"
                  onMouseEnter={showTooltip(group.label)}
                  onMouseLeave={hideTooltip}
                >
                  <span className="h-px w-8 bg-gradient-to-r from-transparent via-slate-900/15 to-transparent" />
                </div>
              )}
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    onMouseEnter={showTooltip(item.label)}
                    onMouseLeave={hideTooltip}
                    className="group/item relative flex h-[var(--dock-icon)] w-[var(--dock-icon)] shrink-0 items-center justify-center transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110"
                  >
                    {/* 3D app-icon tile */}
                    <span
                      className={cn(
                        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-[var(--dock-radius)] bg-gradient-to-br transition-shadow duration-300",
                        item.gradient,
                        active
                          ? "shadow-[0_8px_16px_-4px_rgba(15,23,42,0.45),inset_0_1px_1px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.25)] ring-2 ring-white/70"
                          : "shadow-[0_6px_12px_-3px_rgba(15,23,42,0.35),inset_0_1px_1px_rgba(255,255,255,0.55),inset_0_-2px_4px_rgba(0,0,0,0.22)] group-hover/item:shadow-[0_12px_22px_-6px_rgba(15,23,42,0.45),inset_0_1px_1px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.25)]",
                      )}
                    >
                      {/* Top gloss highlight */}
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[var(--dock-radius)] bg-gradient-to-b from-white/45 to-transparent" />
                      {/* Icon */}
                      <Icon className="relative z-10 h-[var(--dock-icon-svg)] w-[var(--dock-icon-svg)] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
                    </span>

                    {/* Active indicator dot */}
                    {active && (
                      <span className="absolute -left-[13px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-slate-700 shadow" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Divider */}
        <span className="my-1 h-px w-8 shrink-0 bg-gradient-to-r from-transparent via-slate-900/15 to-transparent" />

        {/* AI Assistant Icon — oversized tile with integrated label */}
        <button
          ref={aiButtonRef}
          type="button"
          onClick={() => setAssistantOpen((v) => !v)}
          title="AI Assistant"
          className="group/ai relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-white/50 bg-white/30 shadow-[0_6px_12px_-3px_rgba(15,23,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-110"
        >
          {/* Pulsing glow halo behind the glyph */}
          <span
            className="ai-alive-glow pointer-events-none absolute inset-0 z-0 rounded-[16px] group-hover/ai:[animation-duration:1.6s]"
            style={{
              background:
                "radial-gradient(circle at 50% 42%, rgba(139,92,246,0.65), rgba(99,102,241,0.3) 45%, transparent 70%)",
            }}
          />
          <span className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1/2 rounded-t-[16px] bg-gradient-to-b from-white/50 to-transparent" />
          <span className="pointer-events-none absolute inset-0 z-20 rounded-[16px] ring-1 ring-inset ring-white/40" />

          {/* Icon + label breathe together */}
          <span className="ai-alive-icon relative z-10 flex flex-col items-center group-hover/ai:[animation-duration:1.6s]">
            <Image
              src="/ai-assistant-icon.png"
              alt="AI Assistant"
              width={44}
              height={44}
              className="h-8 w-8 object-contain drop-shadow-[0_0_4px_rgba(139,92,246,0.55)]"
            />
            <span className="-mt-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500/80">
              AI
            </span>
          </span>

          {/* Twinkling sparkles */}
          <span
            className="ai-alive-spark pointer-events-none absolute z-20 h-1 w-1 rounded-full bg-white shadow-[0_0_6px_2px_rgba(196,181,253,0.9)]"
            style={{ top: "18%", left: "22%" }}
          />
          <span
            className="ai-alive-spark pointer-events-none absolute z-20 h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_5px_2px_rgba(196,181,253,0.9)]"
            style={{ top: "24%", right: "20%", animationDelay: "0.9s" }}
          />
          <span
            className="ai-alive-spark pointer-events-none absolute z-20 h-1 w-1 rounded-full bg-white shadow-[0_0_6px_2px_rgba(196,181,253,0.9)]"
            style={{ bottom: "28%", left: "30%", animationDelay: "1.7s" }}
          />

          {/* Tooltip */}
          <span className="pointer-events-none absolute left-full ml-4 whitespace-nowrap rounded-xl bg-slate-900/90 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl backdrop-blur-sm transition-all duration-200 group-hover/ai:opacity-100">
            AI Assistant
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900/90" />
          </span>
        </button>
      </div>

      <DockTooltip tooltip={tooltip} />
      <AssistantPanel
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        anchorRef={aiButtonRef}
      />
    </aside>
  );
}
